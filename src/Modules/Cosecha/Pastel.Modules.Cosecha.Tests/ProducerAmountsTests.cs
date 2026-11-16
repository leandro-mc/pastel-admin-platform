using Pastel.Modules.Cosecha.Domain.Rules;
using Xunit;

namespace Pastel.Modules.Cosecha.Tests;

/// <summary>Montos a un productor: casos 5 y 6 de <c>docs/modules/COSECHA.md</c> §10.</summary>
public sealed class ProducerAmountsTests
{
    [Fact]
    public void Accepted_kilos_are_received_minus_rejected_and_the_amount_is_accepted_times_price()
    {
        var accepted = ProducerAmounts.AcceptedKg(receivedKg: 100m, rejectedKg: 10m);

        Assert.Equal(90m, accepted);
        Assert.Equal(58_500.00m, ProducerAmounts.Amount(accepted, pricePerKg: 650m));
    }

    [Fact]
    public void The_amount_is_rounded_to_two_decimals_with_the_midpoint_going_up()
    {
        // 3,33 kg x ₡100,55 = 334,8315 -> ₡334,83
        Assert.Equal(334.83m, ProducerAmounts.Amount(3.33m, 100.55m));
    }
}
