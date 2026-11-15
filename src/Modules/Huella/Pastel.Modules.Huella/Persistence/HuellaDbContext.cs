using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>
/// Contexto de Huella. Esquema <c>huella</c>, tablas en snake_case y sin claves foráneas hacia otros esquemas: el
/// propietario se referencia por <c>OwnerUserId</c>. Las entidades no tienen navegaciones; las consultas filtran siempre
/// por el perfil del propietario (ver <c>OwnerProfiles</c>).
/// </summary>
internal sealed class HuellaDbContext(DbContextOptions<HuellaDbContext> options) : DbContext(options)
{
    public const string Schema = "huella";

    public DbSet<Profile> Profiles => Set<Profile>();

    public DbSet<JobOffer> JobOffers => Set<JobOffer>();

    public DbSet<ProfileLink> ProfileLinks => Set<ProfileLink>();

    public DbSet<PrivateNote> PrivateNotes => Set<PrivateNote>();

    public DbSet<Experience> Experiences => Set<Experience>();

    public DbSet<Project> Projects => Set<Project>();

    public DbSet<Skill> Skills => Set<Skill>();

    public DbSet<Education> Educations => Set<Education>();

    public DbSet<Certification> Certifications => Set<Certification>();

    public DbSet<LanguageSkill> LanguageSkills => Set<LanguageSkill>();

    public DbSet<PublishedSnapshot> PublishedSnapshots => Set<PublishedSnapshot>();

    public DbSet<CvVersion> CvVersions => Set<CvVersion>();

    public DbSet<Achievement> Achievements => Set<Achievement>();

    public DbSet<AchievementSkill> AchievementSkills => Set<AchievementSkill>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<Profile>(e =>
        {
            e.ToTable("profiles");
            e.HasKey(x => x.Id);
            e.Property(x => x.DisplayName).HasMaxLength(80).IsRequired();
            e.Property(x => x.Headline).HasMaxLength(120).IsRequired();
            e.Property(x => x.Summary).HasMaxLength(1200).IsRequired();
            e.Property(x => x.Location).HasMaxLength(80);
            e.Property(x => x.Availability).HasMaxLength(80);
            e.Property(x => x.ContactEmail).HasMaxLength(254);
            e.Property(x => x.ContactPhone).HasMaxLength(32);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.OwnerUserId).IsUnique();
            e.HasIndex(x => x.PublicTokenHash).IsUnique();
        });

        modelBuilder.Entity<JobOffer>(e =>
        {
            e.ToTable("job_offers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(160).IsRequired();
            e.Property(x => x.Company).HasMaxLength(160);
            e.Property(x => x.SourceUrl).HasMaxLength(2048);
            e.Property(x => x.RawText).HasMaxLength(20000).IsRequired();
            e.Property(x => x.TextHash).IsRequired();
            e.Property(x => x.AnalysisJson).HasColumnType("jsonb");
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => new { x.ProfileId, x.CreatedAt });
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<ProfileLink>(e =>
        {
            e.ToTable("profile_links");
            e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(24).IsRequired();
            e.Property(x => x.Label).HasMaxLength(60).IsRequired();
            e.Property(x => x.Url).HasMaxLength(2048).IsRequired();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<PrivateNote>(e =>
        {
            e.ToTable("private_notes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Story).HasMaxLength(6000).IsRequired();
            e.Property(x => x.Voice).HasMaxLength(1500).IsRequired();
            e.Property(x => x.Residence).HasMaxLength(120).IsRequired();
            e.Property(x => x.WorkMode).HasMaxLength(120).IsRequired();
            e.Property(x => x.Availability).HasMaxLength(120).IsRequired();
            e.Property(x => x.WorkAuthorization).HasMaxLength(160).IsRequired();
            e.Property(x => x.SalaryExpectation).HasMaxLength(120).IsRequired();
            e.Property(x => x.Avoid).HasMaxLength(400).IsRequired();
            e.Property(x => x.PreferredLanguage).HasMaxLength(2).IsRequired();
            e.Property(x => x.PreferredPaper).HasMaxLength(8).IsRequired();
            e.Property(x => x.ExtraBannedPhrases).HasMaxLength(600).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId).IsUnique();
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<Experience>(e =>
        {
            e.ToTable("experiences");
            e.HasKey(x => x.Id);
            e.Property(x => x.Role).HasMaxLength(120).IsRequired();
            e.Property(x => x.MarketRole).HasMaxLength(120);
            e.Property(x => x.Company).HasMaxLength(120).IsRequired();
            e.Property(x => x.Location).HasMaxLength(80);
            e.Property(x => x.EmploymentType).HasMaxLength(24);
            e.Property(x => x.WorkMode).HasMaxLength(24);
            e.Property(x => x.Narrative).HasMaxLength(8000).IsRequired();
            e.Property(x => x.CompanyContext).HasMaxLength(240);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Url).HasMaxLength(2048);
            e.Property(x => x.Summary).HasMaxLength(1500).IsRequired();
            e.Property(x => x.Approach).HasMaxLength(1500).IsRequired();
            e.Property(x => x.Stack).HasMaxLength(240);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<Skill>(e =>
        {
            e.ToTable("skills");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(60).IsRequired();
            e.Property(x => x.NormalizedName).HasMaxLength(60).IsRequired();
            e.Property(x => x.Aliases).HasMaxLength(240);
            e.Property(x => x.Category).HasMaxLength(40).IsRequired();
            e.Property(x => x.Why).HasMaxLength(800).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => new { x.ProfileId, x.NormalizedName }).IsUnique();
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<Education>(e =>
        {
            e.ToTable("educations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Degree).HasMaxLength(160).IsRequired();
            e.Property(x => x.Institution).HasMaxLength(160).IsRequired();
            e.Property(x => x.Note).HasMaxLength(240);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<Certification>(e =>
        {
            e.ToTable("certifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(160).IsRequired();
            e.Property(x => x.Issuer).HasMaxLength(120);
            e.Property(x => x.CredentialUrl).HasMaxLength(2048);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<LanguageSkill>(e =>
        {
            e.ToTable("language_skills");
            e.HasKey(x => x.Id);
            e.Property(x => x.Language).HasMaxLength(60).IsRequired();
            e.Property(x => x.Level).HasMaxLength(12).IsRequired();
            e.Property(x => x.Evidence).HasMaxLength(240);
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ProfileId);
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<PublishedSnapshot>(e =>
        {
            e.ToTable("published_snapshots");
            e.HasKey(x => x.Id);
            e.Property(x => x.ContentJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.CvContentJson).HasColumnType("jsonb");
            e.Property(x => x.ContentHash).IsRequired();
            e.HasIndex(x => new { x.ProfileId, x.Number }).IsUnique();
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });

        modelBuilder.Entity<CvVersion>(e =>
        {
            e.ToTable("cv_versions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Level).HasMaxLength(10).IsRequired();
            e.Property(x => x.Paper).HasMaxLength(8).IsRequired();
            e.Property(x => x.Language).HasMaxLength(2).IsRequired();
            e.Property(x => x.Mode).HasMaxLength(10).IsRequired();
            e.Property(x => x.Focus).HasMaxLength(200);
            e.Property(x => x.ContentJson).HasColumnType("jsonb").IsRequired();
            e.Property(x => x.ReportJson).HasColumnType("jsonb");
            e.Property(x => x.LinesUsed).HasPrecision(6, 1);
            e.Property(x => x.Source).HasMaxLength(24).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => new { x.ProfileId, x.CreatedAt });
            e.HasIndex(x => x.JobOfferId);
            e.HasIndex(x => x.ProfileId).IsUnique().HasFilter("\"IsPublic\"");
            e.HasOne<Profile>().WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade).IsRequired();
            e.HasOne<JobOffer>().WithMany().HasForeignKey(x => x.JobOfferId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Achievement>(e =>
        {
            e.ToTable("achievements", t =>
            {
                t.HasCheckConstraint("CK_achievements_one_parent", "(\"ExperienceId\" IS NULL) <> (\"ProjectId\" IS NULL)");
                t.HasCheckConstraint("CK_achievements_strength", "\"Strength\" BETWEEN 1 AND 5");
            });
            e.HasKey(x => x.Id);
            e.Property(x => x.RawText).HasMaxLength(600);
            e.Property(x => x.Situation).HasMaxLength(300);
            e.Property(x => x.Action).HasMaxLength(300);
            e.Property(x => x.ResultValue).HasMaxLength(40);
            e.Property(x => x.ResultUnit).HasMaxLength(40);
            e.Property(x => x.ResultBaseline).HasMaxLength(80);
            e.Property(x => x.ImpactType).HasMaxLength(24).IsRequired();
            e.Property(x => x.ShortText).HasMaxLength(110).IsRequired();
            e.Property(x => x.LongText).HasMaxLength(170).IsRequired();
            e.Property(x => x.Source).HasMaxLength(16).IsRequired();
            e.Property(x => x.Visibility).HasMaxLength(8).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.ExperienceId);
            e.HasIndex(x => x.ProjectId);
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AchievementSkill>(e =>
        {
            e.ToTable("achievement_skills");
            e.HasKey(x => new { x.AchievementId, x.SkillId });
            e.HasIndex(x => x.SkillId);
            e.HasOne<Achievement>().WithMany().HasForeignKey(x => x.AchievementId).OnDelete(DeleteBehavior.Cascade).IsRequired();
            e.HasOne<Skill>().WithMany().HasForeignKey(x => x.SkillId).OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
    }
}
