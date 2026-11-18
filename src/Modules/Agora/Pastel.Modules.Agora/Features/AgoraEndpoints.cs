using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Features.Share;

namespace Pastel.Modules.Agora.Features;

/// <summary>Registra todas las rutas de <c>/api/agora</c>. Cada bloque funcional agrega aquí su grupo.</summary>
internal static class AgoraEndpoints
{
    public static void Map(IEndpointRouteBuilder api)
    {
        HomeEndpoint.Map(api);
        TaxonomyEndpoint.Map(api);
        ArticlesEndpoints.Map(api);
        NewsEndpoint.Map(api);
        ShareEndpoints.Map(api);
    }
}
