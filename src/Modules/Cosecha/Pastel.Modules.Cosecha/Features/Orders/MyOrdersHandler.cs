using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Orders;

/// <summary>Vista del comprador: sin notas internas, sin motivos de cancelación y sin nada de productores, pagos ni márgenes.</summary>
internal sealed record MyOrderSummary(Guid Id, string BuyerName, DateOnly RequiredOn, string Progress, decimal OrderedKg, decimal DeliveredKg, decimal TotalCrc);

internal sealed record MyOrderDetail(MyOrderSummary Summary, IReadOnlyList<OrderLineDto> Lines, IReadOnlyList<OrderShipmentDto> Shipments);

/// <summary>
/// Aislamiento entre compradores: toda consulta parte de los compradores vinculados a la cuenta de la sesión (<c>buyers.user_id</c>).
/// Un pedido ajeno o inexistente responde igual (404): no se revela que existe. Los borradores no se muestran.
/// </summary>
internal sealed class MyOrdersHandler(CosechaDbContext db, ICurrentUser currentUser, OrderQueries queries)
{
    public async Task<PagedResult<MyOrderSummary>> ListAsync(PageRequest page, CancellationToken ct)
    {
        var buyerIds = await OwnBuyerIdsAsync(ct);
        if (buyerIds.Count == 0)
        {
            return new PagedResult<MyOrderSummary>([], page.Page, page.PageSize, 0);
        }

        var query = db.Orders.AsNoTracking().Where(o => buyerIds.Contains(o.BuyerId) && o.Status != OrderStatus.Draft);
        var total = await query.CountAsync(ct);
        var orders = await query.OrderByDescending(o => o.RequiredOn).Skip(page.Skip).Take(page.PageSize).ToListAsync(ct);
        var items = (await queries.SummariesAsync(orders, ct)).Select(ToSummary).ToList();
        return new PagedResult<MyOrderSummary>(items, page.Page, page.PageSize, total);
    }

    public async Task<Result<MyOrderDetail>> GetAsync(Guid id, CancellationToken ct)
    {
        var buyerIds = await OwnBuyerIdsAsync(ct);
        var order = buyerIds.Count == 0
            ? null
            : await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id && buyerIds.Contains(o.BuyerId) && o.Status != OrderStatus.Draft, ct);
        if (order is null)
        {
            return CosechaErrors.NotFound;
        }

        var summary = (await queries.SummariesAsync([order], ct))[0];
        return new MyOrderDetail(ToSummary(summary), await queries.LinesAsync(id, ct), await queries.ShipmentsAsync(id, ct));
    }

    private async Task<List<Guid>> OwnBuyerIdsAsync(CancellationToken ct)
    {
        if (currentUser.UserId is not { } userId)
        {
            return [];
        }

        return await db.Buyers.AsNoTracking().Where(b => b.UserId == userId).Select(b => b.Id).ToListAsync(ct);
    }

    private static MyOrderSummary ToSummary(OrderSummary s) => new(s.Id, s.BuyerName, s.RequiredOn, s.Progress, s.OrderedKg, s.DeliveredKg, s.TotalCrc);
}
