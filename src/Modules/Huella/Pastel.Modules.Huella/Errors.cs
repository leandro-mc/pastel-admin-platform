using Pastel.SharedKernel;

namespace Pastel.Modules.Huella;

/// <summary>
/// Códigos de error de Huella: <c>huella.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class HuellaErrors
{
    public static readonly Error NotFound = Error.NotFound("huella.resource.not_found", "No encontramos lo que busca.");
}
