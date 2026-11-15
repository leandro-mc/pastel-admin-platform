using Microsoft.Extensions.Logging;

namespace Pastel.Platform.Observability;

/// <summary>
/// Identificadores de evento por módulo (rangos de <c>ERROR_HANDLING_AND_LOGGING.md</c> 4.2):
/// Identity 1000–1999, Brisa 2000, Balance 3000, Ágora 4000, Cosecha 5000, Huella 6000, Plataforma 9000.
/// </summary>
public static class PastelEventIds
{
    public static readonly EventId UnhandledError = new(9001, nameof(UnhandledError));
    public static readonly EventId RequestRejected = new(9002, nameof(RequestRejected));
    public static readonly EventId AccessDenied = new(9003, nameof(AccessDenied));
    public static readonly EventId CsrfRejected = new(9004, nameof(CsrfRejected));
    public static readonly EventId RateLimited = new(9005, nameof(RateLimited));
    public static readonly EventId AuditFailure = new(9006, nameof(AuditFailure));
    public static readonly EventId ClientError = new(9010, nameof(ClientError));
    public static readonly EventId Startup = new(9020, nameof(Startup));
    public static readonly EventId BackgroundFailure = new(9030, nameof(BackgroundFailure));
}
