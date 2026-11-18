using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>Productor candidato al reparto: su peso (capacidad estimada), un tope opcional de ese envío y si participa.</summary>
internal sealed record AllocationParticipant(Guid Id, decimal Weight, decimal? CapKg = null, bool Included = true);

internal sealed record AllocationShare(Guid Id, decimal Kg);

/// <summary><see cref="ShortfallKg"/> es lo que no se pudo repartir (los topes suman menos que el objetivo); debe mostrarse de forma destacada.</summary>
internal sealed record AllocationResult(IReadOnlyList<AllocationShare> Shares, decimal TargetKg, decimal AllocatedKg, decimal ShortfallKg);

/// <summary>
/// Reparto proporcional a la capacidad (<c>docs/modules/COSECHA.md</c> §5). Función pura y determinista:
/// reparte en proporción al peso; quien supere su tope queda en el tope y el sobrante se redistribuye entre los demás
/// (se repite hasta estabilizar); redondea al paso con el método del mayor resto para que la suma sea exacta cuando es factible.
/// Quien está excluido o tiene peso 0 recibe 0. El objetivo se redondea hacia arriba al paso: nunca se pide de menos.
/// Los desempates usan el identificador, así el resultado no depende del orden de entrada.
/// </summary>
internal static class ProportionalAllocator
{
    public const decimal DefaultStepKg = 1m;

    public static AllocationResult Allocate(decimal targetKg, IReadOnlyCollection<AllocationParticipant> participants, decimal stepKg = DefaultStepKg)
    {
        Guard.That(stepKg > 0, "El paso del reparto debe ser mayor que cero.");
        Guard.That(targetKg >= 0, "La cantidad objetivo no puede ser negativa.");

        var targetUnits = (long)decimal.Ceiling(targetKg / stepKg);
        var rows = participants
            .OrderBy(p => p.Id)
            .Select(p => new Row(p.Id, p.Included && p.Weight > 0 ? p.Weight : 0m, CapInUnits(p, stepKg)))
            .ToList();

        // Reparto «de llenado»: se fijan en su tope quienes lo superan y se reparte el resto entre los demás.
        var active = rows.Where(r => r.Weight > 0 && r.CapUnits > 0).ToList();
        var remaining = (decimal)targetUnits;
        while (active.Count > 0 && remaining > 0)
        {
            var totalWeight = active.Sum(r => r.Weight);
            var capped = active.Where(r => remaining * r.Weight / totalWeight > r.CapUnits).ToList();
            if (capped.Count == 0)
            {
                foreach (var row in active)
                {
                    row.Ideal = remaining * row.Weight / totalWeight;
                }

                break;
            }

            foreach (var row in capped)
            {
                row.Units = row.CapUnits;
                remaining -= row.CapUnits;
                active.Remove(row);
            }
        }

        foreach (var row in active)
        {
            row.Units = (long)decimal.Floor(row.Ideal);
        }

        // Mayor resto: las unidades que faltan para llegar al objetivo van a quien tiene mayor parte decimal (y tiene holgura).
        var leftover = targetUnits - rows.Sum(r => r.Units);
        foreach (var row in active.OrderByDescending(r => r.Ideal - decimal.Floor(r.Ideal)).ThenByDescending(r => r.Weight).ThenBy(r => r.Id))
        {
            if (leftover <= 0)
            {
                break;
            }

            if (row.Units < row.CapUnits)
            {
                row.Units++;
                leftover--;
            }
        }

        var allocatedUnits = rows.Sum(r => r.Units);
        return new AllocationResult(
            rows.Select(r => new AllocationShare(r.Id, r.Units * stepKg)).ToList(),
            targetUnits * stepKg,
            allocatedUnits * stepKg,
            (targetUnits - allocatedUnits) * stepKg);
    }

    private static long CapInUnits(AllocationParticipant participant, decimal stepKg) =>
        participant.CapKg is { } cap ? (long)decimal.Floor(Math.Max(cap, 0m) / stepKg) : long.MaxValue;

    private sealed class Row(Guid id, decimal weight, long capUnits)
    {
        public Guid Id { get; } = id;

        public decimal Weight { get; } = weight;

        public long CapUnits { get; } = capUnits;

        public long Units { get; set; }

        public decimal Ideal { get; set; }
    }
}
