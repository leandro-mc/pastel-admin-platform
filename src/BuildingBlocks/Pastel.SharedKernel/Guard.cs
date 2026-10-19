using System.Diagnostics.CodeAnalysis;

namespace Pastel.SharedKernel;

/// <summary>Comprobaciones de errores de programación (no de entrada de usuario; esas son <see cref="Result"/>).</summary>
public static class Guard
{
    public static T NotNull<T>([NotNull] T? value, string paramName)
        where T : class =>
        value ?? throw new ArgumentNullException(paramName);

    public static string NotNullOrWhiteSpace([NotNull] string? value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("El valor no puede estar vacío.", paramName);
        }

        return value;
    }

    public static void That(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
