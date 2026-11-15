using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar migraciones sin ejecutar el host. Las genera Build con
/// <c>dotnet ef migrations add InitialSchema --project src/Modules/Huella/Pastel.Modules.Huella --startup-project src/Modules/Huella/Pastel.Modules.Huella --context HuellaDbContext --output-dir Persistence/Migrations</c>.
/// </summary>
internal sealed class HuellaDbContextFactory : IDesignTimeDbContextFactory<HuellaDbContext>
{
    public HuellaDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<HuellaDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", HuellaDbContext.Schema))
            .Options;

        return new HuellaDbContext(options);
    }
}
