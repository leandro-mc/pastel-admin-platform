using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha;

/// <summary>
/// Códigos de error de Cosecha: <c>cosecha.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class CosechaErrors
{
    public static readonly Error NotFound = Error.NotFound("cosecha.resource.not_found", "No encontramos lo que busca.");

    public static readonly Error ProductNameTaken = Error.Conflict(
        "cosecha.product.name_taken", "Ya existe un producto con ese nombre.",
        new Dictionary<string, string[]> { ["name"] = ["Ya existe un producto con ese nombre."] });

    public static readonly Error SeasonNameTaken = Error.Conflict(
        "cosecha.season.name_taken", "Ya existe una temporada con ese nombre.",
        new Dictionary<string, string[]> { ["name"] = ["Ya existe una temporada con ese nombre."] });

    public static readonly Error PolicyBackdated = Error.Validation(
        "cosecha.policy.backdated", "La vigencia no puede ser anterior a hoy: cambiaría pagos que ya se calcularon.",
        new Dictionary<string, string[]> { ["effectiveFrom"] = ["Indique hoy o una fecha posterior."] });

    public static readonly Error PolicyRatificationNoteRequired = Error.Validation(
        "cosecha.policy.ratification_note_required", "Para marcar los valores como ratificados indique el acuerdo de asamblea.",
        new Dictionary<string, string[]> { ["note"] = ["Indique la referencia del acta o del acuerdo."] });

    public static readonly Error SeasonClosed = Error.Conflict(
        "cosecha.season.closed", "La temporada está cerrada. Reábrala para registrar pedidos o envíos nuevos.");

    public static readonly Error RecordArchived = Error.Conflict(
        "cosecha.record.archived", "Este registro está archivado. Restáurelo antes de usarlo.");

    public static readonly Error OrderCancelled = Error.Conflict(
        "cosecha.order.cancelled", "El pedido está cancelado y no se puede modificar.");

    public static readonly Error OrderInOpenShipment = Error.Conflict(
        "cosecha.order.in_open_shipment", "El pedido está en un envío que no se ha cerrado. Quítelo del envío antes de cancelarlo.");

    public static readonly Error OrderHasDeliveries = Error.Conflict(
        "cosecha.order.has_deliveries", "El pedido ya tiene entregas registradas y no se puede cancelar.");

    public static readonly Error OrderNotDraft = Error.Conflict(
        "cosecha.order.not_draft", "Solo se puede confirmar un pedido en borrador.");

    public static readonly Error ShipmentOrderCancelled = Error.Conflict(
        "cosecha.shipment.order_cancelled", "No se puede incluir un pedido cancelado en un envío.");

    public static readonly Error ShipmentInvalidTransition = Error.Conflict(
        "cosecha.shipment.invalid_transition", "Ese cambio de estado del envío no está permitido.");

    public static readonly Error DeliveryHasReception = Error.Conflict(
        "cosecha.delivery.has_reception", "La entrega de este productor ya tiene recepción registrada y no se puede quitar.");

    public static readonly Error ShipmentNotDeletable = Error.Conflict(
        "cosecha.shipment.not_deletable", "Solo se puede eliminar un envío planificado que todavía no tiene recepciones ni entregas registradas.");

    public static readonly Error ShipmentOrderDelivered = Error.Conflict(
        "cosecha.shipment.order_delivered", "El pedido ya tiene una entrega registrada en este envío y no se puede quitar.");

    public static readonly Error ShipmentOrderDraft = Error.Validation(
        "cosecha.shipment.order_draft", "Confirme el pedido antes de incluirlo en un envío.",
        new Dictionary<string, string[]> { ["orders"] = ["Hay pedidos en borrador: confírmelos primero."] });

    public static readonly Error ShipmentOrderOtherSeason = Error.Validation(
        "cosecha.shipment.order_other_season", "El pedido es de otra temporada.",
        new Dictionary<string, string[]> { ["orders"] = ["Todos los pedidos deben ser de la temporada del envío."] });

    public static readonly Error DeliveryInvalidTransition = Error.Conflict(
        "cosecha.delivery.invalid_transition", "Ese cambio de estado de la entrega no está permitido.");

    public static readonly Error DeliveryBelowPaid = Error.Conflict(
        "cosecha.delivery.below_paid", "El monto de la entrega no puede quedar por debajo de lo que ya se le pagó al productor.");

    public static readonly Error PaymentExceedsBalance = Error.Conflict(
        "cosecha.payment.exceeds_balance", "El pago supera lo que se le debe al productor.");

    public static readonly Error PaymentNothingToPay = Error.Conflict(
        "cosecha.payment.nothing_to_pay", "El productor no tiene entregas pendientes de pago.");

    public static readonly Error PaymentAlreadyVoided = Error.Conflict(
        "cosecha.payment.already_voided", "El pago ya está anulado.");

    public static readonly Error DocumentsUnavailable = Error.Unavailable(
        "cosecha.documents.unavailable", "La generación de documentos en PDF todavía no está disponible.");

    public static readonly Error ShipmentCloseReasonRequired = Error.Validation(
        "cosecha.shipment.close_reason_required",
        "Hay recepciones o entregas sin registrar. Indique el motivo para cerrar el envío.",
        new Dictionary<string, string[]> { ["reason"] = ["Indique por qué se cierra con registros pendientes."] });

    public static readonly Error ChangeNoteRequired = Error.Validation(
        "cosecha.change.note_required",
        "Para modificar un registro cerrado debe indicar una nota.",
        new Dictionary<string, string[]> { ["note"] = ["Escriba el motivo del cambio."] });

    public static readonly Error ReasonRequired = Error.Validation(
        "cosecha.reason.required",
        "Indique el motivo.",
        new Dictionary<string, string[]> { ["reason"] = ["Escriba el motivo."] });
}
