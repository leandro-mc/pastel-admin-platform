using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Domain;

internal enum ParticipantRole
{
    Member,
    Admin,
}

/// <summary>Acciones sobre un grupo. La matriz completa está en <c>docs/requirements/balance/ROLES-Y-PERMISOS.md</c> §3.</summary>
internal enum GroupAction
{
    View,
    ViewHistory,
    ViewInvitation,
    RegenerateInvitation,
    ManageAdmins,
    RemoveParticipant,
    EditSettings,
    ChangeCurrency,
    CloseGroup,
    ReopenGroup,
    DeleteGroup,
    LeaveGroup,
    AddExpense,
    EditExpense,
    DeleteExpense,
    ChangePayer,
}

/// <summary>Participante tal como lo ve la política: su rol y cuántos gastos pagó.</summary>
internal sealed record MemberState(Guid Id, ParticipantRole Role, int ExpenseCount);

/// <summary>Lo mínimo del grupo que la política necesita (se arma con consultas de agregado, sin cargar los gastos).</summary>
internal sealed record GroupState(bool Closed, int ExpenseCount, IReadOnlyList<MemberState> Members)
{
    public int AdminCount => Members.Count(m => m.Role == ParticipantRole.Admin);
}

/// <param name="ParticipantId">Persona sobre la que se actúa (quitar, nombrar administrador).</param>
/// <param name="PayerId">Pagador pedido al registrar o cambiar un gasto.</param>
/// <param name="ExpensePayerId">Pagador actual del gasto que se modifica o elimina.</param>
/// <param name="Demoting">Se quita la administración (no se otorga).</param>
internal sealed record ActionTarget(Guid? ParticipantId = null, Guid? PayerId = null, Guid? ExpensePayerId = null, bool Demoting = false);

/// <summary>
/// D3 y D7 como funciones puras: quién puede hacer qué, y con qué error se le niega. Se evalúan siempre en el servidor
/// (denegar por defecto). Quien no es miembro recibe 404: el grupo «no existe» para esa persona.
/// </summary>
internal static class GroupPolicy
{
    private const string AskAdmin = "Pídalo a alguien que administre el grupo.";

    private static readonly HashSet<GroupAction> AdminOnly =
    [
        GroupAction.ViewHistory, GroupAction.ViewInvitation, GroupAction.RegenerateInvitation, GroupAction.ManageAdmins,
        GroupAction.RemoveParticipant, GroupAction.EditSettings, GroupAction.ChangeCurrency, GroupAction.CloseGroup,
        GroupAction.ReopenGroup, GroupAction.DeleteGroup, GroupAction.ChangePayer,
    ];

    /// <summary>Acciones que escriben: en un grupo cerrado responden 409, también a quien administra. Reabrir sí está permitido.</summary>
    private static readonly HashSet<GroupAction> Writes =
    [
        GroupAction.AddExpense, GroupAction.EditExpense, GroupAction.DeleteExpense, GroupAction.ChangePayer, GroupAction.EditSettings,
        GroupAction.ChangeCurrency, GroupAction.RemoveParticipant, GroupAction.ManageAdmins, GroupAction.RegenerateInvitation,
        GroupAction.LeaveGroup, GroupAction.DeleteGroup, GroupAction.CloseGroup,
    ];

    private static readonly Dictionary<GroupAction, string> Reason = new()
    {
        [GroupAction.ViewHistory] = "El historial del grupo lo consulta quien administra el grupo.",
        [GroupAction.ViewInvitation] = "El enlace y el código de ingreso los ve solo quien administra el grupo, para que no circulen sin control.",
        [GroupAction.RegenerateInvitation] = "Regenerar el enlace invalida los anteriores; lo decide quien administra el grupo.",
        [GroupAction.ManageAdmins] = "Nombrar o quitar administradores es una decisión de quienes ya administran el grupo.",
        [GroupAction.RemoveParticipant] = "Quitar participantes cambia el reparto de todos; lo hace quien administra el grupo.",
        [GroupAction.EditSettings] = "El nombre, la descripción y la zona horaria afectan a todos; los cambia quien administra el grupo.",
        [GroupAction.ChangeCurrency] = "Cambiar la moneda reexpresa todos los gastos; lo hace quien administra el grupo.",
        [GroupAction.CloseGroup] = "Cerrar o reabrir el grupo lo decide quien lo administra.",
        [GroupAction.ReopenGroup] = "Cerrar o reabrir el grupo lo decide quien lo administra.",
        [GroupAction.DeleteGroup] = "Borrar el grupo lo decide quien lo administra.",
        [GroupAction.ChangePayer] = "Solo quien administra puede registrar o cambiar un gasto a nombre de otra persona.",
    };

    /// <summary>Devuelve <c>null</c> si la acción está permitida, o el error con su motivo y a quién pedirlo.</summary>
    public static Error? Check(GroupAction action, GroupState group, Guid actorParticipantId, ActionTarget? target = null)
    {
        var me = group.Members.FirstOrDefault(m => m.Id == actorParticipantId);
        if (me is null)
        {
            return BalanceErrors.GroupNotFound;
        }

        var admin = me.Role == ParticipantRole.Admin;
        if (AdminOnly.Contains(action) && !admin)
        {
            return BalanceErrors.Forbidden(Reason[action], AskAdmin);
        }

        if (action == GroupAction.View)
        {
            return null;
        }

        if (group.Closed && action == GroupAction.CloseGroup)
        {
            return BalanceErrors.GroupAlreadyClosed;
        }

        if (group.Closed && Writes.Contains(action))
        {
            return BalanceErrors.GroupClosed;
        }

        if (!group.Closed && action == GroupAction.ReopenGroup)
        {
            return BalanceErrors.GroupNotClosed;
        }

        target ??= new ActionTarget();
        switch (action)
        {
            case GroupAction.AddExpense when !admin && target.PayerId is { } payer && payer != actorParticipantId:
                return BalanceErrors.Forbidden(
                    "Usted solo puede registrar gastos pagados por usted.",
                    "Pida a quien administra que lo registre a nombre de otra persona.");

            case GroupAction.EditExpense or GroupAction.DeleteExpense when !admin && target.ExpensePayerId != actorParticipantId:
                return BalanceErrors.Forbidden(
                    "Solo puede modificar o eliminar los gastos que usted pagó.",
                    "Pídaselo a quien lo registró o a quien administra el grupo.");

            case GroupAction.ManageAdmins:
            {
                var subject = group.Members.FirstOrDefault(m => m.Id == target.ParticipantId);
                if (subject is null)
                {
                    return BalanceErrors.ParticipantNotFound;
                }

                return target.Demoting && subject.Role == ParticipantRole.Admin && group.AdminCount <= 1 ? BalanceErrors.LastAdmin : null;
            }

            case GroupAction.RemoveParticipant:
            {
                var subject = group.Members.FirstOrDefault(m => m.Id == target.ParticipantId);
                if (subject is null)
                {
                    return BalanceErrors.ParticipantNotFound;
                }

                if (subject.ExpenseCount > 0)
                {
                    return BalanceErrors.ParticipantHasExpenses;
                }

                return subject.Role == ParticipantRole.Admin && group.AdminCount <= 1 ? BalanceErrors.LastAdmin : null;
            }

            case GroupAction.LeaveGroup:
                if (me.ExpenseCount > 0)
                {
                    return BalanceErrors.LeaveWithExpenses;
                }

                return admin && group.AdminCount <= 1 ? BalanceErrors.LastAdmin : null;

            case GroupAction.DeleteGroup:
                return group.ExpenseCount > 0 ? BalanceErrors.GroupHasExpenses : null;

            default:
                return null;
        }
    }

    /// <summary>
    /// Gestión de gastos (hoja con borrador, guardado atómico). La administración ve y edita todos los gastos; un miembro, solo los
    /// que pagó. Se revisa el borrador completo y, si incluye algo no permitido, <b>no se guarda nada</b>.
    /// </summary>
    public static Error? CheckSheet(GroupState group, Guid actorParticipantId, IReadOnlyList<ExpenseSnapshot> existing, IReadOnlyList<SheetRow> rows)
    {
        if (Check(GroupAction.View, group, actorParticipantId) is { } denied)
        {
            return denied;
        }

        var admin = group.Members.First(m => m.Id == actorParticipantId).Role == ParticipantRole.Admin;
        IReadOnlyList<ExpenseSnapshot> scope = admin ? existing : existing.Where(e => e.PayerId == actorParticipantId).ToList();
        var scopeIds = scope.Select(e => e.Id).ToHashSet();
        foreach (var row in rows)
        {
            if (row.Id is null)
            {
                if (Check(GroupAction.AddExpense, group, actorParticipantId, new ActionTarget(PayerId: row.PayerId)) is { } addDenied)
                {
                    return addDenied;
                }

                continue;
            }

            var previous = existing.FirstOrDefault(e => e.Id == row.Id);
            if (previous is null)
            {
                return BalanceErrors.ExpenseNotFound;
            }

            if (!scopeIds.Contains(previous.Id))
            {
                return BalanceErrors.Forbidden("Solo puede modificar o eliminar los gastos que usted pagó.", "Pídaselo a quien lo registró o a quien administra el grupo.");
            }

            var changed = previous.Description != row.Description || previous.Units != row.Units
                || previous.Date != row.Date || previous.PayerId != row.PayerId;
            if (changed && Check(GroupAction.EditExpense, group, actorParticipantId, new ActionTarget(ExpensePayerId: previous.PayerId)) is { } editDenied)
            {
                return editDenied;
            }

            if (previous.PayerId != row.PayerId && Check(GroupAction.ChangePayer, group, actorParticipantId) is { } payerDenied)
            {
                return payerDenied;
            }
        }

        var kept = rows.Where(r => r.Id is not null).Select(r => r.Id!.Value).ToHashSet();
        foreach (var expense in scope.Where(e => !kept.Contains(e.Id)))
        {
            if (Check(GroupAction.DeleteExpense, group, actorParticipantId, new ActionTarget(ExpensePayerId: expense.PayerId)) is { } deleteDenied)
            {
                return deleteDenied;
            }
        }

        return null;
    }
}

/// <summary>Gasto guardado, reducido a lo que la hoja compara.</summary>
internal sealed record ExpenseSnapshot(Guid Id, Guid PayerId, string Description, Int128 Units, DateOnly Date);

/// <summary>Fila final del borrador de la hoja: <see cref="Id"/> nulo es un gasto nuevo.</summary>
internal sealed record SheetRow(Guid? Id, Guid PayerId, string Description, Int128 Units, DateOnly Date);
