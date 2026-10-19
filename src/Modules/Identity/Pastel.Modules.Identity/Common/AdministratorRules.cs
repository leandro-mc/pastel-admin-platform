using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;

namespace Pastel.Modules.Identity.Common;

/// <summary>Reglas sobre el rol Administrator compartidas por las acciones de administración.</summary>
internal static class AdministratorRules
{
    public static readonly string NormalizedName = AppRole.AdministratorName.ToUpperInvariant();

    public static bool IsAdministrator(this AppUser user) => user.UserRoles.Any(x => x.Role.NormalizedName == NormalizedName);

    /// <summary>Cuentas activas con el rol Administrator. El bloqueo por contraseña no cuenta: no impide el acceso por otros medios.</summary>
    public static Task<int> CountActiveAdministratorsAsync(this IdentityDbContext db, CancellationToken cancellationToken) =>
        db.Users.CountAsync(x => x.IsActive && x.UserRoles.Any(r => r.Role.NormalizedName == NormalizedName), cancellationToken);
}
