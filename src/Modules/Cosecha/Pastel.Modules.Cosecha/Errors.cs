using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha;

/// <summary>
/// Códigos de error de Cosecha: <c>cosecha.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class CosechaErrors
{
    public static readonly Error NotFound = Error.NotFound("cosecha.resource.not_found", "No encontramos lo que busca.");

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
