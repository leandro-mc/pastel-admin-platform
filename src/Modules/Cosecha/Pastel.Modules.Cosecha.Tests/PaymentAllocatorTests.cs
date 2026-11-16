using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Xunit;

namespace Pastel.Modules.Cosecha.Tests;

/// <summary>Pagos: caso 7 de <c>docs/modules/COSECHA.md</c> §10.</summary>
public sealed class PaymentAllocatorTests
{
    [Fact]
    public void A_payment_settles_the_oldest_delivery_first_and_leaves_the_next_one_partial()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();

        var plan = PaymentAllocator.Allocate(70_000m, [new OwedDelivery(first, 58_500m, 0m), new OwedDelivery(second, 30_000m, 0m)]);

        Assert.Equal(new[] { 58_500m, 11_500m }, plan.Lines.Select(line => line.AmountCrc));
        Assert.Equal(0m, plan.UnallocatedCrc);
        Assert.Equal(SettlementStatus.Paid, PaymentAllocator.StatusOf(58_500m, 58_500m));
        Assert.Equal(SettlementStatus.Partial, PaymentAllocator.StatusOf(30_000m, 11_500m));
        Assert.Equal(18_500m, 58_500m + 30_000m - 70_000m);
    }
}
