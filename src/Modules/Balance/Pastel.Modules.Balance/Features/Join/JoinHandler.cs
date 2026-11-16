using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Modules.Balance.Security;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Features.Join;

/// <summary>
/// Ingreso a un grupo con enlace y código. Hace falta sesión y <c>balance.access</c>; el enlace por sí solo no basta. Entra como miembro, al
/// final del orden de alta. Cualquier enlace o código malo responde igual (no revela si el enlace existe) y cuenta para el límite de intentos.
/// </summary>
internal sealed class JoinHandler(BalanceDbContext db, GroupAccess access, GroupJournal journal, JoinAttemptLimiter limiter, IClock clock)
{
    public async Task<Result<JoinedGroupDto>> JoinAsync(JoinRequest request, CancellationToken cancellationToken)
    {
        var accountId = access.AccountId;
        var token = request.Token?.Trim();
        var code = request.Code?.Trim();
        if (limiter.RetryAfterSeconds(accountId, token) is { } wait)
        {
            return BalanceErrors.JoinRateLimited(wait);
        }

        var result = await TransactionRunner.RunSerializableAsync(db, t => ApplyAsync(accountId, token, code, t), cancellationToken);
        if (result.IsSuccess)
        {
            limiter.RegisterSuccess(accountId, token);
        }
        else if (result.Error.Code == BalanceErrors.JoinInvalid.Code)
        {
            limiter.RegisterFailure(accountId, token);
        }

        return result;
    }

    private async Task<Result<JoinedGroupDto>> ApplyAsync(Guid accountId, string? token, string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(token) || token.Length > Invitation.MaxTokenLength || !Invitation.IsCodeFormat(code))
        {
            return BalanceErrors.JoinInvalid;
        }

        var credential = await db.JoinCredentials.SingleOrDefaultAsync(c => c.Token == token, cancellationToken);
        var codeMatches = Invitation.FixedTimeEquals(credential?.Code ?? "0000", code); // se compara siempre, exista o no el enlace
        if (credential is null || !codeMatches)
        {
            return BalanceErrors.JoinInvalid;
        }

        var group = await db.Groups.SingleAsync(g => g.Id == credential.GroupId, cancellationToken);
        if (await db.Participants.AnyAsync(p => p.GroupId == group.Id && p.AccountId == accountId, cancellationToken))
        {
            return new JoinedGroupDto(group.Id); // quien ya es miembro simplemente entra
        }

        if (group.ClosedAt is not null)
        {
            return BalanceErrors.GroupClosed; // sumar a alguien cambiaría el reparto de un grupo ya liquidado
        }

        var now = clock.UtcNow;
        group.ParticipantSeq++;
        group.UpdatedAt = now;
        db.Participants.Add(new Participant
        {
            GroupId = group.Id, AccountId = accountId, DisplayName = access.DisplayName,
            Role = ParticipantRoles.Member, JoinOrder = group.ParticipantSeq, JoinedAt = now,
        });
        journal.Record(group.Id, GroupEventKinds.ParticipantJoined, new { name = access.DisplayName });
        await db.SaveChangesAsync(cancellationToken);
        await journal.AuditAsync("participant.joined", group.Id, new { name = access.DisplayName }, cancellationToken);
        return new JoinedGroupDto(group.Id);
    }
}
