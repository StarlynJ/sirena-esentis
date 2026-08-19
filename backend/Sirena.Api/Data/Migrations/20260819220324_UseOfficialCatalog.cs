using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sirena.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UseOfficialCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "products",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_active",
                table: "products");
        }
    }
}
