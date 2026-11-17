using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Domain;

namespace Pastel.Modules.Brisa.Persistence;

/// <summary>Contexto de Brisa. Esquema <c>brisa</c>; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class BrisaDbContext(DbContextOptions<BrisaDbContext> options) : DbContext(options)
{
    public const string Schema = "brisa";

    public DbSet<BrisaTask> Tasks => Set<BrisaTask>();

    public DbSet<BrisaSettings> Settings => Set<BrisaSettings>();

    public DbSet<TaskUndo> TaskUndos => Set<TaskUndo>();

    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<BrisaTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(x => new { x.OwnerId, x.Id });
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Title).HasMaxLength(TaskRules.TitleMaxLength).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(TaskRules.NotesMaxLength).IsRequired();
            e.Property(x => x.ColorHex).HasMaxLength(7).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.Ignore(x => x.Dates);
            e.HasIndex(x => new { x.OwnerId, x.UpdatedAt });
            e.HasIndex(x => x.ImportBatchId);
        });

        modelBuilder.Entity<BrisaSettings>(e =>
        {
            e.ToTable("settings");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).ValueGeneratedNever();
            e.Property(x => x.TimeZoneId).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<TaskUndo>(e =>
        {
            e.ToTable("task_undos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(16).IsRequired();
            e.HasIndex(x => new { x.OwnerId, x.CreatedAt });
        });

        modelBuilder.Entity<ImportBatch>(e =>
        {
            e.ToTable("import_batches");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.OwnerId);
        });
    }
}
