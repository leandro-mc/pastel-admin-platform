using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.CreateUser;

internal sealed record CreateUserRequest(string? Email, string? DisplayName, string? TemporaryPassword, Guid[]? RoleIds);

/// <summary><c>POST /api/admin/users</c>: crea una cuenta con contraseña temporal (debe cambiarla al ingresar). Responde 201.</summary>
internal static class CreateUserEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPost("/", HandleAsync).RequirePermission(IdentityPermissions.UsersCreate);

    private static async Task<IResult> HandleAsync(
        CreateUserRequest request, CreateUserHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(request, cancellationToken)).ToResponse(http, StatusCodes.Status201Created);
}
