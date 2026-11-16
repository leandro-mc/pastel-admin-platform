using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence.Configurations;

internal sealed class ChangeLogEntryConfiguration : IEntityTypeConfiguration<ChangeLogEntry>
{
    public void Configure(EntityTypeBuilder<ChangeLogEntry> builder)
    {
        builder.ToTable("change_log_entries");
        builder.HasKey(x => x.Id).HasName("pk_change_log_entries");

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(40).IsRequired();
        builder.Property(x => x.EntityId).HasColumnName("entity_id");
        builder.Property(x => x.Field).HasColumnName("field").HasMaxLength(60).IsRequired();
        builder.Property(x => x.OldValue).HasColumnName("old_value").HasMaxLength(200);
        builder.Property(x => x.NewValue).HasColumnName("new_value").HasMaxLength(200);
        builder.Property(x => x.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(x => x.ChangedBy).HasColumnName("changed_by");
        builder.Property(x => x.ChangedByName).HasColumnName("changed_by_name").HasMaxLength(100);
        builder.Property(x => x.ChangedAt).HasColumnName("changed_at");

        builder.HasIndex(x => new { x.EntityType, x.EntityId, x.ChangedAt }).HasDatabaseName("ix_change_log_entries_entity");
    }
}
