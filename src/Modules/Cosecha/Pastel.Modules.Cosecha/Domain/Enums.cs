namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Estado de una temporada. Una temporada cerrada no admite pedidos ni envíos nuevos.</summary>
internal enum SeasonStatus
{
    Active,
    Closed,
}

/// <summary>Estado guardado de un pedido. «Parcial» y «Entregado» no se guardan: se derivan de lo entregado (<see cref="OrderProgress"/>).</summary>
internal enum OrderStatus
{
    Draft,
    Confirmed,
    Cancelled,
}

/// <summary>Avance de un pedido, derivado de su estado guardado y de lo entregado.</summary>
internal enum OrderProgress
{
    Draft,
    Confirmed,
    PartiallyDelivered,
    Delivered,
    Cancelled,
}

/// <summary>Ciclo de un envío. El orden numérico importa: avanzar es sumar uno; retroceder exige una nota.</summary>
internal enum ShipmentStatus
{
    Planned,
    Collecting,
    Collected,
    Delivered,
    Closed,
}

/// <summary>Estado de la entrega de un productor a un envío.</summary>
internal enum DeliveryStatus
{
    Requested,
    Confirmed,
    Received,
    NoDelivery,
}

internal enum DeliveryQuality
{
    Good,
    WithObservations,
    Bad,
}

internal enum PaymentMethod
{
    Cash,
    Sinpe,
    Transfer,
}

/// <summary>Estado de pago de una entrega, derivado de lo aplicado frente a su monto.</summary>
internal enum SettlementStatus
{
    Pending,
    Partial,
    Paid,
}
