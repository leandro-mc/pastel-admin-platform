using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Brisa.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBrisaTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "import_batches",
                schema: "brisa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TaskCount = table.Column<int>(type: "integer", nullable: false),
                    RevertedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_batches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "settings",
                schema: "brisa",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settings", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "task_undos",
                schema: "brisa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    BeforeCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    BeforeCompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BeforeDeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AfterUpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_undos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                schema: "brisa",
                columns: table => new
                {
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ScheduledDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Priority = table.Column<short>(type: "smallint", nullable: false),
                    ColorHex = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ImportBatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => new { x.OwnerId, x.Id });
                });

            migrationBuilder.CreateIndex(
                name: "IX_import_batches_OwnerId",
                schema: "brisa",
                table: "import_batches",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_task_undos_OwnerId_CreatedAt",
                schema: "brisa",
                table: "task_undos",
                columns: new[] { "OwnerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_tasks_ImportBatchId",
                schema: "brisa",
                table: "tasks",
                column: "ImportBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_OwnerId_UpdatedAt",
                schema: "brisa",
                table: "tasks",
                columns: new[] { "OwnerId", "UpdatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "import_batches",
                schema: "brisa");

            migrationBuilder.DropTable(
                name: "settings",
                schema: "brisa");

            migrationBuilder.DropTable(
                name: "task_undos",
                schema: "brisa");

            migrationBuilder.DropTable(
                name: "tasks",
                schema: "brisa");
        }
    }
}
