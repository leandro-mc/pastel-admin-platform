using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Identity.Catalog;

/// <summary>
/// Sincroniza el catálogo declarado en código con la base. Administrator conserva administración general,
/// pero no recibe privilegios reservados a Owner/Superuser ni permisos de Huella/Cosecha.
/// Owner/Superuser se mantiene como rol de sistema con un conjunto explícito y reducido de permisos.
/// </summary>
internal sealed class CatalogSyncTask(ModuleCatalog catalog, ILogger<CatalogSyncTask> logger) : IPastelStartupTask
{
    public int Order => 10;

    public async Task RunAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        await TransactionRunner.RunSerializableAsync(db, async token =>
        {
            await SyncAsync(db, token);
            return true;
        }, cancellationToken);
    }

    private async Task SyncAsync(IdentityDbContext db, CancellationToken cancellationToken)
    {
        var modules = await db.Modules.Include(m => m.Permissions).ToDictionaryAsync(m => m.Code, cancellationToken);

        foreach (var group in catalog.AllGroups)
        {
            if (!modules.TryGetValue(group.Code, out var module))
            {
                module = new ModuleDefinition { Code = group.Code, Name = group.Name, SortOrder = group.SortOrder, IsEnabled = true };
                db.Modules.Add(module);
                modules[group.Code] = module;
            }
            else
            {
                module.Name = group.Name;
                module.SortOrder = group.SortOrder;
            }

            foreach (var info in group.Permissions)
            {
                var permission = module.Permissions.FirstOrDefault(p => p.Code == info.Code);
                if (permission is null)
                {
                    module.Permissions.Add(new PermissionDefinition { Code = info.Code, Name = info.Name, Description = info.Description, IsSystemPermission = true });
                }
                else
                {
                    permission.Name = info.Name;
                    permission.Description = info.Description;
                }
            }
        }

        var allPermissions = modules.Values.SelectMany(m => m.Permissions).ToList();
        var byCode = allPermissions.ToDictionary(p => p.Code, StringComparer.Ordinal);

        var admin = await db.Roles.SingleOrDefaultAsync(r => r.NormalizedName == AppRole.AdministratorName.ToUpperInvariant(), cancellationToken);
        if (admin is null)
        {
            admin = new AppRole
            {
                Name = AppRole.AdministratorName,
                NormalizedName = AppRole.AdministratorName.ToUpperInvariant(),
                Description = "Administración general de la plataforma; sin privilegios exclusivos del propietario.",
                IsSystemRole = true,
            };
            db.Roles.Add(admin);
        }
        else
        {
            admin.Description = "Administración general de la plataforma; sin privilegios exclusivos del propietario.";
            admin.IsSystemRole = true;
        }

        var owner = await db.Roles.SingleOrDefaultAsync(r => r.NormalizedName == AppRole.OwnerName.ToUpperInvariant(), cancellationToken);
        if (owner is null)
        {
            owner = new AppRole
            {
                Name = AppRole.OwnerName,
                NormalizedName = AppRole.OwnerName.ToUpperInvariant(),
                Description = "Propietario y superusuario: acceso global y permisos reservados de Huella y Cosecha.",
                IsSystemRole = true,
            };
            db.Roles.Add(owner);
        }
        else
        {
            owner.Name = AppRole.OwnerName;
            owner.Description = "Propietario y superusuario: acceso global y permisos reservados de Huella y Cosecha.";
            owner.IsSystemRole = true;
        }

        // Administrator recibe las funciones generales existentes, pero nunca obtiene platform.owner,
        // ni acceso de Huella/Cosecha por el mero hecho de ser administrador.
        var adminDesired = allPermissions.Where(p => IsGeneralAdministratorPermission(p.Code)).Select(p => p.Id).ToHashSet();
        var adminLinks = await db.RolePermissions.Include(x => x.Permission)
            .Where(x => x.RoleId == admin.Id).ToListAsync(cancellationToken);
        var removedAdminPermissions = adminLinks.Where(x => !IsGeneralAdministratorPermission(x.Permission.Code)).ToArray();
        db.RolePermissions.RemoveRange(removedAdminPermissions);
        var adminCurrent = adminLinks.Where(x => IsGeneralAdministratorPermission(x.Permission.Code)).Select(x => x.PermissionId).ToHashSet();
        foreach (var permission in allPermissions.Where(p => adminDesired.Contains(p.Id) && !adminCurrent.Contains(p.Id)))
        {
            db.RolePermissions.Add(new RolePermission { RoleId = admin.Id, PermissionId = permission.Id });
        }

        // El permiso de Workspace puede estar en Administrator para administración general, pero no en otros roles.
        // platform.owner y huella.* solo pertenecen al rol Owner/Superuser.
        var legacyRestricted = await db.RolePermissions.Include(x => x.Permission)
            .Where(x => x.RoleId != admin.Id && x.RoleId != owner.Id)
            .Where(x => x.Permission.Code == IdentityPermissions.WorkspaceAccess
                || x.Permission.Code == IdentityPermissions.OwnerPrivilege
                || x.Permission.Code.StartsWith("huella."))
            .ToListAsync(cancellationToken);
        db.RolePermissions.RemoveRange(legacyRestricted);

        // Owner es un rol de sistema reservado al bootstrap. Tiene Workspace, configuración global y acceso a
        // Cosecha/Huella; no adquiere automáticamente permisos de Brisa/Balance.
        // Owner/Superuser obtiene la plataforma completa y los permisos de todas las apps.
        // Administrator general solo recibe dashboard + settings + entrada a Workspace.
        var ownerDesired = allPermissions.Select(p => p.Id).ToHashSet();
        var ownerLinks = await db.RolePermissions.Include(x => x.Permission)
            .Where(x => x.RoleId == owner.Id).ToListAsync(cancellationToken);
        db.RolePermissions.RemoveRange(ownerLinks.Where(x => !ownerDesired.Contains(x.PermissionId)).ToArray());
        var ownerCurrent = ownerLinks.Where(x => ownerDesired.Contains(x.PermissionId)).Select(x => x.PermissionId).ToHashSet();
        foreach (var permission in allPermissions.Where(p => ownerDesired.Contains(p.Id) && !ownerCurrent.Contains(p.Id)))
        {
            db.RolePermissions.Add(new RolePermission { RoleId = owner.Id, PermissionId = permission.Id });
        }

        // Retirar el rol sugerido de Huella del diseño anterior. Sus permisos eran de todas formas
        // revocados por la regla owner-only; eliminar el rol evita que aparezca como opción vacía a futuro.
        var legacyHuellaRole = await db.Roles
            .Where(r => r.NormalizedName == "HUELLA — PROPIETARIO")
            .Select(r => r.Id)
            .SingleOrDefaultAsync(cancellationToken);
        if (legacyHuellaRole != Guid.Empty)
        {
            var oldHuellaMemberships = await db.UserRoles
                .Where(x => x.RoleId == legacyHuellaRole)
                .ToListAsync(cancellationToken);
            var oldHuellaPermissions = await db.RolePermissions
                .Where(x => x.RoleId == legacyHuellaRole)
                .ToListAsync(cancellationToken);
            db.UserRoles.RemoveRange(oldHuellaMemberships);
            db.RolePermissions.RemoveRange(oldHuellaPermissions);
            var role = await db.Roles.SingleAsync(x => x.Id == legacyHuellaRole, cancellationToken);
            db.Roles.Remove(role);
        }

        // En Workspace las excepciones directas se limitan a permisos de plataforma.
        // Los permisos de negocio de cada app se administran dentro del ámbito de esa app, mediante sus roles.
        var restrictedOverrides = await db.UserPermissionOverrides.Include(x => x.Permission)
            .Where(x => x.Permission.Code == IdentityPermissions.WorkspaceAccess
                || x.Permission.Code == IdentityPermissions.OwnerPrivilege
                || !(x.Permission.Code == IdentityPermissions.DashboardView
                    || x.Permission.Code.StartsWith("settings.")))
            .ToListAsync(cancellationToken);
        db.UserPermissionOverrides.RemoveRange(restrictedOverrides);

        var suggested = catalog.Modules.SelectMany(m => m.SuggestedRoles)
            .GroupBy(r => r.Name.Trim().ToUpperInvariant())
            .Where(g => g.Key != admin.NormalizedName && g.Key != owner.NormalizedName);
        foreach (var group in suggested)
        {
            if (await db.Roles.AnyAsync(r => r.NormalizedName == group.Key, cancellationToken))
            {
                continue;
            }

            var first = group.First();
            var role = new AppRole { Name = first.Name.Trim(), NormalizedName = group.Key, Description = first.Description, IsSystemRole = false };
            db.Roles.Add(role);
            foreach (var code in group.SelectMany(r => r.PermissionCodes).Distinct(StringComparer.Ordinal))
            {
                if (byCode.TryGetValue(code, out var permission))
                {
                    db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
                }
            }
        }

        var changes = await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            IdentityEventIds.CatalogSynced,
            "Catálogo sincronizado: {ModuleCount} grupo(s), {PermissionCount} permiso(s), {ChangeCount} cambio(s); privilegios Owner separados de Administrator",
            modules.Count, allPermissions.Count, changes);
    }

    private static bool IsGeneralAdministratorPermission(string code) =>
        code == IdentityPermissions.WorkspaceAccess
        || code == IdentityPermissions.DashboardView
        || code.StartsWith("settings.", StringComparison.Ordinal);
}
