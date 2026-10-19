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
/// Sincroniza el catálogo declarado en código (<see cref="IPastelModule"/>) con la base: grupos y permisos faltantes,
/// todo a <c>Administrator</c> y los roles sugeridos solo si todavía no existen. Idempotente; nunca pisa ediciones de roles.
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
        var admin = await db.Roles.SingleOrDefaultAsync(r => r.NormalizedName == "ADMINISTRATOR", cancellationToken);
        if (admin is null)
        {
            admin = new AppRole
            {
                Name = AppRole.AdministratorName,
                NormalizedName = AppRole.AdministratorName.ToUpperInvariant(),
                Description = "Administración completa de la plataforma.",
                IsSystemRole = true,
            };
            db.Roles.Add(admin);
        }

        var granted = await db.RolePermissions.Where(rp => rp.RoleId == admin.Id).Select(rp => rp.PermissionId).ToHashSetAsync(cancellationToken);
        foreach (var permission in allPermissions.Where(p => !granted.Contains(p.Id)))
        {
            db.RolePermissions.Add(new RolePermission { RoleId = admin.Id, PermissionId = permission.Id });
        }

        var byCode = allPermissions.ToDictionary(p => p.Code, StringComparer.Ordinal);
        var suggested = catalog.Modules.SelectMany(m => m.SuggestedRoles)
            .GroupBy(r => r.Name.Trim().ToUpperInvariant())
            .Where(g => g.Key != admin.NormalizedName);
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
        logger.LogInformation(IdentityEventIds.CatalogSynced, "Catálogo sincronizado: {ModuleCount} grupo(s), {PermissionCount} permiso(s), {ChangeCount} cambio(s)", modules.Count, allPermissions.Count, changes);
    }
}
