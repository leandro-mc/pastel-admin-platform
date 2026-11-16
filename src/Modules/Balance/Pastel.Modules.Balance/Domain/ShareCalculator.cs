namespace Pastel.Modules.Balance.Domain;

/// <summary>Un gasto reducido a lo que importa para el reparto: quién pagó y cuántas unidades mínimas.</summary>
internal readonly record struct PayerExpense(Guid PayerId, Int128 Units);

/// <summary>Lo pagado, la parte asignada y el saldo de una persona. Saldo positivo: le deben; negativo: debe.</summary>
internal sealed record ParticipantBalance(Guid ParticipantId, Int128 Paid, Int128 Share, Int128 Balance);

/// <param name="Total">Suma exacta de todos los gastos.</param>
/// <param name="Rows">Una fila por participante, en orden de alta.</param>
/// <param name="ExtraUnits">Unidades mínimas sobrantes del reparto (<c>total mod n</c>), asignadas una a una desde el primer participante.</param>
internal sealed record BalanceSheet(Int128 Total, IReadOnlyList<ParticipantBalance> Rows, Int128 ExtraUnits);

/// <summary>
/// D1: reparto en partes iguales entre todos los participantes del momento (retroactivo, sin participación parcial).
/// <c>total ÷ n</c> en unidades mínimas; las <c>total mod n</c> unidades que sobran se asignan de una en una a las primeras
/// personas por <b>orden de alta</b>. Las partes suman exactamente el total y los saldos exactamente cero.
/// </summary>
internal static class ShareCalculator
{
    public static BalanceSheet Compute(IReadOnlyList<Guid> participantsInJoinOrder, IEnumerable<PayerExpense> expenses)
    {
        var n = participantsInJoinOrder.Count;
        if (n == 0)
        {
            return new BalanceSheet(0, [], 0);
        }

        var paid = participantsInJoinOrder.ToDictionary(id => id, _ => Int128.Zero);
        Int128 total = 0;
        foreach (var expense in expenses)
        {
            if (!paid.ContainsKey(expense.PayerId))
            {
                throw new BalanceInvariantException("El pagador no pertenece al grupo.");
            }

            paid[expense.PayerId] += expense.Units;
            total += expense.Units;
        }

        Int128 count = n;
        var baseShare = total / count;
        var remainder = total % count;
        var rows = new List<ParticipantBalance>(n);
        Int128 sumShares = 0, sumBalances = 0;
        for (var i = 0; i < n; i++)
        {
            var id = participantsInJoinOrder[i];
            var share = baseShare + (i < remainder ? 1 : 0);
            var balance = paid[id] - share;
            rows.Add(new ParticipantBalance(id, paid[id], share, balance));
            sumShares += share;
            sumBalances += balance;
        }

        if (sumShares != total || sumBalances != 0)
        {
            throw new BalanceInvariantException("Invariante roto: las partes o los saldos no cuadran.");
        }

        return new BalanceSheet(total, rows, remainder);
    }
}
