using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Common;

/// <summary>La persona de la petición, con su zona horaria y su «hoy» (nunca el de la zona del servidor).</summary>
internal sealed record Person(Guid UserId, string TimeZoneId, TimeZoneInfo Zone, DateOnly Today);

/// <summary>Resuelve quién hace la petición y cuál es su «hoy». Una sola lectura de ajustes por petición.</summary>
internal sealed class PersonContext(BrisaDbContext db, ICurrentUser currentUser, IClock clock)
{
    private Person? _cached;

    public async Task<Result<Person>> GetAsync(CancellationToken cancellationToken)
    {
        if (_cached is not null)
        {
            return _cached;
        }

        if (currentUser.UserId is not { } userId)
        {
            return PlatformErrors.Unauthorized;
        }

        var stored = await db.Settings.AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => s.TimeZoneId)
            .FirstOrDefaultAsync(cancellationToken);

        var (zoneId, zone) = ResolveZone(stored);
        _cached = new Person(userId, zoneId, zone, TaskRules.LocalDate(clock.UtcNow, zone));
        return _cached;
    }

    /// <summary>Zona guardada; si ya no se reconoce, la de Costa Rica; en último caso UTC. Nunca falla.</summary>
    public static (string Id, TimeZoneInfo Zone) ResolveZone(string? stored)
    {
        if (TaskRules.TryResolveZone(stored, out var own))
        {
            return (stored!, own);
        }

        if (TaskRules.TryResolveZone(TaskRules.DefaultTimeZoneId, out var fallback))
        {
            return (TaskRules.DefaultTimeZoneId, fallback);
        }

        return ("UTC", TimeZoneInfo.Utc);
    }
}
