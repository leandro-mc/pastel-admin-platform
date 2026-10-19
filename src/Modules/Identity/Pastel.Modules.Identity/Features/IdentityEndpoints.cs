using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Features.GetCsrfToken;
using Pastel.Modules.Identity.Features.Login;
using Pastel.Modules.Identity.Features.Register;
using Pastel.Modules.Identity.Security;

namespace Pastel.Modules.Identity.Features;

/// <summary>
/// Punto único donde se enlazan los slices de <c>Features/</c> con las rutas <c>/api/auth/*</c> y <c>/api/admin/*</c>.
/// Cada slice expone <c>Map(IEndpointRouteBuilder)</c> y su manejador se registra en <see cref="AddIdentityFeatures"/>.
/// </summary>
internal static class IdentityEndpoints
{
    public static IServiceCollection AddIdentityFeatures(this IServiceCollection services)
    {
        services.AddSingleton<SessionCookies>();
        services.AddScoped<SessionIssuer>();
        services.AddScoped<LoginHandler>();
        services.AddScoped<RegisterHandler>();
        return services;
    }

    public static void Map(IEndpointRouteBuilder apiRoot)
    {
        var auth = apiRoot.MapGroup("/auth");
        GetCsrfTokenEndpoint.Map(auth);
        LoginEndpoint.Map(auth);
        RegisterEndpoint.Map(auth);
    }
}
