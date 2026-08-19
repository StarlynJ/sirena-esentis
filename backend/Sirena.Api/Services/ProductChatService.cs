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
                var model = configuration["Gemini:Model"] ?? "gemini-3.6-flash";
                var prompt = BuildPrompt(question, skinProfile, products, recentMessages);
                using var request = new HttpRequestMessage(HttpMethod.Post, "v1beta/interactions");
                request.Headers.Add("x-goog-api-key", apiKey);
                request.Headers.Add("x-goog-api-client", "sirena-esentis-prototype/1.0");
                request.Content = JsonContent.Create(new { model, input = prompt, store = false });
                using var response = await httpClient.SendAsync(request, cancellationToken);
                response.EnsureSuccessStatusCode();
                using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var answer = ReadInteractionText(json.RootElement);
                if (!string.IsNullOrWhiteSpace(answer)) return new(answer[..Math.Min(answer.Length, 900)], true);
            }
            catch (Exception exception) when (exception is HttpRequestException or JsonException or KeyNotFoundException)
            {
                logger.LogWarning(exception, "Gemini was unavailable; using the catalog knowledge fallback.");
            }
        }

        return new(Fallback(question, skinProfile, products), false);
    }

    private static string? ReadInteractionText(JsonElement root)
    {
        if (!root.TryGetProperty("steps", out var steps)) return null;

        return steps.EnumerateArray()
            .Where(step => step.TryGetProperty("type", out var type) && type.GetString() == "model_output")
            .Where(step => step.TryGetProperty("content", out _))
            .SelectMany(step => step.GetProperty("content").EnumerateArray())
            .Where(content => content.TryGetProperty("type", out var type) && type.GetString() == "text")
            .Select(content => content.TryGetProperty("text", out var text) ? text.GetString() : null)
            .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text))
            ?.Trim();
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
        var matched = products
            .Select(product => new
            {
                Product = product,
                Score = product.Concerns.Count(concern => normalized.Contains(concern, StringComparison.OrdinalIgnoreCase))
                    + (normalized.Contains(product.Role, StringComparison.OrdinalIgnoreCase) ? 2 : 0)
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

    [GeneratedRegex("producto|sirena|esentis|piel|rutina|limpi|serum|sérum|crema|contorno|sebo|brillo|grasa|seca|mixta|sensible|normal|mancha|tono|ojera|poro|base|rubor|labial|gloss|corrector|prebase|maquillaje|cabello|leave|precio|cuesta|usar|aplicar|orden|combinar|recomienda|conviene|diferencia|ingrediente|disponib|comprar|carrito|protector|hidrata", RegexOptions.IgnoreCase)]
    private static partial Regex DomainTerms();
}
