using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha;

/// <summary>
/// Códigos de error de Cosecha: <c>cosecha.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class CosechaErrors
{
    public static readonly Error NotFound = Error.NotFound("cosecha.resource.not_found", "No encontramos lo que busca.");
}
