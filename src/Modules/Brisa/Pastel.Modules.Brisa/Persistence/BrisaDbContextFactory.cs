using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Brisa.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar migraciones sin ejecutar el host. Las genera Build con
/// <c>dotnet ef migrations add InitialSchema --project src/Modules/Brisa/Pastel.Modules.Brisa --startup-project src/Modules/Brisa/Pastel.Modules.Brisa --context BrisaDbContext --output-dir Persistence/Migrations</c>.
/// </summary>
internal sealed class BrisaDbContextFactory : IDesignTimeDbContextFactory<BrisaDbContext>
{
    public BrisaDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<BrisaDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", BrisaDbContext.Schema))
            .Options;

        return new BrisaDbContext(options);
    }
}
