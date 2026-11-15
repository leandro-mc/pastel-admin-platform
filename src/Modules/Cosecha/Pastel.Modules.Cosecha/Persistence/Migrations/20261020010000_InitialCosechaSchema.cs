using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Cosecha.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCosechaSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "cosecha");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Keep the schema because it also stores this module's migration history.
        }
    }
}
