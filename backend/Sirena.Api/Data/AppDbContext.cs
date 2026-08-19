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
                table.HasCheckConstraint("ck_chat_sessions_skin_profile", "skin_profile in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
            });
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

        SeedProducts(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties()) property.SetColumnName(ToSnakeCase(property.Name));
        }
    }

    private static void SeedProducts(ModelBuilder modelBuilder)
    {
        var created = new DateTimeOffset(2026, 8, 19, 0, 0, 0, TimeSpan.Zero);
        modelBuilder.Entity<Product>().HasData(
            Product(1, "Gel Facial Esentis Limpiador 200 Ml", 275m, "/products/gel-facial.webp", "Limpieza", "esentis", "Gel facial de uso diario que elimina impurezas y deja la piel fresca y limpia.", "Usar como primer paso sobre el rostro húmedo y retirar con agua.", ["seca", "grasa", "mixta", "sensible", "normal"], ["limpieza", "impurezas"], "https://www.sirena.do/esentis-gel-facial-limpiador-200-ml-2123816/p"),
            Product(2, "Serum Aclarante Esentis 30 Ml", 495m, "/products/serum-aclarante.webp", "Tratamiento", "esentis", "Sérum ligero orientado a unificar el tono y reducir la apariencia de manchas visibles.", "Aplicar pocas gotas después de limpiar y antes de la crema; de día complementar con protector solar.", ["grasa", "mixta", "normal"], ["manchas", "tono desigual", "luminosidad"], "https://www.sirena.do/esentis-serum-aclarante-30-ml-2124025/p"),
            Product(3, "Leave-In Esentis Nutricion 300 Ml", 325m, "/products/leave-in.webp", "Cabello", "esentis", "Crema de peinar sin enjuague para cabello normal a seco.", "Distribuir en el cabello húmedo, de medios a puntas, sin enjuagar.", ["seca", "grasa", "mixta", "sensible", "normal"], ["cabello seco", "nutrición capilar"], "https://www.sirena.do/esentis-leave-in-nutricion-300-ml-2123807/p"),
            Product(4, "Serum Esentis Anti Edad 30 Ml", 495m, "/products/serum-antiedad.webp", "Tratamiento", "esentis", "Sérum orientado a líneas de expresión, hidratación, firmeza y luminosidad.", "Aplicar pocas gotas después de limpiar y antes de la crema.", ["seca", "normal", "mixta"], ["líneas finas", "firmeza", "luminosidad"], "https://www.sirena.do/esentis-serum-anti-edad-30-ml-2124019/p"),
            Product(5, "Contorno De Ojo Antiedad Esentis 15 Ml", 400m, "/products/contorno-antiedad.webp", "Contorno de ojos", "esentis", "Contorno ligero orientado a líneas finas, ojeras y signos de fatiga.", "Aplicar poca cantidad con toques suaves sobre el hueso orbital.", ["seca", "normal", "mixta"], ["ojeras", "líneas finas", "fatiga"], "https://www.sirena.do/esentis-contorno-de-ojo-antiedad-15-ml-2124023/p"),
            Product(6, "Crema Aclarante Esentis 50 Ml", 450m, "/products/crema-aclarante.webp", "Hidratación", "esentis", "Crema orientada a disminuir la apariencia de manchas, unificar el tono e hidratar.", "Aplicar después del sérum y terminar con protector solar durante el día.", ["seca", "normal", "mixta"], ["manchas", "hidratación", "tono desigual"], "https://www.sirena.do/esentis-crema-aclarante-50-ml-2124027/p"),
            Product(7, "Contorno De Ojo Hidratante Esentis 15 Ml", 400m, "/products/contorno-hidratante.webp", "Contorno de ojos", "esentis", "Contorno que hidrata y suaviza el área de los ojos.", "Aplicar poca cantidad con el dedo anular y toques suaves.", ["seca", "sensible", "normal", "mixta"], ["sequedad", "ojeras", "fatiga"], "https://www.sirena.do/esentis-contorno-de-ojo-hidratante-15-ml-2124035/p"),
            Product(8, "Sebo Regular Esentis 50 Ml", 575m, "/products/sebo-regular.webp", "Balance", "esentis", "Producto orientado a equilibrar el sebo y reducir brillo y sensación grasa.", "Aplicar una capa ligera después de limpiar, principalmente en zonas con brillo.", ["grasa", "mixta"], ["grasa", "brillo", "sebo", "zona t"], "https://www.sirena.do/esentis-sebo-regular-50-ml-2124039/p"),
            Product(9, "Base Facial Líquida Always Neutral", 1400m, "/products/makeup/base-almay.webp", "Base", "makeup", "Base líquida con cobertura ligera a media y acabado natural radiante.", "Probar el tono en la mandíbula y difuminar desde el centro hacia afuera.", ["seca", "grasa", "mixta", "sensible", "normal"], ["base", "cobertura", "tono"], "https://www.sirena.do/almay-clear-complexion-makeup-neutral-1747245/p"),
            Product(10, "Polvo de Rubor S.HE R.Bs998", 138m, "/products/makeup/rubor-she.webp", "Rubor", "makeup", "Rubor compacto de textura sedosa y acabado natural luminoso.", "Aplicar poca cantidad sobre las mejillas y difuminar gradualmente.", ["seca", "grasa", "mixta", "sensible", "normal"], ["rubor", "mejillas", "color"], "https://www.sirena.do/s-he-blush-powder-r-bs998-2140832/p"),
            Product(11, "Labial Wet N Wild Mega Sliks Gloss Love", 475m, "/products/makeup/labial-wetnwild.webp", "Labial", "makeup", "Brillo labial Wet N Wild de la línea MegaSlicks en tono Love.", "Aplicar directamente y reaplicar según el acabado deseado.", ["seca", "grasa", "mixta", "sensible", "normal"], ["labial", "gloss", "labios"], "https://www.sirena.do/wet-n-wild-mega-sliks-lip-gloss-love-lg-2007202/p"),
            Product(12, "Corrector Amuse Full Honey", 265.30m, "/products/makeup/corrector-amuse.webp", "Corrector", "makeup", "Corrector cremoso tono Honey para disimular visualmente ojeras e imperfecciones.", "Aplicar pequeñas cantidades y difuminar sin arrastrar la piel.", ["seca", "grasa", "mixta", "sensible", "normal"], ["corrector", "ojeras", "imperfecciones"], "https://www.sirena.do/amuse-full-concealer-honey-kl237-mix-6-1973074/p"),
            Product(13, "Pre-base Sky Smooth & Poreless", 281.25m, "/products/makeup/prebase-sky.webp", "Prebase", "makeup", "Prebase facial para preparar visualmente la superficie antes del maquillaje.", "Aplicar una capa fina después del cuidado facial y antes de la base.", ["seca", "grasa", "mixta", "sensible", "normal"], ["prebase", "poros", "textura"], "https://www.sirena.do/sky-primer-smooth-poreless-1882109/p")
        );

        Product Product(long id, string name, decimal price, string imagePath, string role, string collection, string description, string usage, string[] suitableFor, string[] concerns, string sourceUrl) => new()
        {
            Id = id, Name = name, Price = price, ImagePath = imagePath, Role = role, Collection = collection,
            Description = description, Usage = usage, SuitableFor = suitableFor, Concerns = concerns,
            SourceUrl = sourceUrl, CreatedAt = created, UpdatedAt = created
        };
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
