using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Groups;

internal sealed record CreateGroupRequest(string? Name, string? Description, string? CurrencyCode, string? StartDate, string? TimeZone);

internal sealed record UpdateGroupRequest(string? Name, string? Description, string? TimeZone, uint Version);

internal sealed record ChangeCurrencyRequest(string? CurrencyCode);

/// <summary>
/// <c>/api/balance/groups</c>. Leer exige <c>balance.access</c> y escribir <c>balance.groups.manage</c>; además, cada acción sobre un grupo
/// se autoriza con el rol de la persona <b>dentro</b> del grupo (<c>GroupPolicy</c>). Quien no es miembro recibe 404.
/// </summary>
internal static class GroupsEndpoint
{
    public static void Map(IEndpointRouteBuilder api)
    {
        var groups = api.MapGroup("/groups");

        groups.MapGet("", async (int? page, int? pageSize, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.ListAsync(page ?? 1, pageSize ?? 50, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        groups.MapPost("", async (CreateGroupRequest request, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapGet("/{groupId:guid}", async (Guid groupId, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.GetAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        groups.MapPatch("/{groupId:guid}", async (Guid groupId, UpdateGroupRequest request, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.UpdateAsync(groupId, request, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapPut("/{groupId:guid}/currency", async (Guid groupId, ChangeCurrencyRequest request, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.ChangeCurrencyAsync(groupId, request, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapPost("/{groupId:guid}/close", async (Guid groupId, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SetClosedAsync(groupId, true, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapPost("/{groupId:guid}/reopen", async (Guid groupId, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SetClosedAsync(groupId, false, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapDelete("/{groupId:guid}", async (Guid groupId, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.DeleteAsync(groupId, ct)).ToNoContent(http)).RequirePermission(BalancePermissions.GroupsManage);

        groups.MapGet("/{groupId:guid}/history", async (Guid groupId, int? page, int? pageSize, GroupsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.HistoryAsync(groupId, page ?? 1, pageSize ?? 50, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);
    }
}
