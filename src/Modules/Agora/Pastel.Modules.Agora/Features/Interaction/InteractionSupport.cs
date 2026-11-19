using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;

namespace Pastel.Modules.Agora.Features.Interaction;

/// <summary>Pasos comunes de las rutas de personas registradas.</summary>
internal static class InteractionSupport
{
    /// <summary>La autorización ya garantiza una sesión; esto evita asumirlo en silencio si algún día cambia.</summary>
    public static bool TryGetUser(ICurrentUser user, HttpContext http, out Guid userId, out IResult? failure)
    {
        if (user.UserId is { } id)
        {
            userId = id;
            failure = null;
            return true;
        }

        userId = Guid.Empty;
        failure = PastelProblem.From(AgoraErrors.Unauthenticated, http);
        return false;
    }

    public static async Task<(Guid ArticleId, Guid CategoryId)?> FindPublishedAsync(
        AgoraDbContext db, string slug, CancellationToken cancellationToken)
    {
        var found = await ArticlesEndpoints.Published(db)
            .Where(a => a.Slug == slug)
            .Select(a => new { a.Id, a.CategoryId })
            .FirstOrDefaultAsync(cancellationToken);
        return found is null ? null : (found.Id, found.CategoryId);
    }

    /// <summary>Guarda cambios de una fila de clave compuesta; si otra petición la creó a la vez, el resultado deseado ya existe.</summary>
    public static async Task SaveIgnoringDuplicateAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Clave duplicada por una carrera: la fila ya existe, que era lo pedido.
        }
    }
}
