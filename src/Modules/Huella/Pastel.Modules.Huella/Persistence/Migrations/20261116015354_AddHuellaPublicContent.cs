using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaPublicContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredLanguage",
                schema: "huella",
                table: "private_notes");

            migrationBuilder.CreateTable(
                name: "profile_contents",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    EsJson = table.Column<string>(type: "jsonb", nullable: false),
                    EnJson = table.Column<string>(type: "jsonb", nullable: false),
                    StateJson = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_profile_contents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_profile_contents_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_profile_contents_ProfileId",
                schema: "huella",
                table: "profile_contents",
                column: "ProfileId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "profile_contents",
                schema: "huella");

            migrationBuilder.AddColumn<string>(
                name: "PreferredLanguage",
                schema: "huella",
                table: "private_notes",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "");
        }
    }
}
