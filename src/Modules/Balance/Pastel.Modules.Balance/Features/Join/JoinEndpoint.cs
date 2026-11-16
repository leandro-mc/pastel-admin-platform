using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Join;

internal sealed record JoinRequest(string? Token, string? Code);

internal sealed record JoinedGroupDto(Guid GroupId);

/// <summary>
/// <c>POST /api/balance/join</c>. El token viaja en el cuerpo (el enlace lo lleva en el fragmento <c>#</c>, que nunca llega al servidor ni a
/// sus logs). Límite por IP de la plataforma más el límite por cuenta y enlace de <c>JoinAttemptLimiter</c>.
/// </summary>
internal static class JoinEndpoint
{
    public static void Map(IEndpointRouteBuilder api) =>
        api.MapPost("/join", async (JoinRequest request, JoinHandler h, HttpContext http, CancellationToken ct) =>
                (await h.JoinAsync(request, ct)).ToResponse(http))
            .RequirePermission(BalancePermissions.Access)
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);
}
