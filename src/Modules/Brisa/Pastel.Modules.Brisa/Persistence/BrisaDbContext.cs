using Microsoft.EntityFrameworkCore;

namespace Pastel.Modules.Brisa.Persistence;

/// <summary>Contexto de Brisa. Esquema <c>brisa</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class BrisaDbContext(DbContextOptions<BrisaDbContext> options) : DbContext(options)
{
    public const string Schema = "brisa";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);
    }
}
