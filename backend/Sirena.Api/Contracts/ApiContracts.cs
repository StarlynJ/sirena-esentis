using System.Text.Json;

namespace Sirena.Api.Contracts;

public sealed record CreateChatSessionRequest(string Name, short Age, string SkinProfile);
public sealed record ChatAnswerRequest(long? SessionId, string Name, short Age, string SkinProfile, string Question);
public sealed record ChatAnswerResponse(long SessionId, string Answer, bool UsedGenerativeAi);
public sealed record SaveSkinAnalysisRequest(long? SessionId, short OverallScore, string SkinType, short Confidence, JsonElement Metrics, JsonElement Colorimetry);
public sealed record CreateOrderItemRequest(long ProductId, short Quantity);
public sealed record CreateOrderRequest(string CustomerName, string DeliveryMethod, string DeliveryAddress, decimal? Latitude, decimal? Longitude, IReadOnlyList<CreateOrderItemRequest> Items);
