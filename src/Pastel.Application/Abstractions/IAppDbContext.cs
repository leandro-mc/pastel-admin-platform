using Microsoft.EntityFrameworkCore;
using Pastel.Domain.Entities;

namespace Pastel.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<AppUser> Users { get; }
    DbSet<AppRole> Roles { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<ModuleDefinition> Modules { get; }
    DbSet<PermissionDefinition> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<UserPermissionOverride> UserPermissionOverrides { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<AuditLog> AuditLogs { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
