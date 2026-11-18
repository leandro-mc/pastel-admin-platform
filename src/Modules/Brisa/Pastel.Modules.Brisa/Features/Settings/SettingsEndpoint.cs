using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.Settings;

/// <summary><c>GET</c> y <c>PUT /api/brisa/settings</c>: zona horaria de la persona y su «hoy» actual en esa zona.</summary>
internal static class SettingsEndpoint
{
    public static void Map(IEndpointRouteBuilder settings)
    {
        settings.MapGet("/", GetAsync).RequirePermission(BrisaPermissions.Access);
        settings.MapPut("/", UpdateAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);
    }

    private static async Task<IResult> GetAsync(SettingsHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.GetAsync(cancellationToken)).ToResponse(http);

    private static async Task<IResult> UpdateAsync(
        UpdateSettingsRequest request, SettingsHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.UpdateAsync(request, cancellationToken)).ToResponse(http);
}
