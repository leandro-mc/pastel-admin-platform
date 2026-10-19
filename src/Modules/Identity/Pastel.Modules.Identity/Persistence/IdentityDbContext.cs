using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;

namespace Pastel.Modules.Identity.Persistence;

/// <summary>Contexto del módulo Identity. Esquema <c>identity</c>, tablas en snake_case.</summary>
internal sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public const string Schema = "identity";

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AppRole> Roles => Set<AppRole>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<ModuleDefinition> Modules => Set<ModuleDefinition>();
    public DbSet<PermissionDefinition> Permissions => Set<PermissionDefinition>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermissionOverride> UserPermissionOverrides => Set<UserPermissionOverride>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<AppUser>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.Property(x => x.NormalizedEmail).HasMaxLength(320).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(512);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.NormalizedEmail).IsUnique();
        });

        modelBuilder.Entity<AppRole>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(64).IsRequired();
            e.Property(x => x.NormalizedName).HasMaxLength(64).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.NormalizedName).IsUnique();
        });

        modelBuilder.Entity<UserRole>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ModuleDefinition>(e =>
        {
            e.ToTable("modules");
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(64).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<PermissionDefinition>(e =>
        {
            e.ToTable("permissions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(128).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasOne(x => x.Module).WithMany(x => x.Permissions).HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.ToTable("role_permissions");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPermissionOverride>(e =>
        {
            e.ToTable("user_permission_overrides");
            e.HasKey(x => new { x.UserId, x.PermissionId });
            e.HasOne(x => x.User).WithMany(x => x.PermissionOverrides).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            e.Property(x => x.ReplacedByTokenHash).HasMaxLength(64);
            e.Property(x => x.CreatedByIp).HasMaxLength(64);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.ExpiresAt });
            e.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(100).IsRequired();
            e.Property(x => x.Module).HasMaxLength(32).IsRequired();
            e.Property(x => x.Target).HasMaxLength(320);
            e.Property(x => x.DetailsJson).HasColumnType("jsonb");
            e.Property(x => x.IpAddress).HasMaxLength(64);
            e.Property(x => x.TraceId).HasMaxLength(64);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.Module, x.Action });
            e.HasIndex(x => x.ActorUserId);
            e.HasIndex(x => x.TargetUserId);
        });
    }
}
