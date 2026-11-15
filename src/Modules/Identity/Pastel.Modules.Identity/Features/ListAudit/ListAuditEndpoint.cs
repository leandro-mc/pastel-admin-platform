using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ListAudit;

/// <summary>
/// Filtros de <c>GET /api/admin/audit</c>: <c>Action</c> y <c>Actor</c> (correo) por coincidencia parcial, <c>Module</c> exacto,
/// <c>TargetUserId</c>, y rango <c>From</c>/<c>To</c> (inclusivo) sobre la fecha del evento.
/// </summary>
internal sealed record ListAuditQuery(
    int? Page, int? PageSize, string? Action, string? Module, string? Actor, Guid? TargetUserId, DateTimeOffset? From, DateTimeOffset? To);

/// <summary><c>GET /api/admin/audit</c>: <c>{ items, page, pageSize, totalCount }</c>, más recientes primero, paginado y filtrado en el servidor.</summary>
internal static class ListAuditEndpoint
{
    public static void Map(IEndpointRouteBuilder audit) =>
        audit.MapGet("/", HandleAsync).RequirePermission(IdentityPermissions.AuditRead);

    private static async Task<IResult> HandleAsync(
        [AsParameters] ListAuditQuery query, ListAuditHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(query, cancellationToken)).ToResponse(http);
}
