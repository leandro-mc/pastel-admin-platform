using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>Reglas del ciclo de un envío y de lo que se le puede asignar (<c>docs/modules/COSECHA.md</c> §8).</summary>
internal static class ShipmentRules
{
    /// <summary>Un pedido cancelado no se asigna a un envío.</summary>
    public static bool CanAssign(OrderStatus orderStatus) => orderStatus != OrderStatus.Cancelled;

    /// <summary>Recepciones sin registrar (solicitadas o confirmadas, pero no recibidas ni marcadas sin entrega).</summary>
    public static int UnregisteredReceptions(IEnumerable<DeliveryStatus> deliveries) =>
        deliveries.Count(status => status is DeliveryStatus.Requested or DeliveryStatus.Confirmed);

    /// <summary>Entregas a compradores sin registrar (pedidos del envío sin kilos entregados anotados).</summary>
    public static int UnregisteredDeliveries(IEnumerable<decimal?> deliveredKgByOrder) => deliveredKgByOrder.Count(kg => kg is null);

    /// <summary>No se cierra un envío con recepciones o entregas sin registrar, salvo que se indique el motivo.</summary>
    public static Result CheckClose(IEnumerable<DeliveryStatus> deliveries, IEnumerable<decimal?> deliveredKgByOrder, string? reason)
    {
        var incomplete = UnregisteredReceptions(deliveries) > 0 || UnregisteredDeliveries(deliveredKgByOrder) > 0;
        return incomplete && string.IsNullOrWhiteSpace(reason) ? CosechaErrors.ShipmentCloseReasonRequired : Result.Success();
    }

    /// <summary>Se avanza de a un paso hasta «Entregado» (el cierre es una acción aparte) y se puede retroceder; retroceder exige nota.</summary>
    public static bool IsAllowedTransition(ShipmentStatus from, ShipmentStatus to) =>
        to != from && ((to != ShipmentStatus.Closed && to == from + 1) || to < from);

    public static bool IsBackward(ShipmentStatus from, ShipmentStatus to) => to < from;
}
