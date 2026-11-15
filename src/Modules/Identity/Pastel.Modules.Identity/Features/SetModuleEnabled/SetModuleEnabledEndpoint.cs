using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.SetModuleEnabled;

internal sealed record SetModuleEnabledRequest(bool IsEnabled);

/// <summary><c>PATCH /api/admin/modules/{moduleId}</c>: activa o desactiva un módulo (204). El módulo <c>settings</c> no se desactiva.</summary>
internal static class SetModuleEnabledEndpoint
{
    private const string SettingsCode = "settings";

    public static void Map(IEndpointRouteBuilder modules) =>
        modules.MapPatch("/{moduleId:guid}", HandleAsync).RequirePermission(IdentityPermissions.ModulesManage);

    private static async Task<IResult> HandleAsync(
        Guid moduleId, SetModuleEnabledRequest request, IdentityDbContext db, IAuditTrail audit, ICurrentUser currentUser,
        HttpContext http, CancellationToken cancellationToken)
    {
        var module = await db.Modules.SingleOrDefaultAsync(x => x.Id == moduleId, cancellationToken);
        if (module is null)
        {
            return Pastel.Platform.Errors.PastelProblem.From(IdentityErrors.ModuleNotFound, http);
        }

        if (module.Code == SettingsCode && !request.IsEnabled)
        {
            return Pastel.Platform.Errors.PastelProblem.From(IdentityErrors.SettingsModuleLocked, http);
        }

        if (module.IsEnabled != request.IsEnabled)
        {
            audit.Add(new AuditRecord(
                request.IsEnabled ? "admin.module.enabled" : "admin.module.disabled", "identity", currentUser.UserId, null, module.Code,
                Before: new { isEnabled = module.IsEnabled }, After: new { isEnabled = request.IsEnabled }));
            module.IsEnabled = request.IsEnabled;
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.NoContent();
    }
}
