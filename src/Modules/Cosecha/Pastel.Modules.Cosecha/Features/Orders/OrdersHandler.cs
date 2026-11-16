using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Orders;

internal sealed record OrderLineInput(Guid? ProductId, decimal? Kilograms, decimal? PricePerKg);

/// <summary><c>Confirm</c> solo se usa al crear (guarda directamente como confirmado). <c>Note</c> explica el cambio y es obligatoria al editar un pedido cerrado.</summary>
internal sealed record OrderRequest(
    Guid? BuyerId, Guid? SeasonId, DateOnly? RequiredOn, string? Notes, IReadOnlyList<OrderLineInput>? Lines, bool Confirm, string? Note, uint Version);

internal sealed record OrderVersionRequest(uint Version);

internal sealed record CancelOrderRequest(string? Reason, uint Version);

internal sealed record OrderFilter(Guid? SeasonId, Guid? BuyerId, string? Status, DateOnly? From, DateOnly? To, string? Search);

internal sealed record OrderDetail(
    OrderSummary Summary, string? Notes, string? CancelReason, DateTimeOffset? CancelledAt, IReadOnlyList<OrderLineDto> Lines,
    IReadOnlyList<OrderShipmentDto> Shipments, IReadOnlyList<ChangeDto> Changes);

internal sealed class OrdersHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog, OrderQueries queries, IAuditTrail audit)
{
    private const int MaxLines = 10;
    private const int MaxRowsPerList = 2000;

    public async Task<Result<PagedResult<OrderSummary>>> ListAsync(OrderFilter filter, PageRequest page, CancellationToken ct)
    {
        OrderStatus? stored = null;
        string? progress = null;
        if (Texts.Clean(filter.Status) is { } status)
        {
            if (Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsedStatus) && Enum.IsDefined(parsedStatus))
            {
                stored = parsedStatus;
            }
            else if (Enum.TryParse<OrderProgress>(status, ignoreCase: true, out var parsedProgress) && Enum.IsDefined(parsedProgress))
            {
                progress = parsedProgress.ToString();
            }
            else
            {
                return new FieldErrors().Add("status", "Estado desconocido.").ToError("cosecha.order.invalid");
            }
        }

        var query = db.Orders.AsNoTracking().AsQueryable();
        if (filter.SeasonId is { } seasonId)
        {
            query = query.Where(o => o.SeasonId == seasonId);
        }

        if (filter.BuyerId is { } buyerId)
        {
            query = query.Where(o => o.BuyerId == buyerId);
        }

        if (stored is { } storedStatus)
        {
            query = query.Where(o => o.Status == storedStatus);
        }

        if (filter.From is { } from)
        {
            query = query.Where(o => o.RequiredOn >= from);
        }

        if (filter.To is { } to)
        {
            query = query.Where(o => o.RequiredOn <= to);
        }

        if (Texts.Clean(filter.Search) is { } term)
        {
            var normalized = Texts.Normalize(term);
            query = query.Where(o => db.Buyers.Any(b => b.Id == o.BuyerId && b.NormalizedName.Contains(normalized)));
        }

        // «Parcial» y «Entregado» se derivan de lo entregado: se calcula sobre las filas filtradas (acotadas) y se pagina en memoria.
        var orders = await query.OrderByDescending(o => o.RequiredOn).ThenBy(o => o.CreatedAt).Take(MaxRowsPerList).ToListAsync(ct);
        var summaries = await queries.SummariesAsync(orders, ct);
        var filtered = progress is null ? summaries : summaries.Where(s => s.Progress == progress).ToList();
        var items = filtered.Skip(page.Skip).Take(page.PageSize).ToList();
        return new PagedResult<OrderSummary>(items, page.Page, page.PageSize, filtered.Count);
    }

    public async Task<Result<OrderDetail>> GetAsync(Guid id, CancellationToken ct) =>
        await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;

    public async Task<Result<OrderDetail>> CreateAsync(OrderRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var requiredOn = errors.RequiredDate("requiredOn", request.RequiredOn);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var lines = ParseLines(errors, request.Lines);
        if (request.BuyerId is null)
        {
            errors.Add("buyerId", "Elija un comprador.");
        }

        if (request.SeasonId is null)
        {
            errors.Add("seasonId", "Elija una temporada.");
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.order.invalid");
        }

        var buyer = await db.Buyers.AsNoTracking().FirstOrDefaultAsync(b => b.Id == request.BuyerId, ct);
        var season = await db.Seasons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SeasonId, ct);
        if (buyer is null || season is null)
        {
            return errors.Add(buyer is null ? "buyerId" : "seasonId", "Elija una opción válida.").ToError("cosecha.order.invalid");
        }

        if (buyer.ArchivedAt is not null)
        {
            return CosechaErrors.RecordArchived;
        }

        if (season.Status != SeasonStatus.Active)
        {
            return CosechaErrors.SeasonClosed;
        }

        if (await CheckProductsAsync(errors, lines, activeRequired: true, ct) is { } problem)
        {
            return problem;
        }

        var order = stamper.Created(new Order
        {
            BuyerId = buyer.Id,
            SeasonId = season.Id,
            RequiredOn = requiredOn!.Value,
            Status = request.Confirm ? OrderStatus.Confirmed : OrderStatus.Draft,
            Notes = notes,
        });
        db.Orders.Add(order);
        foreach (var line in lines)
        {
            db.OrderLines.Add(new OrderLine { OrderId = order.Id, ProductId = line.ProductId, Kilograms = line.Kilograms, PricePerKg = line.PricePerKg, SortOrder = line.SortOrder });
        }

        await db.SaveChangesAsync(ct);
        return await DetailAsync(order.Id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result<OrderDetail>> UpdateAsync(Guid id, OrderRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var requiredOn = errors.RequiredDate("requiredOn", request.RequiredOn);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var note = errors.OptionalText("note", request.Note, 500);
        var lines = ParseLines(errors, request.Lines);
        if (errors.Any)
        {
            return errors.ToError("cosecha.order.invalid");
        }

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
        {
            return CosechaErrors.NotFound;
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return CosechaErrors.OrderCancelled;
        }

        var existing = await db.OrderLines.Where(l => l.OrderId == id).ToListAsync(ct);
        var productNames = await db.Products.AsNoTracking().ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var newProducts = lines.Where(l => existing.All(e => e.ProductId != l.ProductId)).ToList();
        if (await CheckProductsAsync(errors, newProducts, activeRequired: true, ct) is { } problem)
        {
            return problem;
        }

        // Un pedido entregado o de una temporada cerrada es un registro cerrado: editarlo exige una nota.
        var delivered = await db.ShipmentOrders.Where(so => so.OrderId == id).SumAsync(so => so.DeliveredKg ?? 0m, ct);
        var seasonClosed = await db.Seasons.AnyAsync(s => s.Id == order.SeasonId && s.Status == SeasonStatus.Closed, ct);
        var isClosed = seasonClosed || OrderRules.ProgressOf(order.Status, existing.Sum(l => l.Kilograms), delivered) == OrderProgress.Delivered;
        if (isClosed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        db.Expect(order, request.Version);
        changeLog.Record(nameof(Order), id, "Fecha requerida", order.RequiredOn, requiredOn, note);
        order.RequiredOn = requiredOn!.Value;
        order.Notes = notes;
        stamper.Updated(order);

        var priceChanged = false;
        foreach (var line in lines)
        {
            var name = productNames.GetValueOrDefault(line.ProductId) ?? "producto";
            var current = existing.FirstOrDefault(e => e.ProductId == line.ProductId);
            if (current is null)
            {
                changeLog.Record(nameof(Order), id, Texts.Truncate($"Kilos ({name})", 60), null, line.Kilograms, note);
                changeLog.Record(nameof(Order), id, Texts.Truncate($"Precio por kilo ({name})", 60), null, line.PricePerKg, note);
                db.OrderLines.Add(new OrderLine { OrderId = id, ProductId = line.ProductId, Kilograms = line.Kilograms, PricePerKg = line.PricePerKg, SortOrder = line.SortOrder });
                continue;
            }

            changeLog.Record(nameof(Order), id, Texts.Truncate($"Kilos ({name})", 60), current.Kilograms, line.Kilograms, note);
            changeLog.Record(nameof(Order), id, Texts.Truncate($"Precio por kilo ({name})", 60), current.PricePerKg, line.PricePerKg, note);
            priceChanged |= current.PricePerKg != line.PricePerKg;
            current.Kilograms = line.Kilograms;
            current.PricePerKg = line.PricePerKg;
            current.SortOrder = line.SortOrder;
        }

        foreach (var removed in existing.Where(e => lines.All(l => l.ProductId != e.ProductId)))
        {
            var name = productNames.GetValueOrDefault(removed.ProductId) ?? "producto";
            changeLog.Record(nameof(Order), id, Texts.Truncate($"Kilos ({name})", 60), removed.Kilograms, null, note);
            db.OrderLines.Remove(removed);
        }

        await db.SaveChangesAsync(ct);
        if (priceChanged)
        {
            await audit.WriteAsync(new AuditRecord("cosecha.order.price_changed", "cosecha", stamper.UserId, Target: id.ToString(), After: new { note }), ct);
        }

        return await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result<OrderDetail>> ConfirmAsync(Guid id, OrderVersionRequest request, CancellationToken ct)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
        {
            return CosechaErrors.NotFound;
        }

        if (order.Status != OrderStatus.Draft)
        {
            return CosechaErrors.OrderNotDraft;
        }

        if (await db.Seasons.AnyAsync(s => s.Id == order.SeasonId && s.Status == SeasonStatus.Closed, ct))
        {
            return CosechaErrors.SeasonClosed;
        }

        db.Expect(order, request.Version);
        order.Status = OrderStatus.Confirmed;
        stamper.Updated(order);
        await db.SaveChangesAsync(ct);
        return await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    /// <summary>Cancela con motivo. No se cancela un pedido con entregas registradas ni uno que aún está en un envío abierto.</summary>
    public async Task<Result<OrderDetail>> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken ct)
    {
        if (Texts.Clean(request.Reason) is not { } reason || reason.Length > 500)
        {
            return CosechaErrors.ReasonRequired;
        }

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
        {
            return CosechaErrors.NotFound;
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return CosechaErrors.OrderCancelled;
        }

        var assigned = await db.ShipmentOrders.AsNoTracking().Where(so => so.OrderId == id).ToListAsync(ct);
        if (assigned.Any(so => so.DeliveredKg is > 0))
        {
            return CosechaErrors.OrderHasDeliveries;
        }

        var shipmentIds = assigned.Select(so => so.ShipmentId).ToList();
        if (await db.Shipments.AnyAsync(s => shipmentIds.Contains(s.Id) && s.Status != ShipmentStatus.Closed, ct))
        {
            return CosechaErrors.OrderInOpenShipment;
        }

        db.Expect(order, request.Version);
        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = stamper.Now;
        order.CancelReason = reason;
        stamper.Updated(order);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(new AuditRecord("cosecha.order.cancelled", "cosecha", stamper.UserId, Target: id.ToString(), After: new { reason }), ct);
        return await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    private async Task<OrderDetail?> DetailAsync(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
        {
            return null;
        }

        var summary = (await queries.SummariesAsync([order], ct))[0];
        return new OrderDetail(
            summary,
            order.Notes,
            order.CancelReason,
            order.CancelledAt,
            await queries.LinesAsync(id, ct),
            await queries.ShipmentsAsync(id, ct),
            await db.RecentChangesAsync(nameof(Order), [id], 50, ct));
    }

    private async Task<Error?> CheckProductsAsync(FieldErrors errors, IReadOnlyList<ParsedLine> lines, bool activeRequired, CancellationToken ct)
    {
        if (lines.Count == 0)
        {
            return null;
        }

        var ids = lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await db.Products.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync(ct);
        foreach (var line in lines)
        {
            var product = products.FirstOrDefault(p => p.Id == line.ProductId);
            if (product is null || (activeRequired && !product.IsActive))
            {
                errors.Add($"lines[{line.SortOrder}].productId", "Elija un producto activo.");
            }
        }

        return errors.Any ? errors.ToError("cosecha.order.invalid") : null;
    }

    private static List<ParsedLine> ParseLines(FieldErrors errors, IReadOnlyList<OrderLineInput>? inputs)
    {
        var lines = new List<ParsedLine>();
        if (inputs is null || inputs.Count == 0)
        {
            errors.Add("lines", "Agregue al menos una línea.");
            return lines;
        }

        if (inputs.Count > MaxLines)
        {
            errors.Add("lines", $"Se admiten hasta {MaxLines} líneas.");
            return lines;
        }

        for (var i = 0; i < inputs.Count; i++)
        {
            if (inputs[i].ProductId is not { } productId)
            {
                errors.Add($"lines[{i}].productId", "Elija un producto.");
                continue;
            }

            if (lines.Any(l => l.ProductId == productId))
            {
                errors.Add($"lines[{i}].productId", "Este producto está repetido.");
                continue;
            }

            var kilograms = errors.RequiredDecimal($"lines[{i}].kilograms", inputs[i].Kilograms, 0.01m, 10_000_000m);
            var price = errors.RequiredDecimal($"lines[{i}].pricePerKg", inputs[i].PricePerKg, 0m, 1_000_000m);
            if (kilograms is not null && price is not null)
            {
                lines.Add(new ParsedLine(productId, kilograms.Value, price.Value, i));
            }
        }

        return lines;
    }

    private sealed record ParsedLine(Guid ProductId, decimal Kilograms, decimal PricePerKg, int SortOrder);
}
