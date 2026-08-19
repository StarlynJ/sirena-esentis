using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Sirena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    age = table.Column<short>(type: "smallint", nullable: false),
                    skin_profile = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_sessions", x => x.id);
                    table.CheckConstraint("ck_chat_sessions_age", "age between 13 and 99");
                    table.CheckConstraint("ck_chat_sessions_skin_profile", "skin_profile in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    delivery_address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    latitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    longitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    delivery_fee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orders", x => x.id);
                    table.CheckConstraint("ck_orders_amounts", "subtotal >= 0 and delivery_fee >= 0 and total >= 0");
                    table.CheckConstraint("ck_orders_location", "(latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)");
                    table.CheckConstraint("ck_orders_status", "status in ('pending', 'confirmed', 'cancelled')");
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    image_path = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    role = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    collection = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    source_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "text", nullable: false),
                    usage = table.Column<string>(type: "text", nullable: false),
                    suitable_for = table.Column<string[]>(type: "text[]", nullable: false),
                    concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                    table.CheckConstraint("ck_products_collection", "collection in ('esentis', 'makeup')");
                    table.CheckConstraint("ck_products_price", "price >= 0");
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    chat_session_id = table.Column<long>(type: "bigint", nullable: false),
                    role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.id);
                    table.CheckConstraint("ck_chat_messages_role", "role in ('user', 'assistant')");
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_sessions_chat_session_id",
                        column: x => x.chat_session_id,
                        principalTable: "chat_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "skin_analyses",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    chat_session_id = table.Column<long>(type: "bigint", nullable: true),
                    overall_score = table.Column<short>(type: "smallint", nullable: false),
                    skin_type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    confidence = table.Column<short>(type: "smallint", nullable: false),
                    metrics_json = table.Column<string>(type: "jsonb", nullable: false),
                    colorimetry_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skin_analyses", x => x.id);
                    table.CheckConstraint("ck_skin_analyses_score", "overall_score between 0 and 100 and confidence between 0 and 100");
                    table.CheckConstraint("ck_skin_analyses_type", "skin_type in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
                    table.ForeignKey(
                        name: "FK_skin_analyses_chat_sessions_chat_session_id",
                        column: x => x.chat_session_id,
                        principalTable: "chat_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_id = table.Column<long>(type: "bigint", nullable: false),
                    product_id = table.Column<long>(type: "bigint", nullable: false),
                    quantity = table.Column<short>(type: "smallint", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_items", x => x.id);
                    table.CheckConstraint("ck_order_items_quantity", "quantity > 0");
                    table.CheckConstraint("ck_order_items_unit_price", "unit_price >= 0");
                    table.ForeignKey(
                        name: "FK_order_items_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_order_items_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "products",
                columns: new[] { "id", "collection", "concerns", "created_at", "description", "image_path", "name", "price", "role", "source_url", "suitable_for", "updated_at", "usage" },
                values: new object[,]
                {
                    { 1L, "esentis", new[] { "limpieza", "impurezas" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Gel facial de uso diario que elimina impurezas y deja la piel fresca y limpia.", "/products/gel-facial.webp", "Gel Facial Esentis Limpiador 200 Ml", 275m, "Limpieza", "https://www.sirena.do/esentis-gel-facial-limpiador-200-ml-2123816/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Usar como primer paso sobre el rostro húmedo y retirar con agua." },
                    { 2L, "esentis", new[] { "manchas", "tono desigual", "luminosidad" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Sérum ligero orientado a unificar el tono y reducir la apariencia de manchas visibles.", "/products/serum-aclarante.webp", "Serum Aclarante Esentis 30 Ml", 495m, "Tratamiento", "https://www.sirena.do/esentis-serum-aclarante-30-ml-2124025/p", new[] { "grasa", "mixta", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar pocas gotas después de limpiar y antes de la crema; de día complementar con protector solar." },
                    { 3L, "esentis", new[] { "cabello seco", "nutrición capilar" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Crema de peinar sin enjuague para cabello normal a seco.", "/products/leave-in.webp", "Leave-In Esentis Nutricion 300 Ml", 325m, "Cabello", "https://www.sirena.do/esentis-leave-in-nutricion-300-ml-2123807/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Distribuir en el cabello húmedo, de medios a puntas, sin enjuagar." },
                    { 4L, "esentis", new[] { "líneas finas", "firmeza", "luminosidad" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Sérum orientado a líneas de expresión, hidratación, firmeza y luminosidad.", "/products/serum-antiedad.webp", "Serum Esentis Anti Edad 30 Ml", 495m, "Tratamiento", "https://www.sirena.do/esentis-serum-anti-edad-30-ml-2124019/p", new[] { "seca", "normal", "mixta" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar pocas gotas después de limpiar y antes de la crema." },
                    { 5L, "esentis", new[] { "ojeras", "líneas finas", "fatiga" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Contorno ligero orientado a líneas finas, ojeras y signos de fatiga.", "/products/contorno-antiedad.webp", "Contorno De Ojo Antiedad Esentis 15 Ml", 400m, "Contorno de ojos", "https://www.sirena.do/esentis-contorno-de-ojo-antiedad-15-ml-2124023/p", new[] { "seca", "normal", "mixta" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar poca cantidad con toques suaves sobre el hueso orbital." },
                    { 6L, "esentis", new[] { "manchas", "hidratación", "tono desigual" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Crema orientada a disminuir la apariencia de manchas, unificar el tono e hidratar.", "/products/crema-aclarante.webp", "Crema Aclarante Esentis 50 Ml", 450m, "Hidratación", "https://www.sirena.do/esentis-crema-aclarante-50-ml-2124027/p", new[] { "seca", "normal", "mixta" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar después del sérum y terminar con protector solar durante el día." },
                    { 7L, "esentis", new[] { "sequedad", "ojeras", "fatiga" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Contorno que hidrata y suaviza el área de los ojos.", "/products/contorno-hidratante.webp", "Contorno De Ojo Hidratante Esentis 15 Ml", 400m, "Contorno de ojos", "https://www.sirena.do/esentis-contorno-de-ojo-hidratante-15-ml-2124035/p", new[] { "seca", "sensible", "normal", "mixta" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar poca cantidad con el dedo anular y toques suaves." },
                    { 8L, "esentis", new[] { "grasa", "brillo", "sebo", "zona t" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Producto orientado a equilibrar el sebo y reducir brillo y sensación grasa.", "/products/sebo-regular.webp", "Sebo Regular Esentis 50 Ml", 575m, "Balance", "https://www.sirena.do/esentis-sebo-regular-50-ml-2124039/p", new[] { "grasa", "mixta" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar una capa ligera después de limpiar, principalmente en zonas con brillo." },
                    { 9L, "makeup", new[] { "base", "cobertura", "tono" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Base líquida con cobertura ligera a media y acabado natural radiante.", "/products/makeup/base-almay.webp", "Base Facial Líquida Always Neutral", 1400m, "Base", "https://www.sirena.do/almay-clear-complexion-makeup-neutral-1747245/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Probar el tono en la mandíbula y difuminar desde el centro hacia afuera." },
                    { 10L, "makeup", new[] { "rubor", "mejillas", "color" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Rubor compacto de textura sedosa y acabado natural luminoso.", "/products/makeup/rubor-she.webp", "Polvo de Rubor S.HE R.Bs998", 138m, "Rubor", "https://www.sirena.do/s-he-blush-powder-r-bs998-2140832/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar poca cantidad sobre las mejillas y difuminar gradualmente." },
                    { 11L, "makeup", new[] { "labial", "gloss", "labios" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Brillo labial Wet N Wild de la línea MegaSlicks en tono Love.", "/products/makeup/labial-wetnwild.webp", "Labial Wet N Wild Mega Sliks Gloss Love", 475m, "Labial", "https://www.sirena.do/wet-n-wild-mega-sliks-lip-gloss-love-lg-2007202/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar directamente y reaplicar según el acabado deseado." },
                    { 12L, "makeup", new[] { "corrector", "ojeras", "imperfecciones" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Corrector cremoso tono Honey para disimular visualmente ojeras e imperfecciones.", "/products/makeup/corrector-amuse.webp", "Corrector Amuse Full Honey", 265.30m, "Corrector", "https://www.sirena.do/amuse-full-concealer-honey-kl237-mix-6-1973074/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar pequeñas cantidades y difuminar sin arrastrar la piel." },
                    { 13L, "makeup", new[] { "prebase", "poros", "textura" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Prebase facial para preparar visualmente la superficie antes del maquillaje.", "/products/makeup/prebase-sky.webp", "Pre-base Sky Smooth & Poreless", 281.25m, "Prebase", "https://www.sirena.do/sky-primer-smooth-poreless-1882109/p", new[] { "seca", "grasa", "mixta", "sensible", "normal" }, new DateTimeOffset(new DateTime(2026, 8, 19, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Aplicar una capa fina después del cuidado facial y antes de la base." }
                });

            migrationBuilder.Sql("select setval(pg_get_serial_sequence('products', 'id'), (select max(id) from products));");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_session_created",
                table: "chat_messages",
                columns: new[] { "chat_session_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_chat_sessions_created_at",
                table: "chat_sessions",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_order_id",
                table: "order_items",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_product_id",
                table: "order_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_orders_status_created_at",
                table: "orders",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_products_collection",
                table: "products",
                column: "collection");

            migrationBuilder.CreateIndex(
                name: "ix_products_role",
                table: "products",
                column: "role");

            migrationBuilder.CreateIndex(
                name: "ix_skin_analyses_chat_session_id",
                table: "skin_analyses",
                column: "chat_session_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "skin_analyses");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "chat_sessions");
        }
    }
}
