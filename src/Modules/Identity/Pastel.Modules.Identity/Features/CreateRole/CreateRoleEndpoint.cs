using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.CreateRole;

internal sealed record CreateRoleRequest(string? Name, string? Description, Guid[]? PermissionIds);

/// <summary><c>POST /api/admin/roles</c>: crea un rol con los permisos indicados. Responde 201 con el rol.</summary>
internal static class CreateRoleEndpoint
{
    public static void Map(IEndpointRouteBuilder roles) =>
        roles.MapPost("/", HandleAsync).RequirePermission(IdentityPermissions.RolesCreate);

    private static async Task<IResult> HandleAsync(
        CreateRoleRequest request, CreateRoleHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(request, cancellationToken)).ToResponse(http, StatusCodes.Status201Created);
}
