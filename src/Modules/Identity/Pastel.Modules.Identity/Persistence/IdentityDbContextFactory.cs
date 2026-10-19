using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Identity.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar y aplicar migraciones sin ejecutar el host. Las migraciones las genera Build con
/// <c>dotnet ef migrations add … --project src/Modules/Identity/Pastel.Modules.Identity --startup-project src/Modules/Identity/Pastel.Modules.Identity</c>.
/// </summary>
internal sealed class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    public IdentityDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", IdentityDbContext.Schema))
            .Options;

        return new IdentityDbContext(options);
    }
}
