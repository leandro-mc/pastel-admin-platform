using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Cosecha.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar migraciones sin ejecutar el host. Las genera Build con
/// <c>dotnet ef migrations add InitialSchema --project src/Modules/Cosecha/Pastel.Modules.Cosecha --startup-project src/Modules/Cosecha/Pastel.Modules.Cosecha --context CosechaDbContext --output-dir Persistence/Migrations</c>.
/// </summary>
internal sealed class CosechaDbContextFactory : IDesignTimeDbContextFactory<CosechaDbContext>
{
    public CosechaDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<CosechaDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", CosechaDbContext.Schema))
            .Options;

        return new CosechaDbContext(options);
    }
}
