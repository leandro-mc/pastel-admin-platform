using Microsoft.EntityFrameworkCore;

namespace Pastel.Modules.Balance.Persistence;

/// <summary>Contexto de Balance. Esquema <c>balance</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class BalanceDbContext(DbContextOptions<BalanceDbContext> options) : DbContext(options)
{
    public const string Schema = "balance";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);
    }
}
