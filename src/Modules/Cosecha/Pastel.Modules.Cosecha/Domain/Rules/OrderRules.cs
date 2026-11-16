namespace Pastel.Modules.Cosecha.Domain.Rules;

internal static class OrderRules
{
    /// <summary>Total de una línea de pedido: kilos × precio al comprador, a 2 decimales (la mitad hacia arriba).</summary>
    public static decimal LineTotal(decimal kilograms, decimal pricePerKg) => decimal.Round(kilograms * pricePerKg, 2, MidpointRounding.AwayFromZero);

    /// <summary>Avance derivado: un pedido confirmado pasa a Parcial al entregarse algo y a Entregado al cubrir lo pedido.</summary>
    public static OrderProgress ProgressOf(OrderStatus status, decimal orderedKg, decimal deliveredKg) => status switch
    {
        OrderStatus.Draft => OrderProgress.Draft,
        OrderStatus.Cancelled => OrderProgress.Cancelled,
        _ => deliveredKg <= 0 ? OrderProgress.Confirmed : deliveredKg >= orderedKg ? OrderProgress.Delivered : OrderProgress.PartiallyDelivered,
    };

    /// <summary>Kilos de un pedido que aún no están entregados ni comprometidos en otro envío abierto (nunca negativo).</summary>
    public static decimal PendingKg(decimal orderedKg, decimal deliveredKg, decimal plannedElsewhereKg) =>
        Math.Max(orderedKg - deliveredKg - plannedElsewhereKg, 0m);
}
