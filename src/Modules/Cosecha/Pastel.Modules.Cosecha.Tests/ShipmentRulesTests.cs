using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Xunit;

namespace Pastel.Modules.Cosecha.Tests;

/// <summary>Reglas de envíos: caso 11 de <c>docs/modules/COSECHA.md</c> §10.</summary>
public sealed class ShipmentRulesTests
{
    [Fact]
    public void A_cancelled_order_cannot_be_assigned_to_a_shipment()
    {
        Assert.False(ShipmentRules.CanAssign(OrderStatus.Cancelled));
        Assert.True(ShipmentRules.CanAssign(OrderStatus.Confirmed));
    }

    [Fact]
    public void Closing_with_unregistered_receptions_or_deliveries_requires_a_reason()
    {
        DeliveryStatus[] deliveries = [DeliveryStatus.Received, DeliveryStatus.Requested];

        var withoutReason = ShipmentRules.CheckClose(deliveries, [10m], reason: null);
        var withReason = ShipmentRules.CheckClose(deliveries, [10m], reason: "El productor no llegó");

        Assert.True(withoutReason.IsFailure);
        Assert.Equal("cosecha.shipment.close_reason_required", withoutReason.Error.Code);
        Assert.True(withReason.IsSuccess);
        Assert.True(ShipmentRules.CheckClose([DeliveryStatus.Received, DeliveryStatus.NoDelivery], [5m], reason: null).IsSuccess);
    }
}
