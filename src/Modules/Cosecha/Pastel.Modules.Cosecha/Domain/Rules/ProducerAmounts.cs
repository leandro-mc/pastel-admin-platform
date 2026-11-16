using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>
/// Montos a un productor (<c>docs/modules/COSECHA.md</c> §5). La base calcula las mismas cifras como columnas generadas
/// (<c>accepted_kg</c>, <c>amount_crc</c>); esta función sirve para previsualizar antes de guardar y es la que prueba la regla.
/// </summary>
internal static class ProducerAmounts
{
    /// <summary>Aceptado = recibido − rechazado (no negativo).</summary>
    public static decimal AcceptedKg(decimal receivedKg, decimal rejectedKg)
    {
        Guard.That(receivedKg >= 0 && rejectedKg >= 0 && rejectedKg <= receivedKg, "Los kilos rechazados no pueden superar los recibidos.");
        return receivedKg - rejectedKg;
    }

    /// <summary>Monto en colones: kilos aceptados × precio, a 2 decimales, hacia el más cercano y la mitad hacia arriba.</summary>
    public static decimal Amount(decimal acceptedKg, decimal pricePerKg) =>
        decimal.Round(acceptedKg * pricePerKg, 2, MidpointRounding.AwayFromZero);
}
