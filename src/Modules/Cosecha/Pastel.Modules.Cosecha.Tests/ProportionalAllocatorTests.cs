using Pastel.Modules.Cosecha.Domain.Rules;
using Xunit;

namespace Pastel.Modules.Cosecha.Tests;

/// <summary>Reparto proporcional: casos 1 a 4 de <c>docs/modules/COSECHA.md</c> §10 (resultados calculados desde la ficha).</summary>
public sealed class ProportionalAllocatorTests
{
    private static readonly Guid A = Guid.Parse("00000000-0000-0000-0000-00000000000a");
    private static readonly Guid B = Guid.Parse("00000000-0000-0000-0000-00000000000b");
    private static readonly Guid C = Guid.Parse("00000000-0000-0000-0000-00000000000c");

    private static AllocationParticipant[] Producers(decimal? capA = null, decimal? capB = null, decimal? capC = null) =>
        [new(A, 50, capA), new(B, 30, capB), new(C, 20, capC)];

    private static decimal[] Kg(AllocationResult result) =>
        [.. new[] { A, B, C }.Select(id => result.Shares.Single(share => share.Id == id).Kg)];

    [Fact]
    public void Splits_in_proportion_to_capacity()
    {
        var result = ProportionalAllocator.Allocate(100, Producers());

        Assert.Equal(new[] { 50m, 30m, 20m }, Kg(result));
        Assert.Equal(0m, result.ShortfallKg);
    }

    [Fact]
    public void Gives_the_remainder_to_the_largest_fraction_so_the_sum_is_exact()
    {
        var result = ProportionalAllocator.Allocate(101, Producers());

        Assert.Equal(new[] { 51m, 30m, 20m }, Kg(result));
        Assert.Equal(101m, result.AllocatedKg);
    }

    [Fact]
    public void Caps_a_producer_and_redistributes_the_excess_among_the_rest()
    {
        var result = ProportionalAllocator.Allocate(100, Producers(capA: 20));

        Assert.Equal(new[] { 20m, 48m, 32m }, Kg(result));
    }

    [Fact]
    public void Reports_the_shortfall_when_the_caps_do_not_add_up_to_the_target()
    {
        var result = ProportionalAllocator.Allocate(100, Producers(10, 10, 10));

        Assert.Equal(new[] { 10m, 10m, 10m }, Kg(result));
        Assert.Equal(30m, result.AllocatedKg);
        Assert.Equal(70m, result.ShortfallKg);
    }
}
