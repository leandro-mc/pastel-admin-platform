using Microsoft.AspNetCore.Http;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>Persona de la petición actual, leída de la identidad ya validada (sin consultas propias).</summary>
internal sealed class CurrentUser(IHttpContextAccessor accessor, IPermissionEvaluator evaluator) : ICurrentUser
{
    private HttpContext? Context => accessor.HttpContext;

    public bool IsAuthenticated => Context?.User.Identity?.IsAuthenticated == true;

    public Guid? UserId => Guid.TryParse(Context?.User.FindFirst("sub")?.Value, out var id) ? id : null;

    public string? DisplayName => Context?.User.FindFirst("name")?.Value;

    public string? ClientIp => Context?.Connection.RemoteIpAddress?.ToString();

    public async Task<bool> HasPermissionAsync(string permissionCode, CancellationToken cancellationToken = default) =>
        UserId is { } id && await evaluator.HasPermissionAsync(id, permissionCode, cancellationToken);
}
