using Microsoft.AspNetCore.Http;

namespace Pastel.Platform.Security;

/// <summary>Persona que realiza la petición actual. La implementa Identity.</summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    Guid? UserId { get; }

    string? DisplayName { get; }

    string? ClientIp { get; }

    Task<bool> HasPermissionAsync(string permissionCode, CancellationToken cancellationToken = default);
}

/// <summary>
/// Calcula los permisos efectivos: módulo habilitado, luego denegación individual, concesión individual y por último el rol.
/// Un solo cálculo por petición (caché por ámbito). La implementa Identity.
/// </summary>
public interface IPermissionEvaluator
{
    Task<IReadOnlySet<string>> GetEffectivePermissionsAsync(Guid userId, CancellationToken cancellationToken = default);

    async Task<bool> HasPermissionAsync(Guid userId, string permissionCode, CancellationToken cancellationToken = default) =>
        (await GetEffectivePermissionsAsync(userId, cancellationToken)).Contains(permissionCode);
}

/// <summary>Estado de sesión leído una sola vez por petición autenticada y guardado en <c>HttpContext.Items</c>.</summary>
public sealed record PastelSessionState(bool IsActive, int TokenVersion, bool MustChangePassword)
{
    public const string ItemKey = "pastel.session-state";
}

public static class SessionStateExtensions
{
    public static PastelSessionState? GetSessionState(this HttpContext context) =>
        context.Items.TryGetValue(PastelSessionState.ItemKey, out var value) ? value as PastelSessionState : null;
}

/// <summary>Nombres de las cookies de la plataforma.</summary>
public static class PastelCookies
{
    public const string Access = "__Host-pastel_access";
    public const string Refresh = "__Host-pastel_refresh";
    public const string Csrf = "__Host-pastel_csrf";
    public const string ExternalLogin = "__Host-pastel_ext";
    public const string CsrfHeader = "X-CSRF-TOKEN";
}
