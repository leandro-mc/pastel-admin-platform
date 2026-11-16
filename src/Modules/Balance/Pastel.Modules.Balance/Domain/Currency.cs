namespace Pastel.Modules.Balance.Domain;

/// <summary>Moneda ISO 4217 admitida por Balance: <see cref="Decimals"/> es el exponente ISO (0 o 2).</summary>
internal sealed record Currency(string Code, int NumericCode, string Name, string Symbol, int Decimals, int SortOrder);

/// <summary>
/// Catálogo de 40 monedas (inventario §12.8: no se agrega una para llegar a 41). Fuente de verdad de la lógica; la migración
/// siembra <c>balance.currencies</c> con estos mismos datos para que la base impida códigos fuera del catálogo.
/// Para actualizarlo: editar esta lista y agregar una migración con el <c>INSERT</c> o <c>UPDATE</c> equivalente (ver <c>MODULE.md</c>).
/// </summary>
internal static class CurrencyCatalog
{
    /// <summary>Las primeras monedas de la lista se ofrecen como «más usadas» en la interfaz.</summary>
    public const int FeaturedCount = 15;

    private static readonly Currency[] Items = Build();

    private static readonly Dictionary<string, Currency> ByCode = Items.ToDictionary(x => x.Code, StringComparer.Ordinal);

    public static IReadOnlyList<Currency> All => Items;

    public static bool TryGet(string? code, out Currency currency)
    {
        if (code is not null && ByCode.TryGetValue(code, out var found))
        {
            currency = found;
            return true;
        }

        currency = null!;
        return false;
    }

    public static Currency Get(string code) =>
        TryGet(code, out var currency) ? currency : throw new InvalidOperationException($"Moneda fuera del catálogo: {code}.");

    private static Currency[] Build()
    {
        (string Code, int Numeric, string Name, string Symbol, int Decimals)[] rows =
        [
            ("CRC", 188, "Colón costarricense", "₡", 2), ("USD", 840, "Dólar estadounidense", "$", 2), ("EUR", 978, "Euro", "€", 2),
            ("MXN", 484, "Peso mexicano", "$", 2), ("COP", 170, "Peso colombiano", "$", 2), ("ARS", 32, "Peso argentino", "$", 2),
            ("CLP", 152, "Peso chileno", "$", 0), ("UYU", 858, "Peso uruguayo", "$U", 2), ("DOP", 214, "Peso dominicano", "RD$", 2),
            ("CUP", 192, "Peso cubano", "$", 2), ("PHP", 608, "Peso filipino", "₱", 2), ("JPY", 392, "Yen japonés", "¥", 0),
            ("CNY", 156, "Yuan renminbi chino", "¥", 2), ("KRW", 410, "Won surcoreano", "₩", 0), ("PEN", 604, "Sol peruano", "S/", 2),
            ("BRL", 986, "Real brasileño", "R$", 2), ("GTQ", 320, "Quetzal guatemalteco", "Q", 2), ("HNL", 340, "Lempira hondureño", "L", 2),
            ("NIO", 558, "Córdoba nicaragüense", "C$", 2), ("PAB", 590, "Balboa panameño", "B/.", 2), ("PYG", 600, "Guaraní paraguayo", "₲", 0),
            ("BOB", 68, "Boliviano", "Bs.", 2), ("VES", 928, "Bolívar venezolano", "Bs.S", 2), ("CAD", 124, "Dólar canadiense", "$", 2),
            ("GBP", 826, "Libra esterlina", "£", 2), ("CHF", 756, "Franco suizo", "CHF", 2), ("SEK", 752, "Corona sueca", "kr", 2),
            ("NOK", 578, "Corona noruega", "kr", 2), ("DKK", 208, "Corona danesa", "kr", 2), ("PLN", 985, "Esloti polaco", "zł", 2),
            ("AUD", 36, "Dólar australiano", "$", 2), ("NZD", 554, "Dólar neozelandés", "$", 2), ("SGD", 702, "Dólar singapurense", "$", 2),
            ("HKD", 344, "Dólar de Hong Kong", "$", 2), ("INR", 356, "Rupia india", "₹", 2), ("THB", 764, "Baht tailandés", "฿", 2),
            ("TRY", 949, "Lira turca", "₺", 2), ("ZAR", 710, "Rand sudafricano", "R", 2),
            ("AED", 784, "Dírham de los Emiratos Árabes Unidos", "AED", 2), ("ILS", 376, "Nuevo shéquel israelí", "₪", 2),
        ];

        return rows.Select((r, i) => new Currency(r.Code, r.Numeric, r.Name, r.Symbol, r.Decimals, i + 1)).ToArray();
    }
}
