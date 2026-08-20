using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Sirena.Api.Domain;

namespace Sirena.Api.Services;

public sealed record ProductChatResult(string Answer, bool UsedGenerativeAi);

public interface IProductChatService
{
    Task<ProductChatResult> AnswerAsync(string question, string skinProfile, IReadOnlyList<Product> products, IReadOnlyList<string> recentMessages, CancellationToken cancellationToken);
}

public sealed partial class ProductChatService(HttpClient httpClient, IConfiguration configuration, ILogger<ProductChatService> logger) : IProductChatService
{
    private const string OutOfScope = "Puedo ayudarte únicamente con productos, maquillaje y rutinas disponibles en este catálogo de Sirena. ¿Sobre cuál producto tienes dudas?";

    public async Task<ProductChatResult> AnswerAsync(string question, string skinProfile, IReadOnlyList<Product> products, IReadOnlyList<string> recentMessages, CancellationToken cancellationToken)
    {
        if (!DomainTerms().IsMatch(question)) return new(OutOfScope, false);

        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? configuration["Gemini:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var model = configuration["Gemini:ChatModel"] ?? "gemini-3.5-flash-lite";
                var prompt = BuildPrompt(question, skinProfile, products, recentMessages);
                var payload = new
                {
                    contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                    generationConfig = new { maxOutputTokens = 1200, responseMimeType = "text/plain", thinkingConfig = new { thinkingLevel = "minimal" } }
                };
                var answer = await GenerateAnswerAsync(model, apiKey, payload, cancellationToken);
                if (!string.IsNullOrWhiteSpace(answer)) return new(answer[..Math.Min(answer.Length, 900)], true);
            }
            catch (Exception exception) when (exception is HttpRequestException or JsonException or KeyNotFoundException)
            {
                logger.LogWarning(exception, "Gemini was unavailable; using the catalog knowledge fallback.");
            }
            catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(exception, "Gemini timed out; using the catalog knowledge fallback.");
            }
        }

        return new(Fallback(question, skinProfile, products), false);
    }

    private async Task<string?> GenerateAnswerAsync(string model, string apiKey, object payload, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 2; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent");
            request.Headers.Add("x-goog-api-key", apiKey);
            request.Headers.Add("x-goog-api-client", "sirena-esentis-prototype/1.0");
            request.Content = JsonContent.Create(payload);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode && attempt == 0 && (int)response.StatusCode is 429 or >= 500)
            {
                await Task.Delay(700, cancellationToken);
                continue;
            }
            response.EnsureSuccessStatusCode();
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            return ReadGeneratedText(json.RootElement);
        }
        return null;
    }

    private static string? ReadGeneratedText(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var candidates)) return null;
        var texts = candidates.EnumerateArray()
            .Where(candidate => candidate.TryGetProperty("content", out _))
            .SelectMany(candidate => candidate.GetProperty("content").GetProperty("parts").EnumerateArray())
            .Where(part => !part.TryGetProperty("thought", out var thought) || !thought.GetBoolean())
            .Select(part => part.TryGetProperty("text", out var text) ? text.GetString() : null)
            .Where(text => !string.IsNullOrWhiteSpace(text));
        var answer = string.Concat(texts).Trim();
        return string.IsNullOrWhiteSpace(answer) ? null : answer;
    }

    private static string BuildPrompt(string question, string profile, IReadOnlyList<Product> products, IReadOnlyList<string> recentMessages)
    {
        var knowledge = products.Select(product => new
        {
            product.Id, product.Name, product.Price, product.Role, product.Collection,
            product.Description, product.Usage, product.SuitableFor, product.Concerns, product.SourceUrl
        });
        return $$"""
        Eres la asesora virtual de productos de Sirena. Responde en español dominicano, con máximo 90 palabras.
        Devuelve texto plano, sin Markdown, asteriscos, encabezados ni tablas.
        Responde SOLO sobre los productos de BASE_DE_CONOCIMIENTO: precio mostrado, descripción, uso cosmético orientativo, rutina, comparación y compatibilidad general.
        Si el tema está fuera del catálogo responde exactamente: "{{OutOfScope}}"
        No inventes ingredientes, concentraciones, inventario, promociones, resultados clínicos ni propiedades. Si el dato no está disponible, dilo.
        No diagnostiques. Ante dolor, inflamación, lesión, sangrado o reacción persistente recomienda suspender el producto y consultar a un profesional.
        Explica antes de sugerir comprar. No presiones al pago.

        PERFIL_PROBABLE: {{profile}}
        CONVERSACION_RECIENTE: {{JsonSerializer.Serialize(recentMessages.TakeLast(4))}}
        PREGUNTA: {{question}}
        BASE_DE_CONOCIMIENTO: {{JsonSerializer.Serialize(knowledge)}}
        """;
    }

    private static string Fallback(string question, string profile, IReadOnlyList<Product> products)
    {
        var normalized = question.ToLowerInvariant();
        var asksForHair = Regex.IsMatch(normalized, "cabello|capilar|shampoo|acondicionador|leave.?in");
        var asksForBody = Regex.IsMatch(normalized, "corporal|cuerpo|baño|bano|manos");
        var asksForMakeup = Regex.IsMatch(normalized, "maquillaje|base|rubor|labial|gloss|corrector|prebase");
        var asksForFacialCare = Regex.IsMatch(normalized, "piel|rostro|facial|rutina|grasa|seca|mixta|sensible|normal|brillo|poro|mancha|ojera");
        var candidates = asksForFacialCare && !asksForHair && !asksForBody && !asksForMakeup
            ? products.Where(IsFacialCareProduct)
            : products;
        var tokens = Regex.Split(normalized, "[^a-záéíóúüñ0-9]+", RegexOptions.IgnoreCase).Where(token => token.Length > 3).ToArray();
        var matched = candidates
            .Select(product => new
            {
                Product = product,
                Score = product.Concerns.Count(concern => normalized.Contains(concern, StringComparison.OrdinalIgnoreCase))
                    + (normalized.Contains(product.Role, StringComparison.OrdinalIgnoreCase) ? 2 : 0)
                    + tokens.Count(token => product.Name.Contains(token, StringComparison.OrdinalIgnoreCase)) * 3
                    + (product.SuitableFor.Contains(profile) ? 1 : 0)
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Product.Price)
            .Take(3)
            .Select(item => item.Product)
            .ToList();

        if (normalized.Contains("ingrediente") || normalized.Contains("composición"))
            return "La ficha cargada no detalla la lista completa de ingredientes. Para no inventarte información, revisa la etiqueta o la ficha vigente en Sirena.do. Sí puedo explicarte la función y el uso disponible del producto.";
        if (normalized.Contains("disponib") || normalized.Contains("inventario") || normalized.Contains("existencia"))
            return "No puedo confirmar inventario por tienda en tiempo real. Verifica la dirección y la ficha vigente en Sirena.do. Sí puedo ayudarte a comparar el producto o incorporarlo a tu rutina.";
        if (normalized.Contains("precio") || normalized.Contains("cuesta"))
            return string.Join(" ", matched.Select(product => $"{product.Name}: RD${product.Price:N2}.")) + " Los precios pueden cambiar en Sirena.do.";
        if (normalized.Contains("orden") || normalized.Contains("rutina") || normalized.Contains("primero"))
            return "Orden orientativo: limpiador, sérum según el objetivo, contorno de ojos, crema y protector solar durante el día. Introduce un producto nuevo a la vez y haz prueba de parche.";

        var best = matched.FirstOrDefault();
        return best is null
            ? $"Puedo orientarte sobre los productos disponibles para piel {profile}. Pregúntame por precio, función, uso o diferencias."
            : $"{best.Name} podría encajar porque {char.ToLowerInvariant(best.Description[0])}{best.Description[1..]} {best.Usage} Haz prueba de parche antes de incorporarlo.";
    }

    private static bool IsFacialCareProduct(Product product) => product.Collection == "esentis" && product.Role is
        "Desmaquillante" or "Limpieza facial" or "Control de brillo" or "Contorno de ojos" or "Sérum facial" or "Crema facial" or "Protección solar";

    [GeneratedRegex("producto|sirena|esentis|piel|rutina|limpi|serum|sérum|crema|contorno|sebo|brillo|grasa|seca|mixta|sensible|normal|mancha|tono|ojera|poro|base|rubor|labial|gloss|corrector|prebase|maquillaje|cabello|leave|precio|cuesta|usar|aplicar|orden|combinar|recomienda|conviene|diferencia|ingrediente|disponib|comprar|carrito|protector|hidrata", RegexOptions.IgnoreCase)]
    private static partial Regex DomainTerms();
}
