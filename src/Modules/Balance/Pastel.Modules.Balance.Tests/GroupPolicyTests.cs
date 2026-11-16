using Pastel.Modules.Balance.Domain;
using Pastel.SharedKernel;
using Xunit;

namespace Pastel.Modules.Balance.Tests;

/// <summary>Autorización por rol dentro del grupo (<c>ROLES-Y-PERMISOS.md</c> §3 y §4): se decide siempre en el servidor.</summary>
public sealed class GroupPolicyTests
{
    private static readonly Guid Admin = new(1, 0, 0, new byte[8]);
    private static readonly Guid Ana = new(2, 0, 0, new byte[8]);
    private static readonly Guid Beto = new(3, 0, 0, new byte[8]);
    private static readonly Guid Outsider = new(9, 0, 0, new byte[8]);

    private static GroupState State(bool closed = false, int adminExpenses = 0, int anaExpenses = 0) => new(
        closed,
        adminExpenses + anaExpenses,
        [
            new MemberState(Admin, ParticipantRole.Admin, adminExpenses),
            new MemberState(Ana, ParticipantRole.Member, anaExpenses),
            new MemberState(Beto, ParticipantRole.Member, 0),
        ]);

    [Fact]
    public void QuienNoEsMiembroRecibeNoEncontrado() =>
        Assert.Equal(ErrorType.NotFound, GroupPolicy.Check(GroupAction.View, State(), Outsider)!.Type);

    [Theory]
    [InlineData("ViewHistory")]
    [InlineData("ViewInvitation")]
    [InlineData("RegenerateInvitation")]
    [InlineData("EditSettings")]
    [InlineData("ChangeCurrency")]
    [InlineData("CloseGroup")]
    [InlineData("DeleteGroup")]
    [InlineData("ChangePayer")]
    public void UnMiembroNoPuedeHacerLoReservadoAAdministracion(string actionName)
    {
        var error = GroupPolicy.Check(Enum.Parse<GroupAction>(actionName), State(), Ana)!;
        Assert.Equal(ErrorType.Forbidden, error.Type);
        Assert.Equal("balance.forbidden", error.Code);
    }

    [Fact]
    public void UnMiembroSoloRegistraGastosPagadosPorEl()
    {
        Assert.Null(GroupPolicy.Check(GroupAction.AddExpense, State(), Ana, new ActionTarget(PayerId: Ana)));
        Assert.Equal(ErrorType.Forbidden, GroupPolicy.Check(GroupAction.AddExpense, State(), Ana, new ActionTarget(PayerId: Beto))!.Type);
        Assert.Null(GroupPolicy.Check(GroupAction.AddExpense, State(), Admin, new ActionTarget(PayerId: Beto)));
    }

    [Fact]
    public void UnMiembroSoloModificaOEliminaSusGastos()
    {
        foreach (var action in new[] { GroupAction.EditExpense, GroupAction.DeleteExpense })
        {
            Assert.Null(GroupPolicy.Check(action, State(), Ana, new ActionTarget(ExpensePayerId: Ana)));
            Assert.Equal(ErrorType.Forbidden, GroupPolicy.Check(action, State(), Ana, new ActionTarget(ExpensePayerId: Beto))!.Type);
            Assert.Null(GroupPolicy.Check(action, State(), Admin, new ActionTarget(ExpensePayerId: Beto)));
        }
    }

    [Fact]
    public void GrupoCerradoRechazaEscriturasTambienAAdministracion_ReabrirSiSePermite()
    {
        var closed = State(closed: true);
        Assert.Equal("balance.group.closed", GroupPolicy.Check(GroupAction.AddExpense, closed, Admin, new ActionTarget(PayerId: Admin))!.Code);
        Assert.Equal("balance.group.already_closed", GroupPolicy.Check(GroupAction.CloseGroup, closed, Admin)!.Code);
        Assert.Null(GroupPolicy.Check(GroupAction.View, closed, Ana));
        Assert.Null(GroupPolicy.Check(GroupAction.ReopenGroup, closed, Admin));
        Assert.Equal("balance.group.not_closed", GroupPolicy.Check(GroupAction.ReopenGroup, State(), Admin)!.Code);
    }

    [Fact]
    public void ElGrupoSiempreConservaUnaPersonaAdministradora()
    {
        Assert.Equal("balance.group.last_admin", GroupPolicy.Check(GroupAction.ManageAdmins, State(), Admin, new ActionTarget(ParticipantId: Admin, Demoting: true))!.Code);
        Assert.Equal("balance.group.last_admin", GroupPolicy.Check(GroupAction.LeaveGroup, State(), Admin)!.Code);
        Assert.Null(GroupPolicy.Check(GroupAction.ManageAdmins, State(), Admin, new ActionTarget(ParticipantId: Ana)));
    }

    [Fact]
    public void QuienPagoGastosNoSePuedeQuitarNiSalir_ElGrupoConGastosNoSeBorra()
    {
        var state = State(anaExpenses: 2);
        Assert.Equal("balance.participant.has_expenses", GroupPolicy.Check(GroupAction.RemoveParticipant, state, Admin, new ActionTarget(ParticipantId: Ana))!.Code);
        Assert.Equal("balance.participant.has_expenses", GroupPolicy.Check(GroupAction.LeaveGroup, state, Ana)!.Code);
        Assert.Equal("balance.group.has_expenses", GroupPolicy.Check(GroupAction.DeleteGroup, state, Admin)!.Code);
        Assert.Null(GroupPolicy.Check(GroupAction.RemoveParticipant, state, Admin, new ActionTarget(ParticipantId: Beto)));
    }

    [Fact]
    public void HojaDeGastos_UnBorradorConAlgoNoPermitidoNoGuardaNada()
    {
        var mine = new ExpenseSnapshot(Guid.NewGuid(), Ana, "Almuerzo", 1000, new DateOnly(2026, 10, 1));
        var theirs = new ExpenseSnapshot(Guid.NewGuid(), Beto, "Taxi", 500, new DateOnly(2026, 10, 2));
        var existing = new[] { mine, theirs };

        var editMine = new SheetRow(mine.Id, Ana, "Almuerzo grande", 1200, mine.Date);
        Assert.Null(GroupPolicy.CheckSheet(State(), Ana, existing, [editMine]));
        Assert.Equal(ErrorType.Forbidden, GroupPolicy.CheckSheet(State(), Ana, existing, [editMine, new SheetRow(theirs.Id, Beto, "Taxi caro", 900, theirs.Date)])!.Type);
        Assert.Equal(ErrorType.Forbidden, GroupPolicy.CheckSheet(State(), Ana, existing, [new SheetRow(mine.Id, Beto, "Almuerzo", 1000, mine.Date)])!.Type);
        Assert.Equal(ErrorType.Forbidden, GroupPolicy.CheckSheet(State(), Ana, existing, [new SheetRow(null, Beto, "Cena", 700, mine.Date)])!.Type);
        Assert.Null(GroupPolicy.CheckSheet(State(), Admin, existing, [new SheetRow(null, Beto, "Cena", 700, mine.Date)]));
    }
}
