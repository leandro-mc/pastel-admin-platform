using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products", table =>
        {
            table.HasCheckConstraint("ck_products_unit", "unit IN ('kg')");
        });
        builder.HasKey(x => x.Id).HasName("pk_products");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name").HasMaxLength(120).IsRequired();
        builder.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(16).IsRequired();
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasIndex(x => x.NormalizedName).HasDatabaseName("ux_products_normalized_name").IsUnique();
    }
}

internal sealed class SeasonConfiguration : IEntityTypeConfiguration<Season>
{
    public void Configure(EntityTypeBuilder<Season> builder)
    {
        builder.ToTable("seasons", table =>
        {
            table.HasCheckConstraint("ck_seasons_dates", "ends_on >= starts_on");
            table.HasCheckConstraint("ck_seasons_status", "status IN ('Active', 'Closed')");
            table.HasCheckConstraint("ck_seasons_price", "default_producer_price_per_kg >= 0");
        });
        builder.HasKey(x => x.Id).HasName("pk_seasons");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name").HasMaxLength(120).IsRequired();
        builder.Property(x => x.ProductId).HasColumnName("product_id");
        builder.Property(x => x.StartsOn).HasColumnName("starts_on");
        builder.Property(x => x.EndsOn).HasColumnName("ends_on");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.DefaultProducerPricePerKg).HasColumnName("default_producer_price_per_kg").HasPrecision(18, 2);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId)
            .HasConstraintName("fk_seasons_products").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.NormalizedName).HasDatabaseName("ux_seasons_normalized_name").IsUnique();
        builder.HasIndex(x => x.ProductId).HasDatabaseName("ix_seasons_product_id");
        builder.HasIndex(x => x.Status).HasDatabaseName("ix_seasons_status");
    }
}
