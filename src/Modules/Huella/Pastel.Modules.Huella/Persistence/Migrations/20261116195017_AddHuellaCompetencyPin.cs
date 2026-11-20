using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaCompetencyPin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AlwaysInclude",
                schema: "huella",
                table: "competencies",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlwaysInclude",
                schema: "huella",
                table: "competencies");
        }
    }
}
