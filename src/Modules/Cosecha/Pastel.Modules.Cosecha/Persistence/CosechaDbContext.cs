using Microsoft.EntityFrameworkCore;

namespace Pastel.Modules.Cosecha.Persistence;

/// <summary>Contexto de Cosecha. Esquema <c>cosecha</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class CosechaDbContext(DbContextOptions<CosechaDbContext> options) : DbContext(options)
{
    public const string Schema = "cosecha";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);
    }
}
