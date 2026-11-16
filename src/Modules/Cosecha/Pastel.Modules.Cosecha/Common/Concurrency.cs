using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Common;

internal static class Concurrency
{
    /// <summary>
    /// Indica que la persona editó la versión <paramref name="version"/> del registro. Si otra edición lo cambió antes,
    /// <c>SaveChangesAsync</c> lanza <c>DbUpdateConcurrencyException</c> y el host responde 409 con un mensaje claro.
    /// </summary>
    public static void Expect(this CosechaDbContext db, IAudited entity, uint version) =>
        db.Entry(entity).Property(nameof(IAudited.Version)).OriginalValue = version;
}
