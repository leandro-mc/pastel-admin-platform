using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Pastel.Modules.Identity.Features;

/// <summary>
/// Punto único donde se enlazan los slices de <c>Features/</c> con las rutas <c>/api/auth/*</c> y <c>/api/admin/*</c>.
/// Cada slice expone <c>Map(IEndpointRouteBuilder)</c> y, si lo necesita, <c>Add(IServiceCollection)</c>.
/// </summary>
internal static class IdentityEndpoints
{
    public static IServiceCollection AddIdentityFeatures(this IServiceCollection services) => services;

    public static void Map(IEndpointRouteBuilder apiRoot)
    {
        // Los slices se agregan por checkpoint (ver docs/phase0/PROGRESS.md, bitácora S4).
    }
}
