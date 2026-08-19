using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sirena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChatSessionSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_chat_sessions_skin_profile",
                table: "chat_sessions");

            migrationBuilder.AlterColumn<string>(
                name: "skin_profile",
                table: "chat_sessions",
                type: "character varying(24)",
                maxLength: 24,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24);

            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "chat_sessions",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.Sql("UPDATE chat_sessions SET slug = 'sesion-legacy-' || id::text WHERE slug IS NULL");

            migrationBuilder.AlterColumn<string>(
                name: "slug",
                table: "chat_sessions",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ux_chat_sessions_slug",
                table: "chat_sessions",
                column: "slug",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_chat_sessions_skin_profile",
                table: "chat_sessions",
                sql: "skin_profile is null or skin_profile in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_chat_sessions_slug",
                table: "chat_sessions");

            migrationBuilder.DropCheckConstraint(
                name: "ck_chat_sessions_skin_profile",
                table: "chat_sessions");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "chat_sessions");

            migrationBuilder.AlterColumn<string>(
                name: "skin_profile",
                table: "chat_sessions",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_chat_sessions_skin_profile",
                table: "chat_sessions",
                sql: "skin_profile in ('seca', 'grasa', 'mixta', 'sensible', 'normal')");
        }
    }
}
