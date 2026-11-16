using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaApplicationTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AppliedAt",
                schema: "huella",
                table: "job_offers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "FollowUpAt",
                schema: "huella",
                table: "job_offers",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                schema: "huella",
                table: "job_offers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "huella",
                table: "job_offers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "saved");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StatusUpdatedAt",
                schema: "huella",
                table: "job_offers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SentAt",
                schema: "huella",
                table: "cv_versions",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppliedAt",
                schema: "huella",
                table: "job_offers");

            migrationBuilder.DropColumn(
                name: "FollowUpAt",
                schema: "huella",
                table: "job_offers");

            migrationBuilder.DropColumn(
                name: "Notes",
                schema: "huella",
                table: "job_offers");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "huella",
                table: "job_offers");

            migrationBuilder.DropColumn(
                name: "StatusUpdatedAt",
                schema: "huella",
                table: "job_offers");

            migrationBuilder.DropColumn(
                name: "SentAt",
                schema: "huella",
                table: "cv_versions");
        }
    }
}
