using Microsoft.EntityFrameworkCore;
using Sirena.Api.Domain;

namespace Sirena.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<SkinAnalysis> SkinAnalyses => Set<SkinAnalysis>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products", table =>
            {
                table.HasCheckConstraint("ck_products_price", "price >= 0");
                table.HasCheckConstraint("ck_products_collection", "collection in ('esentis', 'makeup')");
            });
            entity.Property(x => x.Price).HasPrecision(10, 2);
            entity.Property(x => x.SuitableFor).HasColumnType("text[]");
            entity.Property(x => x.Concerns).HasColumnType("text[]");
            entity.HasIndex(x => x.Collection).HasDatabaseName("ix_products_collection");
            entity.HasIndex(x => x.Role).HasDatabaseName("ix_products_role");
        });

        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.ToTable("chat_sessions", table =>
            {
                table.HasCheckConstraint("ck_chat_sessions_age", "age between 13 and 99");
                table.HasCheckConstraint("ck_chat_sessions_skin_profile", "skin_profile is null or skin_profile in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
            });
            entity.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("ux_chat_sessions_slug");
            entity.HasIndex(x => x.CreatedAt).HasDatabaseName("ix_chat_sessions_created_at");
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("chat_messages", table => table.HasCheckConstraint("ck_chat_messages_role", "role in ('user', 'assistant')"));
            entity.HasIndex(x => new { x.ChatSessionId, x.CreatedAt }).HasDatabaseName("ix_chat_messages_session_created");
            entity.HasOne(x => x.ChatSession).WithMany(x => x.Messages).HasForeignKey(x => x.ChatSessionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SkinAnalysis>(entity =>
        {
            entity.ToTable("skin_analyses", table =>
            {
                table.HasCheckConstraint("ck_skin_analyses_score", "overall_score between 0 and 100 and confidence between 0 and 100");
                table.HasCheckConstraint("ck_skin_analyses_type", "skin_type in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
            });
            entity.Property(x => x.MetricsJson).HasColumnType("jsonb");
            entity.Property(x => x.ColorimetryJson).HasColumnType("jsonb");
            entity.HasIndex(x => x.ChatSessionId).HasDatabaseName("ix_skin_analyses_chat_session_id");
            entity.HasOne(x => x.ChatSession).WithMany(x => x.SkinAnalyses).HasForeignKey(x => x.ChatSessionId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders", table =>
            {
                table.HasCheckConstraint("ck_orders_amounts", "subtotal >= 0 and delivery_fee >= 0 and total >= 0");
                table.HasCheckConstraint("ck_orders_status", "status in ('pending', 'confirmed', 'cancelled')");
                table.HasCheckConstraint("ck_orders_location", "(latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)");
            });
            entity.Property(x => x.Subtotal).HasPrecision(10, 2);
            entity.Property(x => x.DeliveryFee).HasPrecision(10, 2);
            entity.Property(x => x.Total).HasPrecision(10, 2);
            entity.Property(x => x.Latitude).HasPrecision(9, 6);
            entity.Property(x => x.Longitude).HasPrecision(9, 6);
            entity.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("ix_orders_status_created_at");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items", table =>
            {
                table.HasCheckConstraint("ck_order_items_quantity", "quantity > 0");
                table.HasCheckConstraint("ck_order_items_unit_price", "unit_price >= 0");
            });
            entity.Property(x => x.UnitPrice).HasPrecision(10, 2);
            entity.HasIndex(x => x.OrderId).HasDatabaseName("ix_order_items_order_id");
            entity.HasIndex(x => x.ProductId).HasDatabaseName("ix_order_items_product_id");
            entity.HasOne(x => x.Order).WithMany(x => x.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties()) property.SetColumnName(ToSnakeCase(property.Name));
        }
    }

    private static string ToSnakeCase(string value)
    {
        var result = new System.Text.StringBuilder(value.Length + 8);
        for (var index = 0; index < value.Length; index++)
        {
            var character = value[index];
            if (char.IsUpper(character) && index > 0) result.Append('_');
            result.Append(char.ToLowerInvariant(character));
        }
        return result.ToString();
    }
}
