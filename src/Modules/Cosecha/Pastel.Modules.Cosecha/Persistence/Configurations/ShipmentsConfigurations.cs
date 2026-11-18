using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("shipments", table =>
        {
            table.HasCheckConstraint("ck_shipments_status", "status IN ('Planned', 'Collecting', 'Collected', 'Delivered', 'Closed')");
            table.HasCheckConstraint("ck_shipments_buffer", "buffer_percent BETWEEN 0 AND 100");
        });
        builder.HasKey(x => x.Id).HasName("pk_shipments");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.SeasonId).HasColumnName("season_id");
        builder.Property(x => x.ShipmentDate).HasColumnName("shipment_date");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.BufferPercent).HasColumnName("buffer_percent").HasPrecision(5, 2);
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(x => x.ClosedAt).HasColumnName("closed_at");
        builder.Property(x => x.CloseReason).HasColumnName("close_reason").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Season>().WithMany().HasForeignKey(x => x.SeasonId)
            .HasConstraintName("fk_shipments_seasons").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.SeasonId, x.ShipmentDate }).HasDatabaseName("ix_shipments_season_date");
        builder.HasIndex(x => x.Status).HasDatabaseName("ix_shipments_status");
    }
}

internal sealed class ShipmentOrderConfiguration : IEntityTypeConfiguration<ShipmentOrder>
{
    public void Configure(EntityTypeBuilder<ShipmentOrder> builder)
    {
        builder.ToTable("shipment_orders", table =>
        {
            table.HasCheckConstraint("ck_shipment_orders_planned", "planned_kg >= 0");
            table.HasCheckConstraint("ck_shipment_orders_delivered", "delivered_kg IS NULL OR delivered_kg >= 0");
        });
        builder.HasKey(x => x.Id).HasName("pk_shipment_orders");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ShipmentId).HasColumnName("shipment_id");
        builder.Property(x => x.OrderId).HasColumnName("order_id");
        builder.Property(x => x.PlannedKg).HasColumnName("planned_kg").HasPrecision(12, 2);
        builder.Property(x => x.DeliveredKg).HasColumnName("delivered_kg").HasPrecision(12, 2);
        builder.Property(x => x.DeliveryNote).HasColumnName("delivery_note").HasMaxLength(500);
        builder.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Shipment>().WithMany().HasForeignKey(x => x.ShipmentId)
            .HasConstraintName("fk_shipment_orders_shipments").OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId)
            .HasConstraintName("fk_shipment_orders_orders").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.ShipmentId, x.OrderId }).HasDatabaseName("ux_shipment_orders_shipment_order").IsUnique();
        builder.HasIndex(x => x.OrderId).HasDatabaseName("ix_shipment_orders_order_id");
    }
}

internal sealed class ProducerDeliveryConfiguration : IEntityTypeConfiguration<ProducerDelivery>
{
    public void Configure(EntityTypeBuilder<ProducerDelivery> builder)
    {
        builder.ToTable("producer_deliveries", table =>
        {
            table.HasCheckConstraint("ck_producer_deliveries_status", "status IN ('Requested', 'Confirmed', 'Received', 'NoDelivery')");
            table.HasCheckConstraint("ck_producer_deliveries_quality", "quality IS NULL OR quality IN ('Good', 'WithObservations', 'Bad')");
            table.HasCheckConstraint("ck_producer_deliveries_kg", "requested_kg >= 0 AND (available_kg IS NULL OR available_kg >= 0) AND (received_kg IS NULL OR received_kg >= 0) AND rejected_kg >= 0");
            table.HasCheckConstraint("ck_producer_deliveries_rejected", "rejected_kg = 0 OR (received_kg IS NOT NULL AND rejected_kg <= received_kg)");
            table.HasCheckConstraint("ck_producer_deliveries_received", "status <> 'Received' OR received_kg IS NOT NULL");
            table.HasCheckConstraint("ck_producer_deliveries_price", "price_per_kg >= 0");
        });
        builder.HasKey(x => x.Id).HasName("pk_producer_deliveries");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ShipmentId).HasColumnName("shipment_id");
        builder.Property(x => x.ProducerId).HasColumnName("producer_id");
        builder.Property(x => x.RequestedKg).HasColumnName("requested_kg").HasPrecision(12, 2);
        builder.Property(x => x.AvailableKg).HasColumnName("available_kg").HasPrecision(12, 2);
        builder.Property(x => x.ReceivedKg).HasColumnName("received_kg").HasPrecision(12, 2);
        builder.Property(x => x.RejectedKg).HasColumnName("rejected_kg").HasPrecision(12, 2);
        builder.Property(x => x.AcceptedKg).HasColumnName("accepted_kg").HasPrecision(12, 2).HasComputedColumnSql("received_kg - rejected_kg", stored: true);
        builder.Property(x => x.PricePerKg).HasColumnName("price_per_kg").HasPrecision(18, 2);
        builder.Property(x => x.AmountCrc).HasColumnName("amount_crc").HasPrecision(18, 2).HasComputedColumnSql("round((received_kg - rejected_kg) * price_per_kg, 2)", stored: true);
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Quality).HasColumnName("quality").HasConversion<string>().HasMaxLength(24);
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(x => x.ExpectedPaymentDate).HasColumnName("expected_payment_date");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Shipment>().WithMany().HasForeignKey(x => x.ShipmentId)
            .HasConstraintName("fk_producer_deliveries_shipments").OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Producer>().WithMany().HasForeignKey(x => x.ProducerId)
            .HasConstraintName("fk_producer_deliveries_producers").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.ShipmentId, x.ProducerId }).HasDatabaseName("ux_producer_deliveries_shipment_producer").IsUnique();
        builder.HasIndex(x => x.ProducerId).HasDatabaseName("ix_producer_deliveries_producer_id");
        builder.HasIndex(x => x.ExpectedPaymentDate).HasDatabaseName("ix_producer_deliveries_expected_payment_date");
    }
}
