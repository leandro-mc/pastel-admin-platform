using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Pastel.Domain.Entities;

#nullable disable
namespace Pastel.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
public sealed class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
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
}
