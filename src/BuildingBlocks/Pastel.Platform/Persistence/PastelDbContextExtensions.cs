using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Pastel.Platform.Persistence;

public static class PastelDbContextExtensions
{
    /// <summary>Registra el <c>DbContext</c> de un módulo con su esquema y su historial de migraciones propios.</summary>
    public static IServiceCollection AddPastelDbContext<TContext>(this IServiceCollection services, IConfiguration configuration, string schema)
        where TContext : DbContext
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Falta ConnectionStrings:Default.");
        services.AddDbContext<TContext>(options => options.UseNpgsql(
            connectionString,
            npgsql => npgsql
                .MigrationsHistoryTable("__EFMigrationsHistory", schema)
                .MigrationsAssembly(typeof(TContext).Assembly.GetName().Name)));
        return services;
    }

    /// <summary>Aplica las migraciones del módulo. Falla con un mensaje claro si el ensamblado no trae ninguna.</summary>
    public static async Task MigrateModuleAsync<TContext>(IServiceProvider services, CancellationToken cancellationToken)
        where TContext : DbContext
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TContext>();
        if (!db.Database.GetMigrations().Any())
        {
            throw new InvalidOperationException(
                $"No se encontraron migraciones de EF Core para {typeof(TContext).Name} en {typeof(TContext).Assembly.GetName().Name}.");
        }

        await db.Database.MigrateAsync(cancellationToken);
    }

    public static async Task<bool> HasPendingMigrationsAsync<TContext>(IServiceProvider services, CancellationToken cancellationToken)
        where TContext : DbContext
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TContext>();
        return (await db.Database.GetPendingMigrationsAsync(cancellationToken)).Any();
    }
}

/// <summary>Ejecuta una unidad de trabajo en transacción serializable con reintento acotado ante 40001 y 40P01.</summary>
public static class TransactionRunner
{
    public static async Task<T> RunSerializableAsync<T>(
        DbContext db,
        Func<CancellationToken, Task<T>> work,
        CancellationToken cancellationToken,
        int maxAttempts = 3)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
                var result = await work(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch (Exception ex) when (IsSerializationConflict(ex) && attempt < maxAttempts)
            {
                db.ChangeTracker.Clear();
            }

            var delay = (25 * Math.Pow(2, attempt)) + Random.Shared.Next(0, 25);
            await Task.Delay(TimeSpan.FromMilliseconds(delay), cancellationToken);
        }
    }

    public static bool IsSerializationConflict(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected })
            {
                return true;
            }
        }

        return false;
    }
}
