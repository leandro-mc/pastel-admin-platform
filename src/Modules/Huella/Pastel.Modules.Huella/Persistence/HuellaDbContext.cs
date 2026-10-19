using Microsoft.EntityFrameworkCore;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>Contexto de Huella. Esquema <c>huella</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class HuellaDbContext(DbContextOptions<HuellaDbContext> options) : DbContext(options)
{
    public const string Schema = "huella";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);
    }
}
