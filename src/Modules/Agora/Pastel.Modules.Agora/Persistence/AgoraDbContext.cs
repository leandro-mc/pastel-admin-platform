using Microsoft.EntityFrameworkCore;

namespace Pastel.Modules.Agora.Persistence;

/// <summary>Contexto de Ágora. Esquema <c>agora</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class AgoraDbContext(DbContextOptions<AgoraDbContext> options) : DbContext(options)
{
    public const string Schema = "agora";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);
    }
}
