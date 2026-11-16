using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Features.Expenses;

internal sealed class ExpensesHandler(BalanceDbContext db, GroupAccess access, GroupJournal journal, IClock clock)
{
    private const int MaxSheetRows = 500;

    private sealed record Parsed(Guid PayerId, string Description, Int128 Units, DateOnly Date);

    // ── Lista ──

    public async Task<Result<ExpensePageDto>> ListAsync(Guid groupId, ExpenseQuery q, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var errors = new FieldErrors();
        DateOnly fromDate = default, toDate = default;
        var hasFrom = !string.IsNullOrWhiteSpace(q.From);
        var hasTo = !string.IsNullOrWhiteSpace(q.To);
        if (hasFrom && !Parsing.TryDate(q.From, out fromDate))
        {
            errors.Add("from", "Escriba una fecha válida.");
        }

        if (hasTo && !Parsing.TryDate(q.To, out toDate))
        {
            errors.Add("to", "Escriba una fecha válida.");
        }

        if (errors.Any)
        {
            return errors.ToError();
        }

        var page = Math.Max(1, q.Page ?? 1);
        var pageSize = Math.Clamp(q.PageSize ?? 50, 1, 100);
        IQueryable<Expense> query = db.Expenses.AsNoTracking().Where(e => e.GroupId == groupId);
        if (q.PayerId is { } payer)
        {
            query = query.Where(e => e.PayerParticipantId == payer);
        }

        if (hasFrom)
        {
            query = query.Where(e => e.ExpenseDate >= fromDate);
        }

        if (hasTo)
        {
            query = query.Where(e => e.ExpenseDate <= toDate);
        }

        if (!string.IsNullOrWhiteSpace(q.Q))
        {
            var term = q.Q.Trim();
            var pattern = Parsing.LikeContains(term);
            var payerIds = c.Members.Where(m => m.DisplayName.Contains(term, StringComparison.OrdinalIgnoreCase)).Select(m => m.Id).ToList();
            query = query.Where(e => EF.Functions.ILike(e.Description, pattern, "\\") || payerIds.Contains(e.PayerParticipantId));
        }

        var total = await query.CountAsync(cancellationToken);
        var sum = await query.SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;
        var ordered = q.Order switch
        {
            "date_asc" => query.OrderBy(e => e.ExpenseDate).ThenBy(e => e.Id),
            "amount_desc" => query.OrderByDescending(e => e.Amount).ThenByDescending(e => e.Id),
            "amount_asc" => query.OrderBy(e => e.Amount).ThenBy(e => e.Id),
            _ => query.OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.Id),
        };
        var rows = await ordered.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new ExpensePageDto(
            [.. rows.Select(e => DtoMapping.ExpenseOf(e, c))],
            page,
            pageSize,
            total,
            Money.Format(Money.FromDecimal(sum, c.Currency), c.Currency));
    }

    // ── Crear / editar / eliminar ──

    public Task<Result<ExpenseDto>> CreateAsync(Guid groupId, ExpenseRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyCreateAsync(groupId, request, token), cancellationToken);

    private async Task<Result<ExpenseDto>> ApplyCreateAsync(Guid groupId, ExpenseRequest request, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAsync(groupId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var payerId = request.PayerId ?? c.Me.Id;
        if (GroupPolicy.Check(GroupAction.AddExpense, c.State, c.Me.Id, new ActionTarget(PayerId: payerId)) is { } denied)
        {
            return denied;
        }

        var parsed = Parse(request.Description, request.Amount, request.Date, payerId, c, string.Empty);
        if (parsed.IsFailure)
        {
            return parsed.Error;
        }

        var now = clock.UtcNow;
        var expense = new Expense
        {
            GroupId = groupId, PayerParticipantId = payerId, Description = parsed.Value.Description,
            Amount = Money.ToDecimal(parsed.Value.Units, c.Currency), ExpenseDate = parsed.Value.Date,
            CreatedAt = now, CreatedBy = access.AccountId, UpdatedAt = now, UpdatedBy = access.AccountId,
        };
        db.Expenses.Add(expense);
        journal.Record(groupId, GroupEventKinds.ExpenseCreated, Details(expense, c));
        await db.SaveChangesAsync(cancellationToken);
        return DtoMapping.ExpenseOf(expense, c);
    }

    public Task<Result<ExpenseDto>> UpdateAsync(Guid groupId, Guid expenseId, ExpenseRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyUpdateAsync(groupId, expenseId, request, token), cancellationToken);

    private async Task<Result<ExpenseDto>> ApplyUpdateAsync(Guid groupId, Guid expenseId, ExpenseRequest request, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAsync(groupId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var expense = await db.Expenses.SingleOrDefaultAsync(e => e.Id == expenseId && e.GroupId == groupId, cancellationToken);
        if (expense is null)
        {
            return BalanceErrors.ExpenseNotFound;
        }

        if (GroupPolicy.Check(GroupAction.EditExpense, c.State, c.Me.Id, new ActionTarget(ExpensePayerId: expense.PayerParticipantId)) is { } denied)
        {
            return denied;
        }

        var payerId = request.PayerId ?? expense.PayerParticipantId;
        if (payerId != expense.PayerParticipantId
            && GroupPolicy.Check(GroupAction.ChangePayer, c.State, c.Me.Id) is { } payerDenied)
        {
            return payerDenied;
        }

        var parsed = Parse(request.Description, request.Amount, request.Date, payerId, c, string.Empty);
        if (parsed.IsFailure)
        {
            return parsed.Error;
        }

        if (request.Version != expense.Version)
        {
            return PlatformErrors.ConcurrencyConflict;
        }

        var before = Details(expense, c);
        Apply(expense, parsed.Value, c, access.AccountId, clock.UtcNow);
        journal.Record(groupId, GroupEventKinds.ExpenseUpdated, new { before, after = Details(expense, c) });
        await db.SaveChangesAsync(cancellationToken);
        return DtoMapping.ExpenseOf(expense, c);
    }

    public Task<Result> DeleteAsync(Guid groupId, Guid expenseId, uint? version, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyDeleteAsync(groupId, expenseId, version, token), cancellationToken);

    private async Task<Result> ApplyDeleteAsync(Guid groupId, Guid expenseId, uint? version, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAsync(groupId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var expense = await db.Expenses.SingleOrDefaultAsync(e => e.Id == expenseId && e.GroupId == groupId, cancellationToken);
        if (expense is null)
        {
            return BalanceErrors.ExpenseNotFound;
        }

        if (GroupPolicy.Check(GroupAction.DeleteExpense, c.State, c.Me.Id, new ActionTarget(ExpensePayerId: expense.PayerParticipantId)) is { } denied)
        {
            return denied;
        }

        if (version is { } v && v != expense.Version)
        {
            return PlatformErrors.ConcurrencyConflict;
        }

        journal.Record(groupId, GroupEventKinds.ExpenseDeleted, Details(expense, c));
        db.Expenses.Remove(expense);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    // ── Gestión de gastos (hoja con borrador) ──

    public async Task<Result<SheetDto>> GetSheetAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var query = db.Expenses.AsNoTracking().Where(e => e.GroupId == groupId);
        if (!c.IsAdmin)
        {
            var mine = c.Me.Id;
            query = query.Where(e => e.PayerParticipantId == mine); // un miembro solo ve y edita lo que pagó
        }

        var rows = await query.OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.Id).ToListAsync(cancellationToken);
        return new SheetDto([.. rows.Select(e => DtoMapping.ExpenseOf(e, c))], c.IsAdmin);
    }

    public Task<Result<SheetResultDto>> SaveSheetAsync(Guid groupId, SheetRequest request, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplySheetAsync(groupId, request, token), cancellationToken);

    /// <summary>Guardado atómico: si cualquier fila es inválida o no está permitida, <b>no se guarda nada</b>.</summary>
    private async Task<Result<SheetResultDto>> ApplySheetAsync(Guid groupId, SheetRequest request, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var rows = request.Rows ?? [];
        var deletedIds = (request.DeletedIds ?? []).Distinct().ToList();
        if (rows.Count + deletedIds.Count > MaxSheetRows)
        {
            return new FieldErrors().Add("rows", $"Se admiten hasta {MaxSheetRows} cambios por guardado.").ToError();
        }

        var errors = new FieldErrors();
        var parsedRows = new List<(SheetRowRequest Row, Parsed Data)>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var payerId = row.PayerId ?? c.Me.Id;
            var parsed = Parse(row.Description, row.Amount, row.Date, payerId, c, $"rows.{i}.");
            if (parsed.IsFailure)
            {
                foreach (var (field, messages) in parsed.Error.Details ?? new Dictionary<string, string[]>())
                {
                    foreach (var message in messages)
                    {
                        errors.Add(field, message);
                    }
                }

                continue;
            }

            parsedRows.Add((row, parsed.Value));
        }

        var ids = parsedRows.Where(x => x.Row.Id is not null).Select(x => x.Row.Id!.Value).ToList();
        if (ids.Count != ids.Distinct().Count() || ids.Intersect(deletedIds).Any())
        {
            errors.Add("rows", "Hay gastos repetidos en el borrador.");
        }

        if (errors.Any)
        {
            return errors.ToError();
        }

        var existing = await db.Expenses.Where(e => e.GroupId == groupId).ToListAsync(cancellationToken);
        var byId = existing.ToDictionary(e => e.Id);
        var snapshots = existing.Select(e => new ExpenseSnapshot(e.Id, e.PayerParticipantId, e.Description, Money.FromDecimal(e.Amount, c.Currency), e.ExpenseDate)).ToList();

        var sheetRows = parsedRows.Select(x => new SheetRow(x.Row.Id, x.Data.PayerId, x.Data.Description, x.Data.Units, x.Data.Date)).ToList();
        var touched = ids.Concat(deletedIds).ToHashSet();
        // Lo que el borrador no toca se presenta como «sin cambios», para que solo los borrados explícitos cuenten como eliminaciones.
        sheetRows.AddRange(snapshots.Where(s => !touched.Contains(s.Id)).Select(s => new SheetRow(s.Id, s.PayerId, s.Description, s.Units, s.Date)));
        if (GroupPolicy.CheckSheet(c.State, c.Me.Id, snapshots, sheetRows) is { } denied)
        {
            return denied;
        }

        foreach (var id in deletedIds)
        {
            if (!byId.TryGetValue(id, out var toDelete))
            {
                return BalanceErrors.ExpenseNotFound;
            }

            if (GroupPolicy.Check(GroupAction.DeleteExpense, c.State, c.Me.Id, new ActionTarget(ExpensePayerId: toDelete.PayerParticipantId)) is { } deleteDenied)
            {
                return deleteDenied;
            }
        }

        int created = 0, updated = 0, deleted = 0;
        var now = clock.UtcNow;
        foreach (var (row, data) in parsedRows)
        {
            if (row.Id is null)
            {
                var expense = new Expense
                {
                    GroupId = groupId, PayerParticipantId = data.PayerId, Description = data.Description,
                    Amount = Money.ToDecimal(data.Units, c.Currency), ExpenseDate = data.Date,
                    CreatedAt = now, CreatedBy = access.AccountId, UpdatedAt = now, UpdatedBy = access.AccountId,
                };
                db.Expenses.Add(expense);
                journal.Record(groupId, GroupEventKinds.ExpenseCreated, Details(expense, c));
                created++;
                continue;
            }

            var current = byId[row.Id.Value];
            var changed = current.PayerParticipantId != data.PayerId || current.Description != data.Description
                || current.ExpenseDate != data.Date || Money.FromDecimal(current.Amount, c.Currency) != data.Units;
            if (!changed)
            {
                continue;
            }

            if (row.Version != current.Version)
            {
                return PlatformErrors.ConcurrencyConflict;
            }

            var before = Details(current, c);
            Apply(current, data, c, access.AccountId, now);
            journal.Record(groupId, GroupEventKinds.ExpenseUpdated, new { before, after = Details(current, c) });
            updated++;
        }

        foreach (var id in deletedIds)
        {
            var toDelete = byId[id];
            journal.Record(groupId, GroupEventKinds.ExpenseDeleted, Details(toDelete, c));
            db.Expenses.Remove(toDelete);
            deleted++;
        }

        if (created + updated + deleted > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return new SheetResultDto(created, updated, deleted);
    }

    // ── Comunes ──

    /// <summary>Valida y convierte los datos de un gasto. <paramref name="prefix"/> antepone la fila a cada campo con error (hoja).</summary>
    private static Result<Parsed> Parse(string? rawDescription, string? rawAmount, string? rawDate, Guid payerId, GroupContext c, string prefix)
    {
        var errors = new FieldErrors();
        if (c.Members.All(m => m.Id != payerId))
        {
            errors.Add(prefix + "payerId", "Elija quién pagó el gasto.");
        }

        var description = rawDescription?.Trim() ?? string.Empty;
        if (description.Length < Parsing.DescriptionMin || description.Length > Parsing.DescriptionMax)
        {
            errors.Add(prefix + "description", $"La descripción debe tener entre {Parsing.DescriptionMin} y {Parsing.DescriptionMax} caracteres.");
        }

        Int128 units = 0;
        var amount = Money.Parse(rawAmount, c.Currency);
        if (amount.IsFailure)
        {
            errors.Add(prefix + "amount", amount.Error);
        }
        else
        {
            units = amount.Value;
        }

        if (!Parsing.TryDate(rawDate, out var date))
        {
            errors.Add(prefix + "date", "Escriba una fecha válida.");
        }

        return errors.Any ? errors.ToError() : new Parsed(payerId, description, units, date);
    }

    private static void Apply(Expense expense, Parsed data, GroupContext c, Guid accountId, DateTimeOffset now)
    {
        expense.PayerParticipantId = data.PayerId;
        expense.Description = data.Description;
        expense.Amount = Money.ToDecimal(data.Units, c.Currency);
        expense.ExpenseDate = data.Date;
        expense.UpdatedAt = now;
        expense.UpdatedBy = accountId;
    }

    private static object Details(Expense e, GroupContext c) => new
    {
        expenseId = e.Id,
        payer = c.Members.FirstOrDefault(m => m.Id == e.PayerParticipantId)?.DisplayName,
        description = e.Description,
        amount = Money.Format(Money.FromDecimal(e.Amount, c.Currency), c.Currency),
        date = Parsing.DateText(e.ExpenseDate),
    };
}
