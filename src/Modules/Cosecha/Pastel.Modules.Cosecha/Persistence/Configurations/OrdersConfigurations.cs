using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders", table =>
        {
            table.HasCheckConstraint("ck_orders_status", "status IN ('Draft', 'Confirmed', 'Cancelled')");
            table.HasCheckConstraint("ck_orders_cancelled", "(status = 'Cancelled') = (cancelled_at IS NOT NULL)");
        });
        builder.HasKey(x => x.Id).HasName("pk_orders");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BuyerId).HasColumnName("buyer_id");
        builder.Property(x => x.SeasonId).HasColumnName("season_id");
        builder.Property(x => x.RequiredOn).HasColumnName("required_on");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
        builder.Property(x => x.CancelReason).HasColumnName("cancel_reason").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Buyer>().WithMany().HasForeignKey(x => x.BuyerId)
            .HasConstraintName("fk_orders_buyers").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Season>().WithMany().HasForeignKey(x => x.SeasonId)
            .HasConstraintName("fk_orders_seasons").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.SeasonId, x.RequiredOn }).HasDatabaseName("ix_orders_season_required_on");
        builder.HasIndex(x => x.BuyerId).HasDatabaseName("ix_orders_buyer_id");
        builder.HasIndex(x => x.Status).HasDatabaseName("ix_orders_status");
    }
}

internal sealed class OrderLineConfiguration : IEntityTypeConfiguration<OrderLine>
{
    public void Configure(EntityTypeBuilder<OrderLine> builder)
    {
        builder.ToTable("order_lines", table =>
        {
            table.HasCheckConstraint("ck_order_lines_kg", "kilograms > 0");
            table.HasCheckConstraint("ck_order_lines_price", "price_per_kg >= 0");
        });
        builder.HasKey(x => x.Id).HasName("pk_order_lines");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.OrderId).HasColumnName("order_id");
        builder.Property(x => x.ProductId).HasColumnName("product_id");
        builder.Property(x => x.Kilograms).HasColumnName("kilograms").HasPrecision(12, 2);
        builder.Property(x => x.PricePerKg).HasColumnName("price_per_kg").HasPrecision(18, 2);
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");

        builder.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId)
            .HasConstraintName("fk_order_lines_orders").OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId)
            .HasConstraintName("fk_order_lines_products").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.OrderId, x.ProductId }).HasDatabaseName("ux_order_lines_order_product").IsUnique();
        builder.HasIndex(x => x.ProductId).HasDatabaseName("ix_order_lines_product_id");
    }
}
