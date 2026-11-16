using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Features.Participants;

internal sealed class ParticipantsHandler(BalanceDbContext db, GroupAccess access, GroupJournal journal, IClock clock)
{
    public async Task<Result<IReadOnlyList<ParticipantDto>>> ListAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        IReadOnlyList<ParticipantDto> items =
        [
            .. c.Members.Select(m => ToDto(m, c, c.State.Members.First(s => s.Id == m.Id).ExpenseCount)),
        ];
        return Result<IReadOnlyList<ParticipantDto>>.Success(items);
    }

    public Task<Result<ParticipantDto>> SetRoleAsync(Guid groupId, Guid participantId, SetRoleRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyRoleAsync(groupId, participantId, request, token), cancellationToken);

    private async Task<Result<ParticipantDto>> ApplyRoleAsync(Guid groupId, Guid participantId, SetRoleRequest request, CancellationToken cancellationToken)
    {
        var role = request.Role?.Trim().ToLowerInvariant();
        if (role is not (ParticipantRoles.Admin or ParticipantRoles.Member))
        {
            return new FieldErrors().Add("role", "El rol debe ser «admin» o «member».").ToError();
        }

        var target = new ActionTarget(ParticipantId: participantId, Demoting: role == ParticipantRoles.Member);
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.ManageAdmins, cancellationToken, target);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var subject = c.Members.First(m => m.Id == participantId);
        if (subject.Role != role)
        {
            var from = subject.Role;
            subject.Role = role;
            c.Group.UpdatedAt = clock.UtcNow;
            journal.Record(groupId, GroupEventKinds.RoleChanged, new { participantId, name = subject.DisplayName, from, to = role });
            await db.SaveChangesAsync(cancellationToken);
            await journal.AuditAsync("participant.role_changed", groupId, new { participantId, from, to = role }, cancellationToken);
        }

        return ToDto(subject, c, c.State.Members.First(s => s.Id == participantId).ExpenseCount);
    }

    public Task<Result> RemoveAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyRemoveAsync(groupId, participantId, false, token), cancellationToken);

    public Task<Result> LeaveAsync(Guid groupId, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyRemoveAsync(groupId, null, true, token), cancellationToken);

    /// <summary>Quitar a otra persona (administración) o salir uno mismo. Quien pagó gastos no se quita ni sale; la última administración tampoco.</summary>
    private async Task<Result> ApplyRemoveAsync(Guid groupId, Guid? participantId, bool leaving, CancellationToken cancellationToken)
    {
        var loaded = leaving
            ? await access.LoadAuthorizedAsync(groupId, GroupAction.LeaveGroup, cancellationToken)
            : await access.LoadAuthorizedAsync(groupId, GroupAction.RemoveParticipant, cancellationToken, new ActionTarget(ParticipantId: participantId));
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var subject = leaving ? c.Me : c.Members.First(m => m.Id == participantId);
        journal.Record(
            groupId,
            leaving ? GroupEventKinds.ParticipantLeft : GroupEventKinds.ParticipantRemoved,
            new { participantId = subject.Id, name = subject.DisplayName });
        db.Participants.Remove(subject);
        c.Group.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await journal.AuditAsync(
            leaving ? "participant.left" : "participant.removed", groupId, new { participantId = subject.Id, name = subject.DisplayName }, cancellationToken);
        return Result.Success();
    }

    public async Task<Result<InvitationDto>> GetInvitationAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.ViewInvitation, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var credential = await db.JoinCredentials.AsNoTracking().SingleOrDefaultAsync(x => x.GroupId == groupId, cancellationToken);
        return credential is null ? BalanceErrors.NotFound : new InvitationDto(credential.Token, credential.Code, credential.RotatedAt);
    }

    public Task<Result<InvitationDto>> RegenerateInvitationAsync(Guid groupId, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyRegenerateAsync(groupId, token), cancellationToken);

    private async Task<Result<InvitationDto>> ApplyRegenerateAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.RegenerateInvitation, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var credential = await db.JoinCredentials.SingleOrDefaultAsync(x => x.GroupId == groupId, cancellationToken);
        if (credential is null)
        {
            return BalanceErrors.NotFound;
        }

        // Los anteriores dejan de servir de inmediato. Nunca se escribe el token ni el código en el historial ni en la auditoría.
        credential.Token = Invitation.NewToken();
        credential.Code = Invitation.NewCode();
        credential.RotatedAt = clock.UtcNow;
        credential.RotatedBy = access.AccountId;
        journal.Record(groupId, GroupEventKinds.InvitationRegenerated);
        await db.SaveChangesAsync(cancellationToken);
        await journal.AuditAsync("invitation.regenerated", groupId, null, cancellationToken);
        return new InvitationDto(credential.Token, credential.Code, credential.RotatedAt);
    }

    private static ParticipantDto ToDto(Participant p, GroupContext c, int expenseCount) =>
        new(p.Id, p.DisplayName, p.Role, p.JoinOrder, p.JoinedAt, p.Id == c.Me.Id, expenseCount);
}
