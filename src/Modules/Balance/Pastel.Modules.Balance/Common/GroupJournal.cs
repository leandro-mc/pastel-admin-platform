using System.Text.Json;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Common;

/// <summary>
/// Deja constancia de un cambio en dos lugares: el historial visible del grupo (<c>group_events</c>, en la <b>misma transacción</b>
/// que el cambio, así que si este falla no queda rastro) y la auditoría de plataforma, para los hechos sensibles.
/// </summary>
internal sealed class GroupJournal(BalanceDbContext db, GroupAccess access, IAuditTrail audit, IClock clock)
{
    public void Record(Guid groupId, string kind, object? details = null) =>
        db.GroupEvents.Add(new GroupEvent
        {
            GroupId = groupId,
            OccurredAt = clock.UtcNow,
            ActorAccountId = access.AccountId,
            ActorName = access.DisplayName,
            Kind = kind,
            DetailsJson = details is null ? null : JsonSerializer.Serialize(details),
        });

    /// <summary>Auditoría de plataforma, después de confirmar el cambio. Solo para hechos sensibles (ingreso, roles, cierre, borrado…).</summary>
    public Task AuditAsync(string action, Guid groupId, object? after, CancellationToken cancellationToken) =>
        audit.WriteAsync(
            new AuditRecord("balance." + action, BalancePermissions.Code, access.AccountId, Target: groupId.ToString(), After: after),
            cancellationToken);
}
