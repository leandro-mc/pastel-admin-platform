using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Pastel.Domain.Entities;
using Pastel.Infrastructure.Persistence;

#nullable disable
namespace Pastel.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("202610150001_InitialCreate")]
public sealed class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Modules",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Description = table.Column<string>(type: "text", nullable: true),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table => table.PrimaryKey("PK_Modules", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Roles",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                NormalizedName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Description = table.Column<string>(type: "text", nullable: true),
                IsSystemRole = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table => table.PrimaryKey("PK_Roles", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                NormalizedEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                PasswordHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                MustChangePassword = table.Column<bool>(type: "boolean", nullable: false),
                AccessFailedCount = table.Column<int>(type: "integer", nullable: false),
                LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                TokenVersion = table.Column<int>(type: "integer", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table => table.PrimaryKey("PK_Users", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Permissions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                ModuleId = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Description = table.Column<string>(type: "text", nullable: true),
                IsSystemPermission = table.Column<bool>(type: "boolean", nullable: false)
            }, constraints: table =>
            {
                table.PrimaryKey("PK_Permissions", x => x.Id);
                table.ForeignKey("FK_Permissions_Modules_ModuleId", x => x.ModuleId, "Modules", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AuditLogs",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Target = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                DetailsJson = table.Column<string>(type: "text", nullable: true),
                IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table => table.PrimaryKey("PK_AuditLogs", x => x.Id));

        migrationBuilder.CreateTable(
            name: "RefreshTokens",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                ReplacedByTokenHash = table.Column<string>(type: "text", nullable: true),
                CreatedByIp = table.Column<string>(type: "text", nullable: true)
            }, constraints: table =>
            {
                table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                table.ForeignKey("FK_RefreshTokens_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "UserRoles",
            columns: table => new
            {
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                AssignedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table =>
            {
                table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                table.ForeignKey("FK_UserRoles_Roles_RoleId", x => x.RoleId, "Roles", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_UserRoles_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "RolePermissions",
            columns: table => new
            {
                RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                PermissionId = table.Column<Guid>(type: "uuid", nullable: false)
            }, constraints: table =>
            {
                table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.PermissionId });
                table.ForeignKey("FK_RolePermissions_Permissions_PermissionId", x => x.PermissionId, "Permissions", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_RolePermissions_Roles_RoleId", x => x.RoleId, "Roles", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "UserPermissionOverrides",
            columns: table => new
            {
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                PermissionId = table.Column<Guid>(type: "uuid", nullable: false),
                Effect = table.Column<int>(type: "integer", nullable: false),
                AssignedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            }, constraints: table =>
            {
                table.PrimaryKey("PK_UserPermissionOverrides", x => new { x.UserId, x.PermissionId });
                table.ForeignKey("FK_UserPermissionOverrides_Permissions_PermissionId", x => x.PermissionId, "Permissions", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_UserPermissionOverrides_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(name: "IX_Modules_Code", table: "Modules", column: "Code", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Roles_NormalizedName", table: "Roles", column: "NormalizedName", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Users_NormalizedEmail", table: "Users", column: "NormalizedEmail", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Permissions_Code", table: "Permissions", column: "Code", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Permissions_ModuleId", table: "Permissions", column: "ModuleId");
        migrationBuilder.CreateIndex(name: "IX_AuditLogs_CreatedAt", table: "AuditLogs", column: "CreatedAt");
        migrationBuilder.CreateIndex(name: "IX_RefreshTokens_TokenHash", table: "RefreshTokens", column: "TokenHash", unique: true);
        migrationBuilder.CreateIndex(name: "IX_RefreshTokens_UserId_ExpiresAt", table: "RefreshTokens", columns: new[] { "UserId", "ExpiresAt" });
        migrationBuilder.CreateIndex(name: "IX_UserRoles_RoleId", table: "UserRoles", column: "RoleId");
        migrationBuilder.CreateIndex(name: "IX_RolePermissions_PermissionId", table: "RolePermissions", column: "PermissionId");
        migrationBuilder.CreateIndex(name: "IX_UserPermissionOverrides_PermissionId", table: "UserPermissionOverrides", column: "PermissionId");
    }

    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.13").HasAnnotation("Relational:MaxIdentifierLength", 63);

        modelBuilder.Entity<AppRole>(b =>
        {
            b.Property<Guid>(x => x.Id).ValueGeneratedOnAdd();
            b.Property<string>(x => x.Name).IsRequired().HasMaxLength(64);
            b.Property<string>(x => x.NormalizedName).IsRequired().HasMaxLength(64);
            b.Property<string>(x => x.Description);
            b.Property<bool>(x => x.IsSystemRole);
            b.Property<DateTimeOffset>(x => x.CreatedAt);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.NormalizedName).IsUnique();
            b.ToTable("Roles");
        });
        modelBuilder.Entity<AppUser>(b =>
        {
            b.Property<Guid>(x => x.Id).ValueGeneratedOnAdd();
            b.Property<string>(x => x.Email).IsRequired().HasMaxLength(320);
            b.Property<string>(x => x.NormalizedEmail).IsRequired().HasMaxLength(320);
            b.Property<string>(x => x.DisplayName).IsRequired().HasMaxLength(100);
            b.Property<string>(x => x.PasswordHash).IsRequired().HasMaxLength(512);
            b.Property<bool>(x => x.IsActive);
            b.Property<bool>(x => x.MustChangePassword);
            b.Property<int>(x => x.AccessFailedCount);
            b.Property<DateTimeOffset?>(x => x.LockoutEnd);
            b.Property<int>(x => x.TokenVersion);
            b.Property<DateTimeOffset>(x => x.CreatedAt);
            b.Property<DateTimeOffset>(x => x.UpdatedAt);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.NormalizedEmail).IsUnique();
            b.ToTable("Users");
        });
        modelBuilder.Entity<ModuleDefinition>(b =>
        {
            b.Property<Guid>(x => x.Id).ValueGeneratedOnAdd();
            b.Property<string>(x => x.Code).IsRequired().HasMaxLength(64);
            b.Property<string>(x => x.Name).IsRequired().HasMaxLength(100);
            b.Property<string>(x => x.Description);
            b.Property<bool>(x => x.IsEnabled);
            b.Property<int>(x => x.SortOrder);
            b.Property<DateTimeOffset>(x => x.CreatedAt);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Code).IsUnique();
            b.ToTable("Modules");
        });
        modelBuilder.Entity<PermissionDefinition>(b =>
        {
            b.Property<Guid>(x => x.Id).ValueGeneratedOnAdd();
            b.Property<Guid>(x => x.ModuleId);
            b.Property<string>(x => x.Code).IsRequired().HasMaxLength(128);
            b.Property<string>(x => x.Name).IsRequired().HasMaxLength(100);
            b.Property<string>(x => x.Description);
            b.Property<bool>(x => x.IsSystemPermission);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => x.ModuleId);
            b.ToTable("Permissions");
        });
        modelBuilder.Entity<UserRole>(b =>
        {
            b.Property<Guid>(x => x.UserId);
            b.Property<Guid>(x => x.RoleId);
            b.Property<DateTimeOffset>(x => x.AssignedAt);
            b.HasKey(x => new { x.UserId, x.RoleId });
            b.HasIndex(x => x.RoleId);
            b.ToTable("UserRoles");
        });
        modelBuilder.Entity<RolePermission>(b =>
        {
            b.Property<Guid>(x => x.RoleId);
            b.Property<Guid>(x => x.PermissionId);
            b.HasKey(x => new { x.RoleId, x.PermissionId });
            b.HasIndex(x => x.PermissionId);
            b.ToTable("RolePermissions");
        });
        modelBuilder.Entity<UserPermissionOverride>(b =>
        {
            b.Property<Guid>(x => x.UserId);
            b.Property<Guid>(x => x.PermissionId);
            b.Property<PermissionEffect>(x => x.Effect);
            b.Property<Guid?>(x => x.AssignedByUserId);
            b.Property<DateTimeOffset>(x => x.UpdatedAt);
            b.HasKey(x => new { x.UserId, x.PermissionId });
            b.HasIndex(x => x.PermissionId);
            b.ToTable("UserPermissionOverrides");
        });
        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.Property<Guid>(x => x.Id).ValueGeneratedOnAdd();
            b.Property<Guid>(x => x.UserId);
            b.Property<string>(x => x.TokenHash).IsRequired().HasMaxLength(64);
            b.Property<DateTimeOffset>(x => x.CreatedAt);
            b.Property<DateTimeOffset>(x => x.ExpiresAt);
            b.Property<DateTimeOffset?>(x => x.RevokedAt);
            b.Property<string>(x => x.ReplacedByTokenHash);
            b.Property<string>(x => x.CreatedByIp);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.TokenHash).IsUnique();
            b.HasIndex(x => new { x.UserId, x.ExpiresAt });
            b.ToTable("RefreshTokens");
        });
        modelBuilder.Entity<AuditLog>(b =>
        {
            b.Property<long>(x => x.Id).ValueGeneratedOnAdd().HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
            b.Property<Guid?>(x => x.ActorUserId);
            b.Property<Guid?>(x => x.TargetUserId);
            b.Property<string>(x => x.Action).IsRequired().HasMaxLength(100);
            b.Property<string>(x => x.Target).HasMaxLength(320);
            b.Property<string>(x => x.DetailsJson);
            b.Property<string>(x => x.IpAddress).HasMaxLength(64);
            b.Property<DateTimeOffset>(x => x.CreatedAt);
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.CreatedAt);
            b.ToTable("AuditLogs");
        });

        modelBuilder.Entity<PermissionDefinition>().HasOne(x => x.Module).WithMany(x => x.Permissions).HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserRole>().HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserRole>().HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RolePermission>().HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RolePermission>().HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserPermissionOverride>().HasOne(x => x.User).WithMany(x => x.PermissionOverrides).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserPermissionOverride>().HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RefreshToken>().HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AuditLogs");
        migrationBuilder.DropTable(name: "RefreshTokens");
        migrationBuilder.DropTable(name: "RolePermissions");
        migrationBuilder.DropTable(name: "UserPermissionOverrides");
        migrationBuilder.DropTable(name: "UserRoles");
        migrationBuilder.DropTable(name: "Permissions");
        migrationBuilder.DropTable(name: "Users");
        migrationBuilder.DropTable(name: "Roles");
        migrationBuilder.DropTable(name: "Modules");
    }
}
