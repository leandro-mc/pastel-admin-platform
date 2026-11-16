using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaCompetencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Format",
                schema: "huella",
                table: "cv_versions",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "standard");

            migrationBuilder.CreateTable(
                name: "competencies",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Kind = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Evidence = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_competencies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_competencies_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_competencies_ProfileId_Kind_NormalizedName",
                schema: "huella",
                table: "competencies",
                columns: new[] { "ProfileId", "Kind", "NormalizedName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "competencies",
                schema: "huella");

            migrationBuilder.DropColumn(
                name: "Format",
                schema: "huella",
                table: "cv_versions");
        }
    }
}
