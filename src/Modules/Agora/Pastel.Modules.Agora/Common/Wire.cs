using System.Text.Json;

namespace Pastel.Modules.Agora.Common;

/// <summary>Los enums viajan como texto en camelCase (<c>facts</c>, <c>modifiedAfterVerification</c>), nunca como números.</summary>
internal static class Wire
{
    public static string Of<TEnum>(TEnum value)
        where TEnum : struct, Enum =>
        JsonNamingPolicy.CamelCase.ConvertName(value.ToString());

    /// <summary>Convierte texto a enum rechazando números y valores no definidos.</summary>
    public static bool TryParse<TEnum>(string? text, out TEnum value)
        where TEnum : struct, Enum
    {
        value = default;
        if (string.IsNullOrWhiteSpace(text) || char.IsDigit(text[0]) || text[0] == '-')
        {
            return false;
        }

        return Enum.TryParse(text.Trim(), ignoreCase: true, out value) && Enum.IsDefined(value);
    }
}
