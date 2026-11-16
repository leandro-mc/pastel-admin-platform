using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Features.Balances;

/// <summary>Saldos y liquidación sugerida. Todo se calcula en el servidor, sobre unidades mínimas, y la liquidación solo se muestra: no registra pagos.</summary>
internal sealed class BalancesHandler(GroupAccess access, LedgerReader ledger)
{
    public async Task<Result<BalancesDto>> BalancesAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var sheet = await ledger.ReadAsync(c, cancellationToken);
        var names = c.Members.ToDictionary(m => m.Id, m => m.DisplayName);
        return new BalancesDto(
            c.Group.CurrencyCode,
            Money.Format(sheet.Total, c.Currency),
            sheet.ExtraUnits.ToString(System.Globalization.CultureInfo.InvariantCulture),
            [.. sheet.Rows.Select(r => new BalanceRowDto(
                r.ParticipantId, names[r.ParticipantId], Money.Format(r.Paid, c.Currency), Money.Format(r.Share, c.Currency), Money.Format(r.Balance, c.Currency)))]);
    }

    public async Task<Result<SettlementDto>> SettlementAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var loaded = await access.LoadAuthorizedAsync(groupId, GroupAction.View, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var c = loaded.Value;
        var sheet = await ledger.ReadAsync(c, cancellationToken);
        var names = c.Members.ToDictionary(m => m.Id, m => m.DisplayName);
        var transfers = SettlementCalculator.Calculate([.. c.Members.Select(m => m.Id)], sheet.Rows.ToDictionary(r => r.ParticipantId, r => r.Balance));
        return new SettlementDto(
            c.Group.CurrencyCode,
            transfers.Count == 0,
            [.. transfers.Select(t => new TransferDto(t.From, names[t.From], t.To, names[t.To], Money.Format(t.Units, c.Currency)))]);
    }
}
