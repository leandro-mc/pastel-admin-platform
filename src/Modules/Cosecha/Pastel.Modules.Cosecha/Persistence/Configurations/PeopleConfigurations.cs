using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class ProducerConfiguration : IEntityTypeConfiguration<Producer>
{
    public void Configure(EntityTypeBuilder<Producer> builder)
    {
        builder.ToTable("producers", table =>
        {
            table.HasCheckConstraint("ck_producers_location", "(latitude IS NULL) = (longitude IS NULL) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))");
        });
        builder.HasKey(x => x.Id).HasName("pk_producers");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.PickupPoint).HasColumnName("pickup_point").HasMaxLength(200);
        builder.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(9, 6);
        builder.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(9, 6);
        builder.Property(x => x.MapUrl).HasColumnName("map_url").HasMaxLength(500);
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.ArchivedAt).HasColumnName("archived_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasIndex(x => x.NormalizedName).HasDatabaseName("ix_producers_normalized_name");
        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_producers_user_id");
    }
}

internal sealed class ProducerPhoneConfiguration : IEntityTypeConfiguration<ProducerPhone>
{
    public void Configure(EntityTypeBuilder<ProducerPhone> builder)
    {
        builder.ToTable("producer_phones", table =>
        {
            table.HasCheckConstraint("ck_producer_phones_format", "phone ~ '^[0-9]{8}$'");
        });
        builder.HasKey(x => x.Id).HasName("pk_producer_phones");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProducerId).HasColumnName("producer_id");
        builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(8).IsRequired();
        builder.Property(x => x.Label).HasColumnName("label").HasMaxLength(40);
        builder.Property(x => x.IsPrimary).HasColumnName("is_primary");
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");

        builder.HasOne<Producer>().WithMany().HasForeignKey(x => x.ProducerId)
            .HasConstraintName("fk_producer_phones_producers").OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.ProducerId, x.Phone }).HasDatabaseName("ux_producer_phones_producer_phone").IsUnique();
        builder.HasIndex(x => x.ProducerId).HasDatabaseName("ux_producer_phones_primary").IsUnique().HasFilter("is_primary");
    }
}

internal sealed class ProducerSeasonCapacityConfiguration : IEntityTypeConfiguration<ProducerSeasonCapacity>
{
    public void Configure(EntityTypeBuilder<ProducerSeasonCapacity> builder)
    {
        builder.ToTable("producer_season_capacities", table =>
        {
            table.HasCheckConstraint("ck_producer_season_capacities_kg", "estimated_capacity_kg >= 0");
        });
        builder.HasKey(x => new { x.ProducerId, x.SeasonId }).HasName("pk_producer_season_capacities");

        builder.Property(x => x.ProducerId).HasColumnName("producer_id");
        builder.Property(x => x.SeasonId).HasColumnName("season_id");
        builder.Property(x => x.EstimatedCapacityKg).HasColumnName("estimated_capacity_kg").HasPrecision(12, 2);
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne<Producer>().WithMany().HasForeignKey(x => x.ProducerId)
            .HasConstraintName("fk_producer_season_capacities_producers").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Season>().WithMany().HasForeignKey(x => x.SeasonId)
            .HasConstraintName("fk_producer_season_capacities_seasons").OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.SeasonId).HasDatabaseName("ix_producer_season_capacities_season_id");
    }
}

internal sealed class BuyerConfiguration : IEntityTypeConfiguration<Buyer>
{
    public void Configure(EntityTypeBuilder<Buyer> builder)
    {
        builder.ToTable("buyers", table =>
        {
            table.HasCheckConstraint("ck_buyers_location", "(latitude IS NULL) = (longitude IS NULL) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))");
        });
        builder.HasKey(x => x.Id).HasName("pk_buyers");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Address).HasColumnName("address").HasMaxLength(300);
        builder.Property(x => x.Zone).HasColumnName("zone").HasMaxLength(100);
        builder.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(9, 6);
        builder.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(9, 6);
        builder.Property(x => x.MapUrl).HasColumnName("map_url").HasMaxLength(500);
        builder.Property(x => x.DeliveryConditions).HasColumnName("delivery_conditions").HasMaxLength(500);
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.ArchivedAt).HasColumnName("archived_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.UpdatedBy).HasColumnName("updated_by");
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasIndex(x => x.NormalizedName).HasDatabaseName("ix_buyers_normalized_name");
        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_buyers_user_id");
    }
}

internal sealed class BuyerContactConfiguration : IEntityTypeConfiguration<BuyerContact>
{
    public void Configure(EntityTypeBuilder<BuyerContact> builder)
    {
        builder.ToTable("buyer_contacts", table =>
        {
            table.HasCheckConstraint("ck_buyer_contacts_phone", "phone IS NULL OR phone ~ '^[0-9]{8}$'");
        });
        builder.HasKey(x => x.Id).HasName("pk_buyer_contacts");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BuyerId).HasColumnName("buyer_id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(8);
        builder.Property(x => x.RoleTitle).HasColumnName("role_title").HasMaxLength(100);
        builder.Property(x => x.IsPrimary).HasColumnName("is_primary");
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");

        builder.HasOne<Buyer>().WithMany().HasForeignKey(x => x.BuyerId)
            .HasConstraintName("fk_buyer_contacts_buyers").OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.BuyerId).HasDatabaseName("ix_buyer_contacts_buyer_id");
        builder.HasIndex(x => x.BuyerId).HasDatabaseName("ux_buyer_contacts_primary").IsUnique().HasFilter("is_primary");
    }
}
