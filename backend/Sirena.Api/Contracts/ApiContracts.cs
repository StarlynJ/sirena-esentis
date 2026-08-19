using System.Text.Json;

namespace Sirena.Api.Contracts;

public sealed record CreateChatSessionRequest(string Name, short Age);
public sealed record ChatAnswerRequest(string? SessionSlug, string Name, short Age, string SkinProfile, string Question);
public sealed record ChatAnswerResponse(string SessionSlug, string Answer, bool UsedGenerativeAi);
public sealed record SaveSkinAnalysisRequest(string? SessionSlug, short OverallScore, string SkinType, short Confidence, JsonElement Metrics, JsonElement Colorimetry);
public sealed record CreateOrderItemRequest(long ProductId, short Quantity);
public sealed record CreateOrderRequest(string CustomerName, string DeliveryMethod, string DeliveryAddress, decimal? Latitude, decimal? Longitude, IReadOnlyList<CreateOrderItemRequest> Items);
