using Pastel.SharedKernel;

namespace Pastel.Modules.Balance;

/// <summary>
/// Códigos de error de Balance: <c>balance.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class BalanceErrors
{
    public static readonly Error NotFound = Error.NotFound("balance.resource.not_found", "No encontramos lo que busca.");

    // ── Pertenencia y permisos de grupo ──
    public static readonly Error GroupNotFound = Error.NotFound("balance.group.not_found", "No encontramos ese grupo. Si lo esperaba, pida a quien lo administra el enlace y el código de ingreso.");
    public static readonly Error ParticipantNotFound = Error.NotFound("balance.participant.not_found", "No encontramos a esa persona en el grupo.");
    public static readonly Error ExpenseNotFound = Error.NotFound("balance.expense.not_found", "No encontramos ese gasto.");

    /// <summary>Acción reservada a quien administra, o a quien pagó el gasto: dice el motivo y a quién pedirlo.</summary>
    public static Error Forbidden(string reason, string who) =>
        Error.Forbidden("balance.forbidden", string.IsNullOrWhiteSpace(who) ? reason : $"{reason} {who}");

    // ── Estado e invariantes del grupo ──
    public static readonly Error GroupClosed = Error.Conflict("balance.group.closed", "El grupo está cerrado: solo se puede leer. Pida a quien lo administra que lo reabra.");
    public static readonly Error GroupAlreadyClosed = Error.Conflict("balance.group.already_closed", "El grupo ya está cerrado.");
    public static readonly Error GroupNotClosed = Error.Conflict("balance.group.not_closed", "El grupo ya está abierto.");
    public static readonly Error LastAdmin = Error.Conflict("balance.group.last_admin", "El grupo debe tener al menos una persona administradora. Nombre primero a otra persona administradora.");
    public static readonly Error GroupHasExpenses = Error.Conflict("balance.group.has_expenses", "No se puede borrar un grupo con gastos. Elimine primero todos los gastos.");
    public static readonly Error ParticipantHasExpenses = Error.Conflict("balance.participant.has_expenses", "No se puede quitar ni sacar a una persona que pagó gastos. Elimine o reasigne primero sus gastos.");

    public static readonly Error LeaveWithExpenses = Error.Conflict("balance.participant.has_expenses", "No puede salir mientras tenga gastos registrados. Pida que eliminen o reasignen sus gastos y luego salga.");

    public static Error CurrencyDecimalsIncompatible(string currencyCode) => Error.Conflict(
        "balance.group.currency_decimals_incompatible",
        $"No se puede cambiar a {currencyCode}: hay montos con más decimales de los que esa moneda admite.");

    // ── Ingreso por enlace y código ──
    public static readonly Error JoinInvalid = Error.Validation("balance.join.invalid", "El enlace o el código no son válidos. Pida a quien administra el grupo uno nuevo.");

    public static Error JoinRateLimited(int retryAfterSeconds) => Error.TooManyRequests(
        "balance.join.rate_limited", "Demasiados intentos. Intente de nuevo en unos minutos.", retryAfterSeconds);

    // ── Validación de entrada ──
    public static readonly Error ValidationFailed = Error.Validation("balance.validation_failed", "Revise los datos e intente de nuevo.");
    public static readonly Error CurrencyUnknown = Error.Validation("balance.currency.unknown", "Elija una moneda de la lista.");
    public static readonly Error TimeZoneInvalid = Error.Validation("balance.group.time_zone_invalid", "Elija una zona horaria válida, por ejemplo America/Costa_Rica.");
    public static readonly Error AmountRequired = Error.Validation("balance.amount.required", "Escriba el monto.");
    public static readonly Error AmountInvalid = Error.Validation("balance.amount.invalid", "Use solo números, con punto para los decimales.");
    public static readonly Error AmountNotPositive = Error.Validation("balance.amount.not_positive", "El monto debe ser mayor que cero.");
    public static readonly Error AmountTooLarge = Error.Validation("balance.amount.too_large", "El monto es demasiado grande.");

    public static Error AmountTooManyDecimals(int decimals) => Error.Validation(
        "balance.amount.too_many_decimals",
        decimals == 0 ? "Esta moneda no admite decimales." : $"Esta moneda admite hasta {decimals} decimales.");
}
