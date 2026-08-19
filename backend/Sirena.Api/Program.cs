using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Sirena.Api.Contracts;
using Sirena.Api.Data;
using Sirena.Api.Domain;
using Sirena.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("DATABASE_URL or ConnectionStrings:Default is required.");

builder.Services.AddDbContextPool<AppDbContext>(options => options.UseNpgsql(connectionString, postgres =>
{
    postgres.EnableRetryOnFailure(5, TimeSpan.FromSeconds(4), null);
    postgres.CommandTimeout(15);
}));
builder.Services.AddHttpClient<IProductChatService, ProductChatService>(client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(25);
});
builder.Services.AddHttpClient("google-maps", client =>
{
    client.BaseAddress = new Uri("https://places.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddRateLimiter(options => options.AddFixedWindowLimiter("api", limiter =>
{
    limiter.PermitLimit = 60;
    limiter.Window = TimeSpan.FromMinutes(1);
    limiter.QueueLimit = 0;
    limiter.AutoReplenishment = true;
}));

var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("frontend");
app.UseRateLimiter();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

var api = app.MapGroup("/api").RequireRateLimiting("api");

api.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
{
    var databaseReady = await db.Database.CanConnectAsync(cancellationToken);
    return Results.Ok(new { status = databaseReady ? "healthy" : "degraded", database = databaseReady ? "connected" : "unavailable", utc = DateTimeOffset.UtcNow });
});

api.MapGet("/products", async (string? collection, AppDbContext db, CancellationToken cancellationToken) =>
{
    var query = db.Products.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(collection)) query = query.Where(product => product.Collection == collection.ToLower());
    return Results.Ok(await query.OrderBy(product => product.Id).ToListAsync(cancellationToken));
});

api.MapGet("/products/{id:long}", async (long id, AppDbContext db, CancellationToken cancellationToken) =>
    await db.Products.AsNoTracking().SingleOrDefaultAsync(product => product.Id == id, cancellationToken) is { } product
        ? Results.Ok(product)
        : Results.NotFound());

api.MapPost("/chat/sessions", async (CreateChatSessionRequest request, AppDbContext db, CancellationToken cancellationToken) =>
{
    if (!ValidProfile(request.SkinProfile) || request.Age is < 13 or > 99 || string.IsNullOrWhiteSpace(request.Name))
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["session"] = ["Nombre, edad de 13–99 y perfil válido son obligatorios."] });
    var session = new ChatSession { Name = request.Name.Trim()[..Math.Min(request.Name.Trim().Length, 80)], Age = request.Age, SkinProfile = request.SkinProfile.ToLower(), CreatedAt = DateTimeOffset.UtcNow };
    db.ChatSessions.Add(session);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/chat/sessions/{session.Id}", new { session.Id, session.Name, session.Age, session.SkinProfile });
});

api.MapGet("/chat/sessions/{id:long}/messages", async (long id, AppDbContext db, CancellationToken cancellationToken) =>
    Results.Ok(await db.ChatMessages.AsNoTracking().Where(message => message.ChatSessionId == id).OrderBy(message => message.CreatedAt).Select(message => new { message.Id, message.Role, message.Content, message.CreatedAt }).ToListAsync(cancellationToken)));

api.MapPost("/chat/answer", async (ChatAnswerRequest request, AppDbContext db, IProductChatService chat, CancellationToken cancellationToken) =>
{
    if (!ValidProfile(request.SkinProfile) || string.IsNullOrWhiteSpace(request.Question) || request.Question.Length > 800)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["question"] = ["Perfil válido y pregunta de hasta 800 caracteres son obligatorios."] });

    ChatSession? session = request.SessionId is null ? null : await db.ChatSessions.SingleOrDefaultAsync(item => item.Id == request.SessionId, cancellationToken);
    if (session is null)
    {
        var safeAge = request.Age is >= 13 and <= 99 ? request.Age : (short)18;
        var safeName = string.IsNullOrWhiteSpace(request.Name) ? "Visitante" : request.Name.Trim()[..Math.Min(request.Name.Trim().Length, 80)];
        session = new ChatSession { Name = safeName, Age = safeAge, SkinProfile = request.SkinProfile.ToLower(), CreatedAt = DateTimeOffset.UtcNow };
        db.ChatSessions.Add(session);
        await db.SaveChangesAsync(cancellationToken);
    }

    var recent = await db.ChatMessages.AsNoTracking().Where(message => message.ChatSessionId == session.Id).OrderByDescending(message => message.CreatedAt).Take(4).OrderBy(message => message.CreatedAt).Select(message => message.Content).ToListAsync(cancellationToken);
    var products = await db.Products.AsNoTracking().OrderBy(product => product.Id).ToListAsync(cancellationToken);
    var userMessage = new ChatMessage { ChatSessionId = session.Id, Role = "user", Content = request.Question.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    var result = await chat.AnswerAsync(request.Question.Trim(), request.SkinProfile.ToLower(), products, recent, cancellationToken);
    var assistantMessage = new ChatMessage { ChatSessionId = session.Id, Role = "assistant", Content = result.Answer, CreatedAt = DateTimeOffset.UtcNow.AddTicks(1) };
    db.ChatMessages.AddRange(userMessage, assistantMessage);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(new ChatAnswerResponse(session.Id, result.Answer, result.UsedGenerativeAi));
});

api.MapPost("/skin-analyses", async (SaveSkinAnalysisRequest request, AppDbContext db, CancellationToken cancellationToken) =>
{
    if (!ValidProfile(request.SkinType) || request.OverallScore is < 0 or > 100 || request.Confidence is < 0 or > 100)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["analysis"] = ["Puntuaciones de 0–100 y tipo de piel válido son obligatorios."] });
    if (request.SessionId is not null && !await db.ChatSessions.AnyAsync(session => session.Id == request.SessionId, cancellationToken)) return Results.NotFound();
    var analysis = new SkinAnalysis { ChatSessionId = request.SessionId, OverallScore = request.OverallScore, SkinType = request.SkinType.ToLower(), Confidence = request.Confidence, MetricsJson = request.Metrics.GetRawText(), ColorimetryJson = request.Colorimetry.GetRawText(), CreatedAt = DateTimeOffset.UtcNow };
    db.SkinAnalyses.Add(analysis);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/skin-analyses/{analysis.Id}", new { analysis.Id });
});

api.MapPost("/orders", async (CreateOrderRequest request, AppDbContext db, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.CustomerName) || string.IsNullOrWhiteSpace(request.DeliveryAddress) || request.DeliveryMethod is not ("delivery" or "pickup") || request.Items.Count is 0 or > 50 || request.Items.Any(item => item.Quantity is < 1 or > 20))
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["order"] = ["Cliente, dirección y productos válidos son obligatorios."] });
    var ids = request.Items.Select(item => item.ProductId).Distinct().ToArray();
    var products = await db.Products.Where(product => ids.Contains(product.Id)).ToDictionaryAsync(product => product.Id, cancellationToken);
    if (products.Count != ids.Length) return Results.ValidationProblem(new Dictionary<string, string[]> { ["items"] = ["Uno o más productos no existen."] });
    var order = new Order { CustomerName = request.CustomerName.Trim(), DeliveryAddress = request.DeliveryAddress.Trim(), Latitude = request.Latitude, Longitude = request.Longitude, Status = "pending", CreatedAt = DateTimeOffset.UtcNow };
    foreach (var item in request.Items)
    {
        var product = products[item.ProductId];
        order.Items.Add(new OrderItem { ProductId = product.Id, Quantity = item.Quantity, UnitPrice = product.Price });
    }
    order.Subtotal = order.Items.Sum(item => item.UnitPrice * item.Quantity);
    order.DeliveryFee = request.DeliveryMethod == "delivery" ? 175m : 0m;
    order.Total = order.Subtotal + order.DeliveryFee;
    db.Orders.Add(order);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/orders/{order.Id}", new { order.Id, order.Status, order.Subtotal, order.DeliveryFee, order.Total });
});

api.MapGet("/maps/autocomplete", async (string input, IConfiguration configuration, IHttpClientFactory httpClientFactory, CancellationToken cancellationToken) =>
{
    var key = Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY") ?? configuration["GoogleMaps:ApiKey"];
    if (string.IsNullOrWhiteSpace(key)) return Results.Problem("Google Maps no está configurado.", statusCode: StatusCodes.Status503ServiceUnavailable);
    if (string.IsNullOrWhiteSpace(input) || input.Trim().Length < 3 || input.Length > 160) return Results.Ok(Array.Empty<object>());
    using var request = new HttpRequestMessage(HttpMethod.Post, "v1/places:autocomplete");
    request.Headers.Add("X-Goog-Api-Key", key);
    request.Headers.Add("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.text");
    request.Content = JsonContent.Create(new { input = input.Trim(), includedRegionCodes = new[] { "do" }, languageCode = "es" });
    using var response = await httpClientFactory.CreateClient("google-maps").SendAsync(request, cancellationToken);
    if (!response.IsSuccessStatusCode) return Results.Problem("No fue posible consultar direcciones en este momento.", statusCode: StatusCodes.Status502BadGateway);
    using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
    var suggestions = json.RootElement.TryGetProperty("suggestions", out var entries)
        ? entries.EnumerateArray().Where(entry => entry.TryGetProperty("placePrediction", out _)).Select(entry =>
        {
            var prediction = entry.GetProperty("placePrediction");
            return new
            {
                placeId = prediction.GetProperty("placeId").GetString(),
                label = prediction.GetProperty("text").GetProperty("text").GetString()
            };
        }).Where(item => !string.IsNullOrWhiteSpace(item.label)).Take(5).ToArray()
        : [];
    return Results.Ok(suggestions);
});

app.Run();

static bool ValidProfile(string value) => value.ToLowerInvariant() is "seca" or "grasa" or "mixta" or "sensible" or "normal";

public partial class Program { }
