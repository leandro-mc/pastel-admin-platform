using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Expenses;

internal sealed record ExpenseQuery(int? Page, int? PageSize, string? Q, Guid? PayerId, string? From, string? To, string? Order);

/// <param name="PayerId">Quién pagó; si se omite, quien registra. Un miembro solo puede registrar gastos que él pagó.</param>
/// <param name="Amount">Cadena decimal con punto («12.50»); nunca un número JSON.</param>
/// <param name="Date">Fecha de calendario <c>yyyy-MM-dd</c>.</param>
/// <param name="Version">Versión que la persona vio al editar; si cambió, la respuesta es 409.</param>
internal sealed record ExpenseRequest(Guid? PayerId, string? Description, string? Amount, string? Date, uint Version);

internal sealed record SheetRowRequest(Guid? Id, Guid? PayerId, string? Description, string? Amount, string? Date, uint Version);

internal sealed record SheetRequest(IReadOnlyList<SheetRowRequest>? Rows, IReadOnlyList<Guid>? DeletedIds);

/// <summary>
/// Gastos del grupo. Leer exige <c>balance.access</c>; escribir, <c>balance.groups.manage</c> y, dentro del grupo, ser administrador o
/// quien pagó el gasto. Los montos van y vienen como cadena decimal.
/// </summary>
internal static class ExpensesEndpoint
{
    public static void Map(IEndpointRouteBuilder api)
    {
        var expenses = api.MapGroup("/groups/{groupId:guid}/expenses");

        expenses.MapGet("", async (Guid groupId, [AsParameters] ExpenseQuery query, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.ListAsync(groupId, query, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        expenses.MapPost("", async (Guid groupId, ExpenseRequest request, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.CreateAsync(groupId, request, ct)).ToResponse(http, StatusCodes.Status201Created)).RequirePermission(BalancePermissions.GroupsManage);

        expenses.MapPut("/{expenseId:guid}", async (Guid groupId, Guid expenseId, ExpenseRequest request, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.UpdateAsync(groupId, expenseId, request, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);

        expenses.MapDelete("/{expenseId:guid}", async (Guid groupId, Guid expenseId, uint? version, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.DeleteAsync(groupId, expenseId, version, ct)).ToNoContent(http)).RequirePermission(BalancePermissions.GroupsManage);

        expenses.MapGet("/sheet", async (Guid groupId, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.GetSheetAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        expenses.MapPut("/sheet", async (Guid groupId, SheetRequest request, ExpensesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SaveSheetAsync(groupId, request, ct)).ToResponse(http)).RequirePermission(BalancePermissions.GroupsManage);
    }
}
