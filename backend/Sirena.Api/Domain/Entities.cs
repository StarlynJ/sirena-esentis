using System.ComponentModel.DataAnnotations;

namespace Sirena.Api.Domain;

public sealed class Product
{
    public long Id { get; set; }
    [MaxLength(180)] public required string Name { get; set; }
    public decimal Price { get; set; }
    [MaxLength(240)] public required string ImagePath { get; set; }
    [MaxLength(60)] public required string Role { get; set; }
    [MaxLength(24)] public required string Collection { get; set; }
    public bool IsActive { get; set; } = true;
    [MaxLength(500)] public string? SourceUrl { get; set; }
    public required string Description { get; set; }
    public required string Usage { get; set; }
    public string[] SuitableFor { get; set; } = [];
    public string[] Concerns { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class ChatSession
{
    public long Id { get; set; }
    [MaxLength(40)] public required string Slug { get; set; }
    [MaxLength(80)] public required string Name { get; set; }
    public short Age { get; set; }
    [MaxLength(24)] public string? SkinProfile { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<ChatMessage> Messages { get; set; } = [];
    public ICollection<SkinAnalysis> SkinAnalyses { get; set; } = [];
}

public sealed class ChatMessage
{
    public long Id { get; set; }
    public long ChatSessionId { get; set; }
    public ChatSession ChatSession { get; set; } = null!;
    [MaxLength(16)] public required string Role { get; set; }
    [MaxLength(2000)] public required string Content { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class SkinAnalysis
{
    public long Id { get; set; }
    public long? ChatSessionId { get; set; }
    public ChatSession? ChatSession { get; set; }
    public short OverallScore { get; set; }
    [MaxLength(24)] public required string SkinType { get; set; }
    public short Confidence { get; set; }
    public required string MetricsJson { get; set; }
    public required string ColorimetryJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Order
{
    public long Id { get; set; }
    [MaxLength(100)] public required string CustomerName { get; set; }
    [MaxLength(300)] public required string DeliveryAddress { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    [MaxLength(24)] public required string Status { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = [];
}

public sealed class OrderItem
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public short Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
