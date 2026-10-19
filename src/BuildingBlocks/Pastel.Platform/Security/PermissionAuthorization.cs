using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Observability;

namespace Pastel.Platform.Security;

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;

/// <summary>Resuelve políticas dinámicas <c>permission:&lt;codigo&gt;</c>.</summary>
internal sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options) : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback = new(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(PermissionPolicy.Prefix, StringComparison.Ordinal))
        {
            return _fallback.GetPolicyAsync(policyName);
        }

        var code = policyName[PermissionPolicy.Prefix.Length..];
        var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(code)).Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}

internal sealed class PermissionAuthorizationHandler(IPermissionEvaluator evaluator) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (!Guid.TryParse(context.User.FindFirst("sub")?.Value, out var userId))
        {
            return;
        }

        if (await evaluator.HasPermissionAsync(userId, requirement.PermissionCode))
        {
            context.Succeed(requirement);
        }
    }
}

/// <summary>Limita cuántas veces por minuto se registra (log y auditoría) el mismo acceso denegado, para no inundar.</summary>
internal sealed class DeniedAccessThrottle
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _lastSeen = new();

    public bool ShouldReport(string key, DateTimeOffset now)
    {
        if (_lastSeen.Count > 5000)
        {
            _lastSeen.Clear();
        }

        var report = false;
        _lastSeen.AddOrUpdate(
            key,
            _ =>
            {
                report = true;
                return now;
            },
            (_, previous) =>
            {
                if (now - previous < TimeSpan.FromMinutes(1))
                {
                    return previous;
                }

                report = true;
                return now;
            });
        return report;
    }
}

/// <summary>Respuestas 401 y 403 en <c>problem+json</c>; los accesos denegados quedan en el log y en la auditoría (con límite).</summary>
internal sealed class PastelAuthorizationResultHandler(DeniedAccessThrottle throttle, ILogger<PastelAuthorizationResultHandler> logger)
    : IAuthorizationMiddlewareResultHandler
{
    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Succeeded)
        {
            await next(context);
            return;
        }

        if (authorizeResult.Challenged)
        {
            await PastelProblem.From(PlatformErrors.Unauthorized, context).ExecuteAsync(context);
            return;
        }

        var permission = policy.Requirements.OfType<PermissionRequirement>().FirstOrDefault()?.PermissionCode ?? "(sesión)";
        Guid? userId = Guid.TryParse(context.User.FindFirst("sub")?.Value, out var id) ? id : null;
        if (throttle.ShouldReport($"{userId}:{permission}", DateTimeOffset.UtcNow))
        {
            logger.LogWarning(PastelEventIds.AccessDenied, "Acceso denegado al permiso {Permission}", permission);
            await AuditDeniedAsync(context, userId, permission);
        }

        await PastelProblem.From(PlatformErrors.Forbidden, context).ExecuteAsync(context);
    }

    private async Task AuditDeniedAsync(HttpContext context, Guid? userId, string permission)
    {
        try
        {
            var audit = context.RequestServices.GetRequiredService<IAuditTrail>();
            await audit.WriteAsync(
                new AuditRecord("auth.access.denied", "platform", userId, null, permission, After: new { permission }),
                context.RequestAborted);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // El rechazo se responde igual; el fallo de auditoría queda visible en el registro técnico.
            logger.LogError(PastelEventIds.AuditFailure, ex, "No se pudo auditar un acceso denegado");
        }
    }
}
