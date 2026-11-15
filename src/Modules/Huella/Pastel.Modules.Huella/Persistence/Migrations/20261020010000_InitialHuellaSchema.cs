using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialHuellaSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "huella");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Keep the schema because it also stores this module's migration history.
        }
    }
}
