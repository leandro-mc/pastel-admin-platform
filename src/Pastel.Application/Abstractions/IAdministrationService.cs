using Pastel.Application.Contracts;

namespace Pastel.Application.Abstractions;

public interface IAdministrationService
{
    Task<IReadOnlyList<UserSummary>> GetUsersAsync(CancellationToken cancellationToken);
    Task<UserSummary> CreateUserAsync(CreateUserCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<IReadOnlyList<string>> SetUserRolesAsync(Guid userId, IReadOnlyCollection<Guid> roleIds, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<IReadOnlyList<UserPermissionAssignment>> GetUserPermissionOverridesAsync(Guid userId, CancellationToken cancellationToken);
    Task SetUserPermissionOverridesAsync(Guid userId, IReadOnlyCollection<UserPermissionChange> changes, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task BlockUserAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task UnblockUserAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<string> ResetPasswordAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<IReadOnlyList<RoleSummary>> GetRolesAsync(CancellationToken cancellationToken);
    Task<RoleSummary> CreateRoleAsync(CreateRoleCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task SetRolePermissionsAsync(Guid roleId, IReadOnlyCollection<Guid> permissionIds, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<IReadOnlyList<ModuleSummary>> GetModulesAsync(CancellationToken cancellationToken);
    Task<ModuleSummary> CreateModuleAsync(CreateModuleCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task SetModuleEnabledAsync(Guid moduleId, bool enabled, Guid actorId, string? ipAddress, CancellationToken cancellationToken);
    Task<IReadOnlyList<PermissionSummary>> GetPermissionsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<AuditEntry>> GetAuditLogAsync(int take, CancellationToken cancellationToken);
}
