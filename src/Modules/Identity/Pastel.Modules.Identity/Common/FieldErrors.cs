using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Common;

/// <summary>Acumula errores por campo para devolver un único <c>problem+json</c> de validación (400).</summary>
internal sealed class FieldErrors
{
    private readonly Dictionary<string, List<string>> _errors = new(StringComparer.Ordinal);

    public bool Any => _errors.Count > 0;

    public FieldErrors Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list))
        {
            _errors[field] = list = [];
        }

        list.Add(message);
        return this;
    }

    public Error ToError(string code, string message = "Revise los datos e intente de nuevo.") =>
        Error.Validation(code, message, _errors.ToDictionary(x => x.Key, x => x.Value.ToArray()));
}
