using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Common;

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

    public FieldErrors Add(string field, Error error) => Add(field, error.Message);

    public Error ToError() => Error.Validation(
        BalanceErrors.ValidationFailed.Code, BalanceErrors.ValidationFailed.Message, _errors.ToDictionary(x => x.Key, x => x.Value.ToArray()));
}
