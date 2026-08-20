using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Sirena.Api.Services;

public sealed record VisionMetric(short Score, bool CannotAssess, string Observation, string Tip);
public sealed record VisionQuality(bool Usable, double Confidence, IReadOnlyList<string> Issues);
public sealed record VisionSkinProfile(string ProbableType, double Confidence, string Rationale);
public sealed record VisionColorimetry(string Undertone, string Season, double Confidence, bool CannotAssess, IReadOnlyList<string> PaletteHex);
public sealed record VisionSkinAnalysis(
    VisionQuality Quality,
    VisionSkinProfile SkinProfile,
    short OverallScore,
    IReadOnlyDictionary<string, VisionMetric> Metrics,
    VisionColorimetry Colorimetry,
    IReadOnlyList<string> RoutineCategories,
    string SafetyNote);

public interface ISkinVisionService
{
    Task<VisionSkinAnalysis> AnalyzeAsync(string imageBase64, string mimeType, CancellationToken cancellationToken);
}

public sealed class GeminiSkinVisionService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiSkinVisionService> logger) : ISkinVisionService
{
    private static readonly HashSet<string> ValidProfiles = ["seca", "grasa", "mixta", "sensible", "normal"];
    private static readonly string[] RequiredMetrics = ["uniformity", "texture", "shine", "visibleRedness", "visibleBlemishes", "poreAppearance", "underEyeDarkness", "hydrationAppearance"];
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string SystemPrompt = """
    Eres un sistema de orientación cosmética visual de Sirena. Analiza solamente la fotografía adjunta y devuelve exclusivamente JSON válido.

    LÍMITES OBLIGATORIOS:
    - No identifiques a la persona ni infieras identidad, edad, sexo, género, raza, etnia, salud, emociones, embarazo o atributos sensibles.
    - No diagnostiques enfermedades ni afirmes detectar acné clínico, rosácea, dermatitis, infecciones, lesiones o cáncer. Habla únicamente de apariencia cosmética visible.
    - La foto puede estar afectada por luz, cámara, maquillaje, filtros y compresión. Si no puedes evaluar algo, usa cannot_assess=true, baja confidence y no inventes.
    - Una puntuación alta significa apariencia visual favorable en esa foto; una baja significa un aspecto cosmético que podría cuidarse, nunca una enfermedad.
    - Si se observan señales que podrían requerir atención o la persona reporta dolor, inflamación, sangrado o cambios persistentes, la única recomendación es consultar dermatología.
    - No recomiendes medicamentos, tratamientos médicos, procedimientos invasivos ni prometas resultados.

    PROCESO:
    1. Verifica que haya exactamente un rostro frontal suficientemente enfocado, iluminado y visible. Si no, quality.usable=false y explica los problemas.
    2. Evalúa de 0 a 100: uniformidad visual, textura aparente, control de brillo, ausencia de rojeces visibles, ausencia de imperfecciones visibles, apariencia de poros, zona bajo los ojos y apariencia de hidratación.
    3. Estima con incertidumbre el tipo probable: seca, grasa, mixta, sensible o normal.
    4. Estima subtono cálido, frío o neutro y una estación de color solo si la luz parece neutra; de lo contrario marca cannot_assess.
    5. Da observaciones breves y consejos cosméticos prudentes. No inventes ingredientes ni productos.

    ESQUEMA EXACTO:
    {
      "quality":{"usable":true,"confidence":0.0,"issues":[]},
      "skinProfile":{"probableType":"mixta","confidence":0.0,"rationale":""},
      "overallScore":0,
      "metrics":{
        "uniformity":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "texture":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "shine":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "visibleRedness":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "visibleBlemishes":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "poreAppearance":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "underEyeDarkness":{"score":0,"cannotAssess":false,"observation":"","tip":""},
        "hydrationAppearance":{"score":0,"cannotAssess":false,"observation":"","tip":""}
      },
      "colorimetry":{"undertone":"neutro","season":"Neutra versátil","confidence":0.0,"cannotAssess":false,"paletteHex":["#D9A18D","#BD7E75","#A87E69","#8C6B73","#D7B17A"]},
      "routineCategories":[],
      "safetyNote":"Orientación cosmética generada por IA; no sustituye una evaluación dermatológica."
    }
    """;

    public async Task<VisionSkinAnalysis> AnalyzeAsync(string imageBase64, string mimeType, CancellationToken cancellationToken)
    {
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) throw new InvalidOperationException("El análisis visual con IA no está configurado.");

        var model = configuration["Gemini:Model"] ?? "gemini-3.6-flash";
        var payload = new
        {
            system_instruction = new { parts = new[] { new { text = SystemPrompt } } },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new object[]
                    {
                        new { text = "Analiza esta fotografía siguiendo estrictamente el esquema y los límites de seguridad." },
                        new { inline_data = new { mime_type = mimeType, data = imageBase64 } }
                    }
                }
            },
            generationConfig = new { responseMimeType = "application/json", maxOutputTokens = 2600, thinkingConfig = new { thinkingLevel = "low" } }
        };

        using var response = await SendWithRetryAsync(model, apiKey, payload, cancellationToken);

        using var root = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var text = string.Concat(root.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts").EnumerateArray()
            .Where(part => (!part.TryGetProperty("thought", out var thought) || !thought.GetBoolean()) && part.TryGetProperty("text", out _))
            .Select(part => part.GetProperty("text").GetString()));
        if (string.IsNullOrWhiteSpace(text)) throw new JsonException("Gemini no devolvió un informe visual.");
        text = text.Trim().Replace("```json", "", StringComparison.OrdinalIgnoreCase).Replace("```", "", StringComparison.Ordinal).Trim();
        try
        {
            var raw = JsonSerializer.Deserialize<AiVisionResponse>(text, JsonOptions) ?? throw new JsonException("El informe visual no es válido.");
            return Validate(raw);
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "Gemini returned an invalid structured skin report.");
            throw;
        }
    }

    private async Task<HttpResponseMessage> SendWithRetryAsync(string model, string apiKey, object payload, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 2; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent");
            request.Headers.Add("x-goog-api-key", apiKey);
            request.Headers.Add("x-goog-api-client", "sirena-esentis-vision/1.0");
            request.Content = JsonContent.Create(payload);
            var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode) return response;
            if (attempt == 0 && (int)response.StatusCode is 429 or >= 500)
            {
                response.Dispose();
                await Task.Delay(700, cancellationToken);
                continue;
            }
            logger.LogWarning("Gemini vision returned status {StatusCode}.", response.StatusCode);
            var statusCode = response.StatusCode;
            response.Dispose();
            throw new HttpRequestException("El proveedor de IA no pudo analizar la fotografía.", null, statusCode);
        }
        throw new HttpRequestException("El proveedor de IA no pudo analizar la fotografía.");
    }

    private static VisionSkinAnalysis Validate(AiVisionResponse raw)
    {
        if (raw.Quality is null || raw.SkinProfile is null || raw.Metrics is null || raw.Colorimetry is null)
            throw new JsonException("El informe visual está incompleto.");
        var profile = raw.SkinProfile.ProbableType?.Trim().ToLowerInvariant() ?? "";
        if (!ValidProfiles.Contains(profile)) throw new JsonException("El tipo de piel devuelto no es válido.");
        var metrics = new Dictionary<string, VisionMetric>();
        foreach (var key in RequiredMetrics)
        {
            if (!raw.Metrics.TryGetValue(key, out var metric) || metric is null) throw new JsonException($"Falta la métrica {key}.");
            metrics[key] = new((short)Math.Clamp(metric.Score, 0, 100), metric.CannotAssess, Safe(metric.Observation), Safe(metric.Tip));
        }
        var palette = (raw.Colorimetry.PaletteHex ?? []).Where(value => System.Text.RegularExpressions.Regex.IsMatch(value ?? "", "^#[0-9a-fA-F]{6}$")).Take(6).ToArray();
        if (palette.Length < 3) palette = ["#D9A18D", "#BD7E75", "#A87E69", "#8C6B73", "#D7B17A"];
        return new(
            new(raw.Quality.Usable, ClampConfidence(raw.Quality.Confidence), (raw.Quality.Issues ?? []).Select(Safe).Where(x => x.Length > 0).Take(5).ToArray()),
            new(profile, ClampConfidence(raw.SkinProfile.Confidence), Safe(raw.SkinProfile.Rationale)),
            (short)Math.Clamp(raw.OverallScore, 0, 100),
            metrics,
            new(Safe(raw.Colorimetry.Undertone).ToLowerInvariant(), Safe(raw.Colorimetry.Season), ClampConfidence(raw.Colorimetry.Confidence), raw.Colorimetry.CannotAssess, palette),
            (raw.RoutineCategories ?? []).Select(Safe).Where(x => x.Length > 0).Take(8).ToArray(),
            string.IsNullOrWhiteSpace(raw.SafetyNote) ? "Orientación cosmética generada por IA; no sustituye una evaluación dermatológica." : Safe(raw.SafetyNote));
    }

    private static double ClampConfidence(double value) => Math.Round(Math.Clamp(value, 0, 1), 2);
    private static string Safe(string? value) => (value ?? "").Trim()[..Math.Min((value ?? "").Trim().Length, 420)];

    private sealed class AiVisionResponse
    {
        public AiQuality? Quality { get; set; }
        public AiSkinProfile? SkinProfile { get; set; }
        public int OverallScore { get; set; }
        public Dictionary<string, AiMetric?>? Metrics { get; set; }
        public AiColorimetry? Colorimetry { get; set; }
        public string[]? RoutineCategories { get; set; }
        public string? SafetyNote { get; set; }
    }
    private sealed class AiQuality { public bool Usable { get; set; } public double Confidence { get; set; } public string[]? Issues { get; set; } }
    private sealed class AiSkinProfile { public string? ProbableType { get; set; } public double Confidence { get; set; } public string? Rationale { get; set; } }
    private sealed class AiMetric { public int Score { get; set; } public bool CannotAssess { get; set; } public string? Observation { get; set; } public string? Tip { get; set; } }
    private sealed class AiColorimetry { public string? Undertone { get; set; } public string? Season { get; set; } public double Confidence { get; set; } public bool CannotAssess { get; set; } public string[]? PaletteHex { get; set; } }
}
