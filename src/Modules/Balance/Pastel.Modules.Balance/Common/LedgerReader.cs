using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Domain;
using Pastel.Modules.Balance.Persistence;

namespace Pastel.Modules.Balance.Common;

/// <summary>Calcula reparto y saldos de un grupo a partir de sus gastos guardados (D1). Siempre en el servidor y sobre unidades mínimas.</summary>
internal sealed class LedgerReader(BalanceDbContext db)
{
    public async Task<BalanceSheet> ReadAsync(GroupContext c, CancellationToken cancellationToken)
    {
        var rows = await db.Expenses.AsNoTracking().Where(e => e.GroupId == c.Group.Id)
            .Select(e => new { e.PayerParticipantId, e.Amount }).ToListAsync(cancellationToken);
        return ShareCalculator.Compute(
            [.. c.Members.Select(m => m.Id)],
            rows.Select(r => new PayerExpense(r.PayerParticipantId, Money.FromDecimal(r.Amount, c.Currency))));
    }
}
