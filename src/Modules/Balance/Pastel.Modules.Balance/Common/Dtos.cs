using Pastel.Modules.Balance.Domain;

namespace Pastel.Modules.Balance.Common;

// Los montos se devuelven como cadena decimal con punto («12.50»): nunca como número JSON, para no perder exactitud en JavaScript.

internal sealed record GroupSummaryDto(
    Guid Id, string Name, string CurrencyCode, bool IsClosed, int ParticipantCount, string MyRole, string Total, string MyBalance);

internal sealed record GroupListDto(IReadOnlyList<GroupSummaryDto> Items, int Page, int PageSize, int Total);

internal sealed record GroupDetailDto(
    Guid Id,
    string Name,
    string? Description,
    string CurrencyCode,
    string TimeZone,
    string StartDate,
    bool IsClosed,
    DateTimeOffset? ClosedAt,
    string? ClosedDate,
    string Today,
    Guid MyParticipantId,
    string MyRole,
    int ParticipantCount,
    int ExpenseCount,
    string Total,
    string MyPaid,
    string MyShare,
    string MyBalance,
    uint Version);

internal sealed record CreatedGroupDto(Guid Id);

internal sealed record ParticipantDto(Guid Id, string DisplayName, string Role, int JoinOrder, DateTimeOffset JoinedAt, bool IsMe, int ExpenseCount);

internal sealed record InvitationDto(string Token, string Code, DateTimeOffset RotatedAt);

internal sealed record BalanceRowDto(Guid ParticipantId, string DisplayName, string Paid, string Share, string Balance);

internal sealed record BalancesDto(string CurrencyCode, string Total, string ExtraUnits, IReadOnlyList<BalanceRowDto> Rows);

internal sealed record TransferDto(Guid FromId, string FromName, Guid ToId, string ToName, string Amount);

internal sealed record SettlementDto(string CurrencyCode, bool IsSettled, IReadOnlyList<TransferDto> Transfers);

internal sealed record ExpenseDto(
    Guid Id, Guid PayerId, string PayerName, string Description, string Amount, string Date, uint Version, DateTimeOffset UpdatedAt, bool CanEdit);

internal sealed record ExpensePageDto(IReadOnlyList<ExpenseDto> Items, int Page, int PageSize, int Total, string TotalAmount);

internal sealed record SheetDto(IReadOnlyList<ExpenseDto> Rows, bool CanChoosePayer);

internal sealed record SheetResultDto(int Created, int Updated, int Deleted);

internal sealed record GroupEventDto(long Id, DateTimeOffset OccurredAt, string ActorName, string Kind, string? DetailsJson);

internal sealed record GroupEventPageDto(IReadOnlyList<GroupEventDto> Items, int Page, int PageSize, int Total);

internal sealed record CurrencyDto(string Code, string Name, string Symbol, int Decimals, bool Featured);

internal static class DtoMapping
{
    public static GroupDetailDto Detail(GroupContext c, BalanceSheet sheet, DateTimeOffset now)
    {
        var mine = sheet.Rows.First(r => r.ParticipantId == c.Me.Id);
        var group = c.Group;
        return new GroupDetailDto(
            group.Id,
            group.Name,
            group.Description,
            group.CurrencyCode,
            group.TimeZone,
            Parsing.DateText(group.StartDate),
            group.ClosedAt is not null,
            group.ClosedAt,
            group.ClosedAt is { } closed ? Parsing.DateText(GroupTimeZone.LocalDate(group.TimeZone, closed)) : null,
            Parsing.DateText(GroupTimeZone.LocalDate(group.TimeZone, now)),
            c.Me.Id,
            c.Me.Role,
            c.Members.Count,
            c.State.ExpenseCount,
            Money.Format(sheet.Total, c.Currency),
            Money.Format(mine.Paid, c.Currency),
            Money.Format(mine.Share, c.Currency),
            Money.Format(mine.Balance, c.Currency),
            group.Version);
    }

    public static ExpenseDto ExpenseOf(Expense e, GroupContext c) => new(
        e.Id,
        e.PayerParticipantId,
        c.Members.FirstOrDefault(m => m.Id == e.PayerParticipantId)?.DisplayName ?? string.Empty,
        e.Description,
        Money.Format(Money.FromDecimal(e.Amount, c.Currency), c.Currency),
        Parsing.DateText(e.ExpenseDate),
        e.Version,
        e.UpdatedAt,
        GroupPolicy.Check(GroupAction.EditExpense, c.State, c.Me.Id, new ActionTarget(ExpensePayerId: e.PayerParticipantId)) is null);
}
