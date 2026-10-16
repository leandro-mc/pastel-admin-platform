using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Pastel.Application.Abstractions;
using Pastel.Domain.Entities;

namespace Pastel.Infrastructure.Security;

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;

public sealed class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private const string Prefix = "permission:";
    private readonly DefaultAuthorizationPolicyProvider _fallback;
    public PermissionPolicyProvider(Microsoft.Extensions.Options.IOptions<AuthorizationOptions> options) => _fallback = new DefaultAuthorizationPolicyProvider(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(Prefix, StringComparison.Ordinal)) return _fallback.GetPolicyAsync(policyName);
        var code = policyName[Prefix.Length..];
        var policy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(code)).Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}

public sealed class PermissionAuthorizationHandler(IAppDbContext db) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var subject = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(subject, out var userId)) return;

        var permission = await db.Permissions.AsNoTracking().Where(x => x.Code == requirement.PermissionCode)
            .Select(x => new { x.Id, x.Module.IsEnabled }).SingleOrDefaultAsync();
        if (permission is null) return;

        // Explicit user-level deny wins; a grant is still gated by the module being enabled.
        var overrideEffect = await db.UserPermissionOverrides.AsNoTracking()
            .Where(x => x.UserId == userId && x.PermissionId == permission.Id)
            .Select(x => (PermissionEffect?)x.Effect).SingleOrDefaultAsync();
        var allowedByRole = await db.RolePermissions.AsNoTracking().AnyAsync(x => x.PermissionId == permission.Id && x.Role.UserRoles.Any(ur => ur.UserId == userId));
        if (PermissionDecision.IsAllowed(permission.IsEnabled, allowedByRole, overrideEffect)) context.Succeed(requirement);
    }
}
