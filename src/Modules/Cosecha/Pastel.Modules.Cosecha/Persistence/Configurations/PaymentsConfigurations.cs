using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class ProducerPaymentConfiguration : IEntityTypeConfiguration<ProducerPayment>
{
    public void Configure(EntityTypeBuilder<ProducerPayment> builder)
    {
        builder.ToTable("producer_payments", table =>
        {
            table.HasCheckConstraint("ck_producer_payments_amount", "amount_crc > 0");
            table.HasCheckConstraint("ck_producer_payments_method", "method IN ('Cash', 'Sinpe', 'Transfer')");
            table.HasCheckConstraint("ck_producer_payments_void", "(voided_at IS NULL) = (void_reason IS NULL)");
        });
        builder.HasKey(x => x.Id).HasName("pk_producer_payments");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProducerId).HasColumnName("producer_id");
        builder.Property(x => x.PaidOn).HasColumnName("paid_on");
        builder.Property(x => x.AmountCrc).HasColumnName("amount_crc").HasPrecision(18, 2);
        builder.Property(x => x.Method).HasColumnName("method").HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Reference).HasColumnName("reference").HasMaxLength(100);
        builder.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(x => x.VoidedAt).HasColumnName("voided_at");
        builder.Property(x => x.VoidedBy).HasColumnName("voided_by");
        builder.Property(x => x.VoidReason).HasColumnName("void_reason").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Producer>().WithMany().HasForeignKey(x => x.ProducerId)
            .HasConstraintName("fk_producer_payments_producers").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.ProducerId, x.PaidOn }).HasDatabaseName("ix_producer_payments_producer_paid_on");
    }
}

internal sealed class ProducerPaymentAllocationConfiguration : IEntityTypeConfiguration<ProducerPaymentAllocation>
{
    public void Configure(EntityTypeBuilder<ProducerPaymentAllocation> builder)
    {
        builder.ToTable("producer_payment_allocations", table =>
        {
            table.HasCheckConstraint("ck_producer_payment_allocations_amount", "amount_crc > 0");
        });
        builder.HasKey(x => new { x.PaymentId, x.DeliveryId }).HasName("pk_producer_payment_allocations");

        builder.Property(x => x.PaymentId).HasColumnName("payment_id");
        builder.Property(x => x.DeliveryId).HasColumnName("delivery_id");
        builder.Property(x => x.AmountCrc).HasColumnName("amount_crc").HasPrecision(18, 2);

        builder.HasOne<ProducerPayment>().WithMany().HasForeignKey(x => x.PaymentId)
            .HasConstraintName("fk_producer_payment_allocations_payments").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ProducerDelivery>().WithMany().HasForeignKey(x => x.DeliveryId)
            .HasConstraintName("fk_producer_payment_allocations_deliveries").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.DeliveryId).HasDatabaseName("ix_producer_payment_allocations_delivery_id");
    }
}
