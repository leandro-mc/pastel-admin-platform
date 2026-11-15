using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.GetCsrfToken;

/// <summary><c>GET /api/auth/csrf</c>: entrega el token CSRF (cookie + cuerpo). El cliente lo reenvía en <c>X-CSRF-TOKEN</c>.</summary>
internal static class GetCsrfTokenEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapGet("/csrf", (HttpContext http, SessionCookies cookies) => Results.Ok(new { csrfToken = cookies.IssueCsrf(http.Response) }))
            .AllowAnonymousExplicit();
}
