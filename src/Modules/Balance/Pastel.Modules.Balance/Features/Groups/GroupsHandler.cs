using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Features.Groups;

internal sealed class GroupsHandler(BalanceDbContext db, GroupAccess access, LedgerReader ledger, GroupJournal journal, IClock clock)
{
    public async Task<Result<CreatedGroupDto>> CreateAsync(CreateGroupRequest request, CancellationToken cancellationToken)
    {
        var errors = new FieldErrors();
        var name = ValidateName(request.Name, errors);
        var description = ValidateDescription(request.Description, errors);
        if (!CurrencyCatalog.TryGet(request.CurrencyCode?.Trim().ToUpperInvariant(), out var currency))
        {
            errors.Add("currencyCode", BalanceErrors.CurrencyUnknown);
        }

        var zoneId = string.IsNullOrWhiteSpace(request.TimeZone) ? GroupTimeZone.Default : request.TimeZone.Trim();
        var zoneValid = GroupTimeZone.TryResolve(zoneId, out _);
        if (!zoneValid)
        {
            errors.Add("timeZone", BalanceErrors.TimeZoneInvalid);
        }

        DateOnly start = default;
        if (string.IsNullOrWhiteSpace(request.StartDate))
        {
            start = zoneValid ? GroupTimeZone.LocalDate(zoneId, clock.UtcNow) : default;
        }
        else if (!Parsing.TryDate(request.StartDate, out start))
        {
            errors.Add("startDate", "Escriba una fecha de inicio válida.");
        }

        if (errors.Any)
        {
            return errors.ToError();
        }

        var now = clock.UtcNow;
        var group = new BalanceGroup
        {
            Name = name, Description = description, CurrencyCode = currency.Code, TimeZone = zoneId, StartDate = start,
            ParticipantSeq = 1, CreatedAt = now, CreatedBy = access.AccountId, UpdatedAt = now,
        };
        db.Groups.Add(group);
        db.Participants.Add(new Participant
        {
            GroupId = group.Id, AccountId = access.AccountId, DisplayName = access.DisplayName,
            Role = ParticipantRoles.Admin, JoinOrder = 1, JoinedAt = now,
        });
        db.JoinCredentials.Add(new JoinCredential
        {
            GroupId = group.Id, Token = Invitation.NewToken(), Code = Invitation.NewCode(), RotatedAt = now, RotatedBy = access.AccountId,
        });
        journal.Record(group.Id, GroupEventKinds.GroupCreated, new { name, currency = currency.Code });
        await db.SaveChangesAsync(cancellationToken);
        return new CreatedGroupDto(group.Id);
    }

    public async Task<Result<GroupListDto>> ListAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var accountId = access.AccountId;
        var mine = db.Participants.AsNoTracking().Where(p => p.AccountId == accountId);
        var total = await mine.CountAsync(cancellationToken);
        var rows = await mine
            .Join(db.Groups.AsNoTracking(), p => p.GroupId, g => g.Id, (p, g) => new { p.Id, p.Role, Group = g })
            .OrderBy(x => x.Group.ClosedAt != null).ThenByDescending(x => x.Group.UpdatedAt).ThenBy(x => x.Group.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);

        var ids = rows.Select(r => r.Group.Id).ToList();
        var members = await db.Participants.AsNoTracking().Where(p => ids.Contains(p.GroupId))
            .OrderBy(p => p.JoinOrder).ThenBy(p => p.Id).Select(p => new { p.GroupId, p.Id }).ToListAsync(cancellationToken);
        var expenses = await db.Expenses.AsNoTracking().Where(e => ids.Contains(e.GroupId))
            .Select(e => new { e.GroupId, e.PayerParticipantId, e.Amount }).ToListAsync(cancellationToken);

        var items = rows.Select(r =>
        {
            var currency = CurrencyCatalog.Get(r.Group.CurrencyCode);
            var memberIds = members.Where(m => m.GroupId == r.Group.Id).Select(m => m.Id).ToList();
            var sheet = ShareCalculator.Compute(
                memberIds,
                expenses.Where(e => e.GroupId == r.Group.Id).Select(e => new PayerExpense(e.PayerParticipantId, Money.FromDecimal(e.Amount, currency))));
            var mineRow = sheet.Rows.First(x => x.ParticipantId == r.Id);
            return new GroupSummaryDto(
                r.Group.Id, r.Group.Name, r.Group.CurrencyCode, r.Group.ClosedAt is not null, memberIds.Count, r.Role,
                Money.Format(sheet.Total, currency), Money.Format(mineRow.Balance, currency));
        }).ToList();
        return new GroupListDto(items, page, pageSize, total);
    }

    public async Task<Result<GroupDetailDto>> GetAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        return loaded.IsFailure ? loaded.Error : DtoMapping.Detail(loaded.Value, await ledger.ReadAsync(loaded.Value, cancellationToken), clock.UtcNow);
    }

    public Task<Result<GroupDetailDto>> UpdateAsync(Guid groupId, UpdateGroupRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyUpdateAsync(groupId, request, token), cancellationToken);

    private async Task<Result<GroupDetailDto>> ApplyUpdateAsync(Guid groupId, UpdateGroupRequest request, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.EditSettings, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var errors = new FieldErrors();
        var name = ValidateName(request.Name, errors);
        var description = ValidateDescription(request.Description, errors);
        var zoneId = request.TimeZone?.Trim() ?? string.Empty;
        if (!GroupTimeZone.TryResolve(zoneId, out _))
        {
            errors.Add("timeZone", BalanceErrors.TimeZoneInvalid);
        }

        if (errors.Any)
        {
            return errors.ToError();
        }

        if (request.Version != c.Group.Version)
        {
            return PlatformErrors.ConcurrencyConflict;
        }

        var before = new { name = c.Group.Name, description = c.Group.Description, timeZone = c.Group.TimeZone };
        if (before.name != name || before.description != description || before.timeZone != zoneId)
        {
            c.Group.Name = name;
            c.Group.Description = description;
            c.Group.TimeZone = zoneId;
            c.Group.UpdatedAt = clock.UtcNow;
            journal.Record(groupId, GroupEventKinds.GroupUpdated, new { before, after = new { name, description, timeZone = zoneId } });
            await db.SaveChangesAsync(cancellationToken);
        }

        return DtoMapping.Detail(c, await ledger.ReadAsync(c, cancellationToken), clock.UtcNow);
    }

    public Task<Result<GroupDetailDto>> ChangeCurrencyAsync(Guid groupId, ChangeCurrencyRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyCurrencyAsync(groupId, request, token), cancellationToken);

    private async Task<Result<GroupDetailDto>> ApplyCurrencyAsync(Guid groupId, ChangeCurrencyRequest request, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.ChangeCurrency, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        if (!CurrencyCatalog.TryGet(request.CurrencyCode?.Trim().ToUpperInvariant(), out var target))
        {
            return new FieldErrors().Add("currencyCode", BalanceErrors.CurrencyUnknown).ToError();
        }

        if (target.Code != c.Group.CurrencyCode)
        {
            // D8: la moneda se reexpresa sin convertir. Solo es posible si ningún monto tiene más decimales de los que admite la nueva.
            var amounts = await db.Expenses.AsNoTracking().Where(e => e.GroupId == groupId).Select(e => e.Amount).ToListAsync(cancellationToken);
            if (amounts.Any(a => !Money.TryFromDecimal(a, target, out _)))
            {
                return BalanceErrors.CurrencyDecimalsIncompatible(target.Code);
            }

            var previous = c.Group.CurrencyCode;
            c.Group.CurrencyCode = target.Code;
            c.Group.UpdatedAt = clock.UtcNow;
            journal.Record(groupId, GroupEventKinds.CurrencyChanged, new { from = previous, to = target.Code });
            await db.SaveChangesAsync(cancellationToken);
            await journal.AuditAsync("group.currency_changed", groupId, new { from = previous, to = target.Code }, cancellationToken);
            c = c with { Currency = target };
        }

        return DtoMapping.Detail(c, await ledger.ReadAsync(c, cancellationToken), clock.UtcNow);
    }

    public Task<Result<GroupDetailDto>> SetClosedAsync(Guid groupId, bool close, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyClosedAsync(groupId, close, token), cancellationToken);

    private async Task<Result<GroupDetailDto>> ApplyClosedAsync(Guid groupId, bool close, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, close ? GroupAction.CloseGroup : GroupAction.ReopenGroup, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        // Al reabrir se borra la fecha de cierre; el historial conserva ambos hechos (decisión pendiente del propietario).
        var c = loaded.Value;
        c.Group.ClosedAt = close ? clock.UtcNow : null;
        c.Group.UpdatedAt = clock.UtcNow;
        var kind = close ? GroupEventKinds.GroupClosed : GroupEventKinds.GroupReopened;
        journal.Record(groupId, kind);
        await db.SaveChangesAsync(cancellationToken);
        await journal.AuditAsync(close ? "group.closed" : "group.reopened", groupId, null, cancellationToken);
        return DtoMapping.Detail(c, await ledger.ReadAsync(c, cancellationToken), clock.UtcNow);
    }

    public Task<Result> DeleteAsync(Guid groupId, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyDeleteAsync(groupId, token), cancellationToken);

    private async Task<Result> ApplyDeleteAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.DeleteGroup, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var name = loaded.Value.Group.Name;
        db.Groups.Remove(loaded.Value.Group); // participantes, enlace e historial se borran en cascada en la base
        await db.SaveChangesAsync(cancellationToken);
        await journal.AuditAsync("group.deleted", groupId, new { name }, cancellationToken);
        return Result.Success();
    }

    public async Task<Result<GroupEventPageDto>> HistoryAsync(Guid groupId, int page, int pageSize, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.ViewHistory, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.GroupEvents.AsNoTracking().Where(e => e.GroupId == groupId);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(e => e.OccurredAt).ThenByDescending(e => e.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(e => new GroupEventDto(e.Id, e.OccurredAt, e.ActorName, e.Kind, e.DetailsJson))
            .ToListAsync(cancellationToken);
        return new GroupEventPageDto(items, page, pageSize, total);
    }

    private static string ValidateName(string? raw, FieldErrors errors)
    {
        var name = raw?.Trim() ?? string.Empty;
        if (name.Length == 0)
        {
            errors.Add("name", "Escriba el nombre del grupo.");
        }
        else if (name.Length > Parsing.NameMax)
        {
            errors.Add("name", $"El nombre admite hasta {Parsing.NameMax} caracteres.");
        }

        return name;
    }

    private static string? ValidateDescription(string? raw, FieldErrors errors)
    {
        var text = raw?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        if (text.Length > Parsing.GroupDescriptionMax)
        {
            errors.Add("description", $"La descripción admite hasta {Parsing.GroupDescriptionMax} caracteres.");
        }

        return text;
    }
}
