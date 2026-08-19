using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Sirena.Api.Data;
using Sirena.Api.Domain;

namespace Sirena.Api.Services;

public interface IOfficialCatalogSyncService
{
    Task<int> SyncAsync(CancellationToken cancellationToken);
}

public sealed partial class OfficialCatalogSyncService(AppDbContext db, IHttpClientFactory clients, ILogger<OfficialCatalogSyncService> logger) : IOfficialCatalogSyncService
{
    private static readonly string[] MakeupReferences = ["1747245", "2140832", "2007202", "1973074", "1882109"];
    private static readonly string[] AllSkinProfiles = ["seca", "grasa", "mixta", "sensible", "normal"];

    public async Task<int> SyncAsync(CancellationToken cancellationToken)
    {
        var client = clients.CreateClient("sirena-catalog");
        var official = await client.GetFromJsonAsync<List<VtexProduct>>("api/catalog_system/pub/products/search/esentis?_from=0&_to=24", cancellationToken) ?? [];
        if (official.Count != 25 || official.Any(product => !string.Equals(product.Brand, "ESENTIS", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Sirena devolvió {official.Count} productos Esentis; se esperaban exactamente 25.");

        foreach (var reference in MakeupReferences)
        {
            var matches = await client.GetFromJsonAsync<List<VtexProduct>>($"api/catalog_system/pub/products/search?fq=alternateIds_RefId:{reference}", cancellationToken) ?? [];
            if (matches.FirstOrDefault() is { } product) official.Add(product);
        }

        var externalIds = official.Select(product => long.Parse(product.ProductId)).ToHashSet();
        var existing = await db.Products.Where(product => externalIds.Contains(product.Id)).ToDictionaryAsync(product => product.Id, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        foreach (var source in official)
        {
            var id = long.Parse(source.ProductId);
            var collection = string.Equals(source.Brand, "ESENTIS", StringComparison.OrdinalIgnoreCase) ? "esentis" : "makeup";
            var price = source.Items.SelectMany(item => item.Sellers).Select(seller => seller.Offer.Price).Where(value => value is > 0).Min() ?? 0;
            if (price <= 0 || string.IsNullOrWhiteSpace(source.Link) || source.Items.SelectMany(item => item.Images).FirstOrDefault()?.ImageUrl is not { } imageUrl)
                throw new InvalidOperationException($"La ficha {source.ProductId} no tiene precio, enlace o imagen válidos.");

            var name = Clean(source.ProductName);
            var description = Clean(source.Description);
            var metadata = Classify(name, source.Categories);
            if (!existing.TryGetValue(id, out var product))
            {
                product = new Product
                {
                    Id = id,
                    Name = name,
                    Price = price,
                    ImagePath = imageUrl,
                    Role = metadata.Role,
                    Collection = collection,
                    SourceUrl = source.Link,
                    Description = description,
                    Usage = metadata.Usage,
                    SuitableFor = metadata.SuitableFor,
                    Concerns = metadata.Concerns,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                db.Products.Add(product);
            }
            else
            {
                product.Name = name;
                product.Price = price;
                product.ImagePath = imageUrl;
                product.Role = metadata.Role;
                product.Collection = collection;
                product.SourceUrl = source.Link;
                product.Description = description;
                product.Usage = metadata.Usage;
                product.SuitableFor = metadata.SuitableFor;
                product.Concerns = metadata.Concerns;
                product.IsActive = true;
                product.UpdatedAt = now;
            }
        }

        var retiredDemoProducts = await db.Products.Where(product => product.Id <= 13 && !externalIds.Contains(product.Id)).ToListAsync(cancellationToken);
        foreach (var product in retiredDemoProducts) product.IsActive = false;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Synchronized {EsentisCount} Esentis and {MakeupCount} makeup products from Sirena.do.", official.Count(product => product.Brand == "ESENTIS"), official.Count(product => product.Brand != "ESENTIS"));
        return official.Count;
    }

    private static CatalogMetadata Classify(string name, IReadOnlyList<string> categories)
    {
        var value = name.ToLowerInvariant();
        var category = string.Join(' ', categories).ToLowerInvariant();
        if (value.Contains("jabón") || value.Contains("jabon")) return new("Higiene de manos", "Aplicar sobre las manos húmedas, masajear y enjuagar. Sigue las indicaciones de la etiqueta.", AllSkinProfiles, ["limpieza", "manos", "higiene"]);
        if (value.Contains("gel de baño") || value.Contains("gel baño")) return new("Cuidado corporal", "Aplicar sobre la piel húmeda durante el baño y enjuagar. Sigue las indicaciones de la etiqueta.", AllSkinProfiles, ["limpieza corporal", "hidratación", "suavidad"]);
        if (value.Contains("shampoo")) return new("Shampoo", "Aplicar sobre el cabello húmedo, masajear y enjuagar. Sigue las indicaciones de la etiqueta.", AllSkinProfiles, ["limpieza capilar", "nutrición", "cabello seco"]);
        if (value.Contains("acondicionador")) return new("Acondicionador", "Aplicar de medios a puntas después del shampoo y enjuagar según la etiqueta.", AllSkinProfiles, ["acondicionamiento", "nutrición", "suavidad capilar"]);
        if (value.Contains("leave-in")) return new("Leave-in", "Distribuir una pequeña cantidad de medios a puntas sobre el cabello húmedo, sin enjuagar.", AllSkinProfiles, ["peinado", "nutrición capilar", "cabello seco"]);
        if (value.Contains("nutricion 4 oz") || value.Contains("nutrición 4 oz")) return new("Sérum capilar", "Aplicar una pequeña cantidad de medios a puntas siguiendo la etiqueta del producto.", AllSkinProfiles, ["reparación capilar", "nutrición", "brillo del cabello"]);
        if (value.Contains("filtro solar")) return new("Protección solar", "Aplicar uniformemente como último paso de la rutina de día y reaplicar según la etiqueta.", AllSkinProfiles, ["protección solar", "brillo", "acabado mate"]);
        if (value.Contains("toallitas") || value.Contains("micellar")) return new("Desmaquillante", "Pasar suavemente para retirar maquillaje e impurezas; evita frotar el área de los ojos.", AllSkinProfiles, ["desmaquillado", "limpieza", "impurezas"]);
        if (value.Contains("gel facial")) return new("Limpieza facial", "Usar como primer paso sobre el rostro húmedo y retirar con agua.", AllSkinProfiles, ["limpieza", "impurezas", "rutina diaria"]);
        if (value.Contains("sebo regular")) return new("Control de brillo", "Aplicar una capa ligera después de limpiar, especialmente en las zonas con brillo.", ["grasa", "mixta"], ["grasa", "brillo", "sebo", "zona t"]);
        if (value.Contains("contorno")) return new("Contorno de ojos", "Aplicar poca cantidad con toques suaves sobre el hueso orbital, sin acercarse al ojo.", value.Contains("hidratante") ? ["seca", "mixta", "sensible", "normal"] : ["seca", "mixta", "normal"], value.Contains("aclarante") ? ["ojeras", "tono desigual", "luminosidad"] : ["ojeras", "líneas finas", "fatiga"]);
        if (value.Contains("serum") || value.Contains("sérum")) return new("Sérum facial", "Aplicar pocas gotas después de limpiar y antes de la crema; de día finalizar con protector solar.", value.Contains("anti edad") ? ["seca", "mixta", "normal"] : ["seca", "grasa", "mixta", "normal"], value.Contains("aclarante") ? ["manchas", "tono desigual", "luminosidad"] : value.Contains("anti edad") ? ["líneas finas", "firmeza", "luminosidad"] : ["hidratación", "suavidad", "luminosidad"]);
        if (value.Contains("crema") && category.Contains("facial")) return new("Crema facial", "Aplicar después del sérum; durante el día finalizar con protector solar.", value.Contains("anti edad") ? ["seca", "mixta", "normal"] : AllSkinProfiles, value.Contains("aclarante") ? ["manchas", "tono desigual", "hidratación"] : value.Contains("anti edad") ? ["líneas finas", "elasticidad", "firmeza"] : ["hidratación", "barrera cutánea", "suavidad"]);
        if (value.Contains("crema") && value.Contains("corporal")) return new("Hidratación corporal", "Aplicar sobre la piel limpia y masajear hasta absorber, siguiendo la etiqueta.", AllSkinProfiles, ["hidratación corporal", "suavidad", "resequedad"]);
        if (value.Contains("base ")) return new("Base", "Probar el tono en la mandíbula y difuminar desde el centro del rostro hacia afuera.", AllSkinProfiles, ["base", "cobertura", "tono", "maquillaje"]);
        if (value.Contains("rubor")) return new("Rubor", "Aplicar poca cantidad sobre las mejillas y difuminar gradualmente.", AllSkinProfiles, ["rubor", "mejillas", "color", "maquillaje"]);
        if (value.Contains("labial")) return new("Labial", "Aplicar directamente en los labios y reaplicar según el acabado deseado.", AllSkinProfiles, ["labial", "gloss", "labios", "maquillaje"]);
        if (value.Contains("corrector")) return new("Corrector", "Aplicar pequeñas cantidades y difuminar sin arrastrar la piel.", AllSkinProfiles, ["corrector", "ojeras", "imperfecciones", "maquillaje"]);
        if (value.Contains("pre-base")) return new("Prebase", "Aplicar una capa fina después del cuidado facial y antes de la base.", AllSkinProfiles, ["prebase", "poros", "textura", "maquillaje"]);
        return new("Cuidado personal", "Usar según las indicaciones de la etiqueta del producto.", AllSkinProfiles, ["cuidado personal"]);
    }

    private static string Clean(string? value) => Whitespace().Replace(value?.Replace('\u00a0', ' ').Trim() ?? "", " ");

    private sealed record CatalogMetadata(string Role, string Usage, string[] SuitableFor, string[] Concerns);
    private sealed record VtexProduct(
        [property: JsonPropertyName("productId")] string ProductId,
        [property: JsonPropertyName("productName")] string ProductName,
        [property: JsonPropertyName("brand")] string Brand,
        [property: JsonPropertyName("link")] string Link,
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("categories")] List<string> Categories,
        [property: JsonPropertyName("items")] List<VtexItem> Items);
    private sealed record VtexItem([property: JsonPropertyName("images")] List<VtexImage> Images, [property: JsonPropertyName("sellers")] List<VtexSeller> Sellers);
    private sealed record VtexImage([property: JsonPropertyName("imageUrl")] string ImageUrl);
    private sealed record VtexSeller([property: JsonPropertyName("commertialOffer")] VtexOffer Offer);
    private sealed record VtexOffer([property: JsonPropertyName("Price")] decimal? Price);

    [GeneratedRegex("\\s+")]
    private static partial Regex Whitespace();
}
