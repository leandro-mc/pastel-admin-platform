using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Agora.Features.Editorial;
using Pastel.Modules.Agora.Features.Interaction;
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
        SavedAndFollowEndpoints.Map(api);
        ReactionAndReportEndpoints.Map(api);

        var editorial = api.MapGroup("/editorial");
        ArticleEditorialEndpoints.Map(editorial);
        DailyPicksEndpoints.Map(editorial);
        TaxonomyEditorialEndpoints.Map(editorial);
        NewsEditorialEndpoints.Map(editorial);
        ErrorReportsEditorialEndpoints.Map(editorial);
    }
}
