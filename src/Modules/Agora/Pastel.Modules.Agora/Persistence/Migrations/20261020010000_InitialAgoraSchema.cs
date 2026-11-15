using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Agora.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialAgoraSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "agora");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Keep the schema because it also stores this module's migration history.
        }
    }
}
