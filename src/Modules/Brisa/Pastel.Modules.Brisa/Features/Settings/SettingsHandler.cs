using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.Settings;

/// <summary>Ajustes de la persona y su «hoy» actual. Cambiar la zona solo cambia «hoy»: no hay nada que reescribir (§13.3).</summary>
internal sealed record SettingsResponse(string TimeZoneId, string Today);

internal sealed record UpdateSettingsRequest(string? TimeZoneId);

internal sealed class SettingsHandler(BrisaDbContext db, PersonContext people, ICurrentUser currentUser, IClock clock)
{
    public async Task<Result<SettingsResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        return person.Map(p => new SettingsResponse(p.TimeZoneId, TaskRules.FormatDate(p.Today)));
    }

    public async Task<Result<SettingsResponse>> UpdateAsync(UpdateSettingsRequest request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return PlatformErrors.Unauthorized;
        }

        var id = request.TimeZoneId?.Trim();
        if (!TaskRules.TryResolveZone(id, out var zone))
        {
            return BrisaErrors.TimeZoneInvalid;
        }

        var settings = await db.Settings.FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);
        var now = clock.UtcNow;
        if (settings is null)
        {
            db.Settings.Add(new BrisaSettings { UserId = userId, TimeZoneId = id!, UpdatedAt = now });
        }
        else
        {
            settings.TimeZoneId = id!;
            settings.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new SettingsResponse(id!, TaskRules.FormatDate(TaskRules.LocalDate(now, zone)));
    }
}
