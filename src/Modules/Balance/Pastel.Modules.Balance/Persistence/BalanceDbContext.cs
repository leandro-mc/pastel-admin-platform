using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Balance.Domain;

namespace Pastel.Modules.Balance.Persistence;

/// <summary>
/// Contexto de Balance. Esquema <c>balance</c>, tablas y columnas en snake_case, sin claves foráneas hacia otros esquemas
/// (las cuentas de Identity se guardan solo como <c>account_id</c>). La integridad vive en la base y no solo en el código:
/// claves, únicos, claves foráneas con la acción que impone cada regla de negocio y restricciones <c>CHECK</c>.
/// Lo que EF no modela (datos de referencia y el disparador de «siempre una persona administradora») está en la migración.
/// </summary>
internal sealed class BalanceDbContext(DbContextOptions<BalanceDbContext> options) : DbContext(options)
{
    public const string Schema = "balance";

    public DbSet<CurrencyDefinition> Currencies => Set<CurrencyDefinition>();
    public DbSet<BalanceGroup> Groups => Set<BalanceGroup>();
    public DbSet<JoinCredential> JoinCredentials => Set<JoinCredential>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<GroupEvent> GroupEvents => Set<GroupEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<CurrencyDefinition>(e =>
        {
            e.ToTable("currencies", t =>
            {
                t.HasCheckConstraint("ck_currencies_code_format", "code ~ '^[A-Z]{3}$'");
                t.HasCheckConstraint("ck_currencies_decimals", "decimals IN (0, 2)");
            });
            e.HasKey(x => x.Code);
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(3).IsRequired();
            e.Property(x => x.NumericCode).HasColumnName("numeric_code");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            e.Property(x => x.Symbol).HasColumnName("symbol").HasMaxLength(8).IsRequired();
            e.Property(x => x.Decimals).HasColumnName("decimals");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.HasIndex(x => x.NumericCode).IsUnique();
        });

        modelBuilder.Entity<BalanceGroup>(e =>
        {
            e.ToTable("groups", t =>
            {
                t.HasCheckConstraint("ck_groups_name_not_blank", "btrim(name) <> ''");
                t.HasCheckConstraint("ck_groups_time_zone_not_blank", "btrim(time_zone) <> ''");
                t.HasCheckConstraint("ck_groups_participant_seq", "participant_seq >= 0");
            });
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
            e.Property(x => x.TimeZone).HasColumnName("time_zone").HasMaxLength(64).IsRequired();
            e.Property(x => x.StartDate).HasColumnName("start_date");
            e.Property(x => x.ClosedAt).HasColumnName("closed_at");
            e.Property(x => x.ParticipantSeq).HasColumnName("participant_seq");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.Version).HasColumnName("xmin").IsRowVersion();
            e.HasOne<CurrencyDefinition>().WithMany().HasForeignKey(x => x.CurrencyCode).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<JoinCredential>(e =>
        {
            e.ToTable("join_credentials", t => t.HasCheckConstraint("ck_join_credentials_code_format", "code ~ '^[0-9]{4}$'"));
            e.HasKey(x => x.GroupId);
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.Token).HasColumnName("token").HasMaxLength(64).IsRequired();
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(4).IsRequired();
            e.Property(x => x.RotatedAt).HasColumnName("rotated_at");
            e.Property(x => x.RotatedBy).HasColumnName("rotated_by");
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne<BalanceGroup>().WithOne().HasForeignKey<JoinCredential>(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Participant>(e =>
        {
            e.ToTable("participants", t =>
            {
                t.HasCheckConstraint("ck_participants_role", "role IN ('admin', 'member')");
                t.HasCheckConstraint("ck_participants_join_order", "join_order > 0");
                t.HasCheckConstraint("ck_participants_display_name_not_blank", "btrim(display_name) <> ''");
            });
            e.HasKey(x => x.Id);
            // Clave alterna que permite la clave foránea compuesta de los gastos: el pagador pertenece al grupo del gasto.
            e.HasAlternateKey(x => new { x.GroupId, x.Id });
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.AccountId).HasColumnName("account_id");
            e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.Role).HasColumnName("role").HasMaxLength(10).IsRequired();
            e.Property(x => x.JoinOrder).HasColumnName("join_order");
            e.Property(x => x.JoinedAt).HasColumnName("joined_at");
            e.HasIndex(x => new { x.GroupId, x.AccountId }).IsUnique();
            e.HasIndex(x => new { x.GroupId, x.JoinOrder }).IsUnique();
            e.HasIndex(x => x.AccountId);
            e.HasOne<BalanceGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Expense>(e =>
        {
            e.ToTable("expenses", t =>
            {
                t.HasCheckConstraint("ck_expenses_amount_positive", "amount > 0");
                t.HasCheckConstraint("ck_expenses_description_length", "char_length(btrim(description)) BETWEEN 4 AND 500");
            });
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.PayerParticipantId).HasColumnName("payer_participant_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500).IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.ExpenseDate).HasColumnName("expense_date");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.UpdatedBy).HasColumnName("updated_by");
            e.Property(x => x.Version).HasColumnName("xmin").IsRowVersion();
            e.HasIndex(x => new { x.GroupId, x.ExpenseDate, x.Id });
            e.HasIndex(x => new { x.GroupId, x.PayerParticipantId });
            // Un grupo con gastos no se borra y una persona que pagó no se elimina: lo impone la base, no solo la aplicación.
            e.HasOne<BalanceGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Participant>().WithMany()
                .HasForeignKey(x => new { x.GroupId, x.PayerParticipantId })
                .HasPrincipalKey(x => new { x.GroupId, x.Id })
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GroupEvent>(e =>
        {
            e.ToTable("group_events", t => t.HasCheckConstraint("ck_group_events_kind_not_blank", "btrim(kind) <> ''"));
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at");
            e.Property(x => x.ActorAccountId).HasColumnName("actor_account_id");
            e.Property(x => x.ActorName).HasColumnName("actor_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(48).IsRequired();
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("jsonb");
            e.HasIndex(x => new { x.GroupId, x.OccurredAt });
            e.HasOne<BalanceGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
