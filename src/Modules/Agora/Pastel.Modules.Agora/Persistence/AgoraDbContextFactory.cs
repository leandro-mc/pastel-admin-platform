using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pastel.Modules.Agora.Persistence;

/// <summary>
/// Permite a las herramientas de EF generar migraciones sin ejecutar el host. Las genera Build con
/// <c>dotnet ef migrations add InitialSchema --project src/Modules/Agora/Pastel.Modules.Agora --startup-project src/Modules/Agora/Pastel.Modules.Agora --context AgoraDbContext --output-dir Persistence/Migrations</c>.
/// </summary>
internal sealed class AgoraDbContextFactory : IDesignTimeDbContextFactory<AgoraDbContext>
{
    public AgoraDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? throw new InvalidOperationException("Defina ConnectionStrings__Default antes de ejecutar comandos de migración de EF.");

        var options = new DbContextOptionsBuilder<AgoraDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", AgoraDbContext.Schema))
            .Options;

        return new AgoraDbContext(options);
    }
}
