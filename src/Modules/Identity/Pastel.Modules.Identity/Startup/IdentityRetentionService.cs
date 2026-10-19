using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Startup;

/// <summary>
/// Limpieza de ciphertexts de gracia cada 30 segundos y limpieza periódica de refresh tokens y auditoría
/// según el intervalo configurado. Se ejecuta después de que el host inicialice y migre los módulos.
/// </summary>
internal sealed class IdentityRetentionService(
    IServiceScopeFactory scopeFactory,
    IOptions<IdentityRetentionOptions> options,
    IClock clock,
    ILogger<IdentityRetentionService> logger) : BackgroundService
{
    private DateTimeOffset? _lastRetentionCleanup;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupSafelyAsync(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupSafelyAsync(stoppingToken);
        }
    }

    private async Task CleanupSafelyAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var now = clock.UtcNow;

            // La copia cifrada del refresh sucesor solo es útil durante la ventana de gracia, que es como máximo 60 s.
            var clearedGraceSecrets = await db.RefreshTokens
                .Where(x => x.GraceUntil != null && x.GraceUntil <= now && x.ReplacedByEncryptedToken != null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.ReplacedByEncryptedToken, (string?)null), cancellationToken);

            var interval = TimeSpan.FromHours(Math.Clamp(options.Value.CleanupIntervalHours, 1, 168));
            var retentionDue = _lastRetentionCleanup is null || now - _lastRetentionCleanup.Value >= interval;
            var deletedTokens = 0;
            var deletedAuditRecords = 0;
            if (retentionDue)
            {
                var expiredRefreshCutoff = now.AddDays(-options.Value.ExpiredRefreshTokenDays);
                var auditCutoff = now.AddDays(-options.Value.AuditLogRetentionDays);
                deletedTokens = await db.RefreshTokens
                    .Where(x => x.ExpiresAt < expiredRefreshCutoff)
                    .ExecuteDeleteAsync(cancellationToken);
                deletedAuditRecords = await db.AuditLogs
                    .Where(x => x.CreatedAt < auditCutoff)
                    .ExecuteDeleteAsync(cancellationToken);
                _lastRetentionCleanup = now;
            }

            if (clearedGraceSecrets > 0 || deletedTokens > 0 || deletedAuditRecords > 0)
            {
                logger.LogInformation(
                    "Limpieza de Identity: secretos de gracia borrados {GraceSecrets}, refresh tokens eliminados {RefreshTokens}, auditorías eliminadas {AuditRecords}",
                    clearedGraceSecrets, deletedTokens, deletedAuditRecords);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cierre normal del host.
        }
        catch (Exception ex)
        {
            // La tarea periódica no debe tumbar el host; deja una señal observable y reintenta en el siguiente intervalo.
            logger.LogError(ex, "Falló la limpieza periódica de datos de Identity");
        }
    }
}
