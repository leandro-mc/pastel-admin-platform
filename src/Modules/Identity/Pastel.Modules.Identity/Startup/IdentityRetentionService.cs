using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Startup;

/// <summary>
/// Limpieza periódica: borra refresh tokens expirados hace más del plazo configurado, elimina ciphertexts de gracia vencida
/// y aplica la retención de auditoría. Se ejecuta después de que el host haya inicializado y migrado los módulos.
/// </summary>
internal sealed class IdentityRetentionService(
    IServiceScopeFactory scopeFactory,
    IOptions<IdentityRetentionOptions> options,
    IClock clock,
    ILogger<IdentityRetentionService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupSafelyAsync(stoppingToken);

        var hours = Math.Clamp(options.Value.CleanupIntervalHours, 1, 168);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(hours));
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
            var expiredRefreshCutoff = now.AddDays(-options.Value.ExpiredRefreshTokenDays);
            var auditCutoff = now.AddDays(-options.Value.AuditLogRetentionDays);

            var clearedGraceSecrets = await db.RefreshTokens
                .Where(x => x.GraceUntil != null && x.GraceUntil <= now && x.ReplacedByEncryptedToken != null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.ReplacedByEncryptedToken, (string?)null), cancellationToken);

            var deletedTokens = await db.RefreshTokens
                .Where(x => x.ExpiresAt < expiredRefreshCutoff)
                .ExecuteDeleteAsync(cancellationToken);

            var deletedAuditRecords = await db.AuditLogs
                .Where(x => x.CreatedAt < auditCutoff)
                .ExecuteDeleteAsync(cancellationToken);

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
