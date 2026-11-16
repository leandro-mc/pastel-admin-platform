namespace Pastel.Modules.Balance.Domain;

/// <summary>Transferencia sugerida: <see cref="From"/> le paga a <see cref="To"/> esas unidades mínimas.</summary>
internal sealed record Transfer(Guid From, Guid To, Int128 Units);

/// <summary>
/// D2: liquidación codiciosa y <b>determinista</b>. Deudores y acreedores se ordenan por monto descendente y, en empate, por
/// orden de alta; se paga el mínimo entre el primer deudor y el primer acreedor y se reordena con la misma clave tras cada pago.
/// El resultado no depende del orden de entrada ni del de la base de datos. A lo sumo (deudores + acreedores − 1) pagos;
/// no minimiza el número de transferencias (inventario G32). Solo muestra transferencias sugeridas: no registra pagos.
/// </summary>
internal static class SettlementCalculator
{
    public static IReadOnlyList<Transfer> Calculate(IReadOnlyList<Guid> participantsInJoinOrder, IReadOnlyDictionary<Guid, Int128> balances)
    {
        var position = new Dictionary<Guid, int>(participantsInJoinOrder.Count);
        for (var i = 0; i < participantsInJoinOrder.Count; i++)
        {
            position[participantsInJoinOrder[i]] = i;
        }

        var debtors = new List<Entry>();
        var creditors = new List<Entry>();
        foreach (var id in participantsInJoinOrder)
        {
            var balance = balances.TryGetValue(id, out var value) ? value : Int128.Zero;
            if (balance < 0)
            {
                debtors.Add(new Entry(id, -balance, position[id]));
            }
            else if (balance > 0)
            {
                creditors.Add(new Entry(id, balance, position[id]));
            }
        }

        var transfers = new List<Transfer>();
        while (debtors.Count > 0 && creditors.Count > 0)
        {
            debtors.Sort(ByAmountThenJoinOrder);
            creditors.Sort(ByAmountThenJoinOrder);
            var debtor = debtors[0];
            var creditor = creditors[0];
            var amount = debtor.Units < creditor.Units ? debtor.Units : creditor.Units;
            transfers.Add(new Transfer(debtor.Id, creditor.Id, amount));
            debtor.Units -= amount;
            creditor.Units -= amount;
            if (debtor.Units == 0)
            {
                debtors.RemoveAt(0);
            }

            if (creditor.Units == 0)
            {
                creditors.RemoveAt(0);
            }
        }

        if (debtors.Count > 0 || creditors.Count > 0)
        {
            throw new BalanceInvariantException("Quedó saldo sin liquidar: los saldos no suman cero.");
        }

        return transfers;
    }

    private static int ByAmountThenJoinOrder(Entry a, Entry b) =>
        a.Units == b.Units ? a.Position.CompareTo(b.Position) : b.Units.CompareTo(a.Units);

    private sealed class Entry(Guid id, Int128 units, int position)
    {
        public Guid Id { get; } = id;

        public Int128 Units { get; set; } = units;

        public int Position { get; } = position;
    }
}
