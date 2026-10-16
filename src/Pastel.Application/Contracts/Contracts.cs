using Pastel.Domain.Entities;

namespace Pastel.Application.Contracts;

public sealed record RegisterCommand(string Email, string DisplayName, string Password);
public sealed record LoginCommand(string Email, string Password);
public sealed record CreateUserCommand(string Email, string DisplayName, string TemporaryPassword, IReadOnlyCollection<Guid> RoleIds);
public sealed record CreateRoleCommand(string Name, string? Description, IReadOnlyCollection<Guid> PermissionIds);
public sealed record UserPermissionChange(Guid PermissionId, PermissionEffect Effect);
public sealed record UserPermissionAssignment(Guid PermissionId, string PermissionCode, string PermissionName, PermissionEffect Effect);
public sealed record CreateModuleCommand(string Code, string Name, string? Description, IReadOnlyCollection<string> Actions);
public sealed record UserSummary(Guid Id, string Email, string DisplayName, bool IsActive, bool MustChangePassword, int AccessFailedCount, DateTimeOffset? LockoutEnd, DateTimeOffset CreatedAt, IReadOnlyList<string> Roles);
public sealed record PermissionSummary(Guid Id, string ModuleCode, string ModuleName, string Code, string Name, string? Description, bool IsSystemPermission);
public sealed record RoleSummary(Guid Id, string Name, string? Description, bool IsSystemRole, IReadOnlyList<Guid> PermissionIds, IReadOnlyList<string> Permissions, int UserCount);
public sealed record ModuleSummary(Guid Id, string Code, string Name, string? Description, bool IsEnabled, int SortOrder, IReadOnlyList<PermissionSummary> Permissions);
public sealed record AuditEntry(long Id, Guid? ActorUserId, string? ActorEmail, Guid? TargetUserId, string Action, string? Target, string? DetailsJson, string? IpAddress, DateTimeOffset CreatedAt);
public sealed record SessionSummary(UserSummary User, DateTimeOffset AccessTokenExpiresAt);
public sealed record AuthenticationResult(bool Success, string? Error, string? AccessToken, string? RefreshToken, SessionSummary? Session)
{
    public static AuthenticationResult Failed(string message) => new(false, message, null, null, null);
}
