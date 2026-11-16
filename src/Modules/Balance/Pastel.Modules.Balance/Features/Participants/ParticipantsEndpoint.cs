using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Participants;

internal sealed record SetRoleRequest(string? Role);

/// <summary>
/// Personas del grupo y su enlace de ingreso. El enlace y el código los ve y regenera solo quien administra; quien no es miembro
/// recibe 404. Escribir exige <c>balance.groups.manage</c>.
/// </summary>
internal static class ParticipantsEndpoint
{
    public static void Map(IEndpointRouteBuilder api)
    {
        var group = api.MapGroup("/groups/{groupId:guid}");

        group.MapGet("/participants", async (Guid groupId, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.ListAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        group.MapPut("/participants/{participantId:guid}/role", async (Guid groupId, Guid participantId, SetRoleRequest request, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SetRoleAsync(groupId, participantId, request, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        group.MapDelete("/participants/{participantId:guid}", async (Guid groupId, Guid participantId, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.RemoveAsync(groupId, participantId, ct)).ToNoContent(http)).RequirePermission(BalancePermissions.GroupsManage);

        group.MapPost("/leave", async (Guid groupId, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.LeaveAsync(groupId, ct)).ToNoContent(http)).RequirePermission(BalancePermissions.GroupsManage);

        group.MapGet("/invitation", async (Guid groupId, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.GetInvitationAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        group.MapPost("/invitation/regenerate", async (Guid groupId, ParticipantsHandler h, HttpContext http, CancellationToken ct) =>
            (await h.RegenerateInvitationAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);
    }
}
