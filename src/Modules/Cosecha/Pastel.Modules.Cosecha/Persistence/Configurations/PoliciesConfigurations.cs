using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class PaymentPolicyVersionConfiguration : IEntityTypeConfiguration<PaymentPolicyVersion>
{
    public void Configure(EntityTypeBuilder<PaymentPolicyVersion> builder)
    {
        builder.ToTable("payment_policy_versions", table =>
        {
            table.HasCheckConstraint("ck_payment_policy_versions_pct", "(advance_pct IS NULL OR advance_pct BETWEEN 0 AND 100) AND (grade_bweight_pct IS NULL OR grade_bweight_pct BETWEEN 0 AND 100) AND (fund_pct IS NULL OR fund_pct BETWEEN 0 AND 100) AND (management_pct IS NULL OR management_pct BETWEEN 0 AND 100) AND (max_advance_pct IS NULL OR max_advance_pct BETWEEN 0 AND 100)");
            table.HasCheckConstraint("ck_payment_policy_versions_price", "reference_price_per_kg IS NULL OR reference_price_per_kg >= 0");
            table.HasCheckConstraint("ck_payment_policy_versions_weekday", "payment_weekday IS NULL OR payment_weekday BETWEEN 1 AND 7");
        });
        builder.HasKey(x => x.Id).HasName("pk_payment_policy_versions");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
        builder.Property(x => x.AdvancePct).HasColumnName("advance_pct").HasPrecision(5, 2);
        builder.Property(x => x.ReferencePricePerKg).HasColumnName("reference_price_per_kg").HasPrecision(18, 2);
        builder.Property(x => x.GradeBWeightPct).HasColumnName("grade_bweight_pct").HasPrecision(5, 2);
        builder.Property(x => x.FundPct).HasColumnName("fund_pct").HasPrecision(5, 2);
        builder.Property(x => x.ManagementPct).HasColumnName("management_pct").HasPrecision(5, 2);
        builder.Property(x => x.MaxAdvancePct).HasColumnName("max_advance_pct").HasPrecision(5, 2);
        builder.Property(x => x.PaymentWeekday).HasColumnName("payment_weekday");
        builder.Property(x => x.Ratified).HasColumnName("ratified");
        builder.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.CreatedByName).HasColumnName("created_by_name").HasMaxLength(100);

        builder.HasIndex(x => x.EffectiveFrom).HasDatabaseName("ix_payment_policy_versions_effective_from");
    }
}

internal sealed class ClaimsPolicyVersionConfiguration : IEntityTypeConfiguration<ClaimsPolicyVersion>
{
    public void Configure(EntityTypeBuilder<ClaimsPolicyVersion> builder)
    {
        builder.ToTable("claims_policy_versions", table =>
        {
            table.HasCheckConstraint("ck_claims_policy_versions_pct", "(tolerance_pct IS NULL OR tolerance_pct BETWEEN 0 AND 100) AND (major_claim_pct IS NULL OR major_claim_pct BETWEEN 0 AND 100) AND (credit_pct_rot IS NULL OR credit_pct_rot BETWEEN 0 AND 100) AND (credit_pct_discoloration IS NULL OR credit_pct_discoloration BETWEEN 0 AND 100)");
            table.HasCheckConstraint("ck_claims_policy_versions_counts", "(claim_window_hours IS NULL OR claim_window_hours > 0) AND (required_photos IS NULL OR required_photos >= 0) AND (ack_hours IS NULL OR ack_hours > 0) AND (resolution_days IS NULL OR resolution_days > 0) AND (major_resolution_days IS NULL OR major_resolution_days > 0)");
        });
        builder.HasKey(x => x.Id).HasName("pk_claims_policy_versions");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
        builder.Property(x => x.ClaimWindowHours).HasColumnName("claim_window_hours");
        builder.Property(x => x.RequiredPhotos).HasColumnName("required_photos");
        builder.Property(x => x.TolerancePct).HasColumnName("tolerance_pct").HasPrecision(5, 2);
        builder.Property(x => x.MajorClaimPct).HasColumnName("major_claim_pct").HasPrecision(5, 2);
        builder.Property(x => x.CreditPctRot).HasColumnName("credit_pct_rot").HasPrecision(5, 2);
        builder.Property(x => x.CreditPctDiscoloration).HasColumnName("credit_pct_discoloration").HasPrecision(5, 2);
        builder.Property(x => x.AckHours).HasColumnName("ack_hours");
        builder.Property(x => x.ResolutionDays).HasColumnName("resolution_days");
        builder.Property(x => x.MajorResolutionDays).HasColumnName("major_resolution_days");
        builder.Property(x => x.Ratified).HasColumnName("ratified");
        builder.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.CreatedByName).HasColumnName("created_by_name").HasMaxLength(100);

        builder.HasIndex(x => x.EffectiveFrom).HasDatabaseName("ix_claims_policy_versions_effective_from");
    }
}
