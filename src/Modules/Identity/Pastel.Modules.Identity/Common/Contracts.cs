using Pastel.Modules.Identity.Domain;

namespace Pastel.Modules.Identity.Common;

// Contratos JSON de /api/auth/* y /api/admin/*. Los nombres de campo se conservan (camelCase por defecto de la API).
internal sealed record UserSummary(
    Guid Id, string Email, string DisplayName, bool IsActive, bool MustChangePassword,
    int AccessFailedCount, DateTimeOffset? LockoutEnd, DateTimeOffset CreatedAt, IReadOnlyList<string> Roles);

internal sealed record SessionSummary(UserSummary User, DateTimeOffset AccessTokenExpiresAt);

internal sealed record PermissionSummary(
    Guid Id, string ModuleCode, string ModuleName, string Code, string Name, string? Description, bool IsSystemPermission);

internal sealed record RoleSummary(
    Guid Id, string Name, string? Description, bool IsSystemRole,
    IReadOnlyList<Guid> PermissionIds, IReadOnlyList<string> Permissions, int UserCount);

internal sealed record ModuleSummary(
    Guid Id, string Code, string Name, string? Description, bool IsEnabled, int SortOrder,
    IReadOnlyList<PermissionSummary> Permissions);

internal sealed record UserPermissionAssignment(Guid PermissionId, string PermissionCode, string PermissionName, PermissionEffect Effect);

/// <summary>Definición de un rol y sus permisos dentro de una aplicación (vista previa del modo desarrollador). Sin personas ni datos.</summary>
internal sealed record DeveloperRoleView(string Name, string? Description, bool IsSystemRole, IReadOnlyList<string> Permissions);

internal sealed record DeveloperRolesResponse(string App, IReadOnlyList<string> AppPermissions, IReadOnlyList<DeveloperRoleView> Roles);

internal sealed record AuditEntry(
    long Id, Guid? ActorUserId, string? ActorEmail, Guid? TargetUserId, string Action, string Module,
    string? Target, string? DetailsJson, string? IpAddress, string? TraceId, DateTimeOffset CreatedAt);
