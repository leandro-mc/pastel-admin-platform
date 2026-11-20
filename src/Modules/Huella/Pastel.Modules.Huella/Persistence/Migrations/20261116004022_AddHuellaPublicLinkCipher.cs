using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaPublicLinkCipher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicTokenCipher",
                schema: "huella",
                table: "profiles",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicTokenCipher",
                schema: "huella",
                table: "profiles");
        }
    }
}
