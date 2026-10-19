using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Única fuente de permisos efectivos: módulo habilitado, luego denegación individual, concesión individual y por último el rol.
/// Lo usan el manejador de autorización y <c>/api/auth/me</c>. Una consulta por usuario y por petición (caché por ámbito).
/// </summary>
internal sealed class PermissionEvaluator(IdentityDbContext db) : IPermissionEvaluator
{
    private readonly Dictionary<Guid, IReadOnlySet<string>> _cache = [];

    public async Task<IReadOnlySet<string>> GetEffectivePermissionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(userId, out var cached))
        {
            return cached;
        }

        var rows = await db.Permissions.AsNoTracking()
            .Where(p => p.Module.IsEnabled)
            .Select(p => new
            {
                p.Code,
                ByRole = p.RolePermissions.Any(rp => rp.Role.UserRoles.Any(ur => ur.UserId == userId)),
                Override = db.UserPermissionOverrides
                    .Where(o => o.UserId == userId && o.PermissionId == p.Id)
                    .Select(o => (PermissionEffect?)o.Effect)
                    .FirstOrDefault(),
            })
            .Where(r => r.ByRole || r.Override != null)
            .ToListAsync(cancellationToken);

        var effective = rows
            .Where(r => PermissionDecision.IsAllowed(moduleEnabled: true, r.ByRole, r.Override))
            .Select(r => r.Code)
            .ToHashSet(StringComparer.Ordinal);

        _cache[userId] = effective;
        return effective;
    }
}
