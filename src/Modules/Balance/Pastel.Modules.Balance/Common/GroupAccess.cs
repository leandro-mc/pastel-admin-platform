using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Common;

/// <summary>Grupo cargado para la persona que actúa: su pertenencia, el estado para la política y los participantes en orden de alta.</summary>
internal sealed record GroupContext(
    BalanceGroup Group, Participant Me, Currency Currency, GroupState State, IReadOnlyList<Participant> Members)
{
    public bool IsAdmin => Me.Role == ParticipantRoles.Admin;
}

/// <summary>
/// Puerta de entrada a un grupo. <b>Quien no es miembro recibe «no encontrado»</b> (404), igual que si el grupo no existiera, para no
/// revelar qué grupos hay. La autorización de cada acción se evalúa con <see cref="GroupPolicy"/> y siempre en el servidor.
/// </summary>
internal sealed class GroupAccess(BalanceDbContext db, ICurrentUser currentUser)
{
    public Guid AccountId => currentUser.UserId ?? throw new InvalidOperationException("La acción exige una sesión válida.");

    /// <summary>Nombre visible de la cuenta, tomado de la sesión (se guarda como instantánea en el grupo).</summary>
    public string DisplayName =>
        string.IsNullOrWhiteSpace(currentUser.DisplayName) ? "Persona sin nombre" : Parsing.Truncate(currentUser.DisplayName.Trim(), 100);

    public async Task<Result<GroupContext>> LoadAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await db.Groups.SingleOrDefaultAsync(g => g.Id == groupId, cancellationToken);
        if (group is null)
        {
            return BalanceErrors.GroupNotFound;
        }

        var members = await db.Participants.Where(p => p.GroupId == groupId)
            .OrderBy(p => p.JoinOrder).ThenBy(p => p.Id).ToListAsync(cancellationToken);
        var accountId = AccountId;
        var me = members.FirstOrDefault(p => p.AccountId == accountId);
        if (me is null)
        {
            return BalanceErrors.GroupNotFound;
        }

        var counts = await db.Expenses.Where(e => e.GroupId == groupId)
            .GroupBy(e => e.PayerParticipantId)
            .Select(g => new { PayerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PayerId, x => x.Count, cancellationToken);
        var state = new GroupState(
            group.ClosedAt is not null,
            counts.Values.Sum(),
            [.. members.Select(m => new MemberState(m.Id, ParticipantRoles.ToRole(m.Role), counts.GetValueOrDefault(m.Id)))]);
        return new GroupContext(group, me, CurrencyCatalog.Get(group.CurrencyCode), state, members);
    }

    /// <summary>Carga el grupo y exige que la acción esté permitida; devuelve el contexto o el error (404 / 403 / 409).</summary>
    public async Task<Result<GroupContext>> LoadAuthorizedAsync(
        Guid groupId, GroupAction action, CancellationToken cancellationToken, ActionTarget? target = null)
    {
        var loaded = await LoadAsync(groupId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded;
        }

        return GroupPolicy.Check(action, loaded.Value.State, loaded.Value.Me.Id, target) is { } denied ? denied : loaded;
    }
}
