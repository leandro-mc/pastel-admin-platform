using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Balance.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar migraciones sin ejecutar el host. Las genera Build con
/// <c>dotnet ef migrations add InitialSchema --project src/Modules/Balance/Pastel.Modules.Balance --startup-project src/Modules/Balance/Pastel.Modules.Balance --context BalanceDbContext --output-dir Persistence/Migrations</c>.
/// </summary>
internal sealed class BalanceDbContextFactory : IDesignTimeDbContextFactory<BalanceDbContext>
{
    public BalanceDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<BalanceDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", BalanceDbContext.Schema))
            .Options;

        return new BalanceDbContext(options);
    }
}
