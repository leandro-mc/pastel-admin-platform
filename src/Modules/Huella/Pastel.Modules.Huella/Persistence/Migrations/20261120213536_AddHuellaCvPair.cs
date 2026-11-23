using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaCvPair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PairId",
                schema: "huella",
                table: "cv_versions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PairPendingJson",
                schema: "huella",
                table: "cv_versions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_cv_versions_PairId",
                schema: "huella",
                table: "cv_versions",
                column: "PairId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_cv_versions_PairId",
                schema: "huella",
                table: "cv_versions");

            migrationBuilder.DropColumn(
                name: "PairId",
                schema: "huella",
                table: "cv_versions");

            migrationBuilder.DropColumn(
                name: "PairPendingJson",
                schema: "huella",
                table: "cv_versions");
        }
    }
}
