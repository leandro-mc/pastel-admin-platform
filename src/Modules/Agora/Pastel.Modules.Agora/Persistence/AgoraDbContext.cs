using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Domain;

namespace Pastel.Modules.Agora.Persistence;

/// <summary>Contexto de Ágora. Esquema <c>agora</c>, tablas en snake_case; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class AgoraDbContext(DbContextOptions<AgoraDbContext> options) : DbContext(options)
{
    public const string Schema = "agora";

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Series> Series => Set<Series>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleTag> ArticleTags => Set<ArticleTag>();
    public DbSet<ArticleContributor> ArticleContributors => Set<ArticleContributor>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<VideoEmbed> VideoEmbeds => Set<VideoEmbed>();
    public DbSet<Correction> Corrections => Set<Correction>();
    public DbSet<Verification> Verifications => Set<Verification>();
    public DbSet<NewsLink> NewsLinks => Set<NewsLink>();
    public DbSet<SavedArticle> SavedArticles => Set<SavedArticle>();
    public DbSet<FollowedCategory> FollowedCategories => Set<FollowedCategory>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<ErrorReport> ErrorReports => Set<ErrorReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.Property(x => x.Description).HasMaxLength(300);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Series>(e =>
        {
            e.ToTable("series");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(300);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Tag>(e =>
        {
            e.ToTable("tags");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(60).IsRequired();
            e.Property(x => x.Name).HasMaxLength(60).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Article>(e =>
        {
            e.ToTable("articles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Slug).HasMaxLength(120).IsRequired();
            e.Property(x => x.Title).HasMaxLength(90).IsRequired();
            e.Property(x => x.Summary).HasMaxLength(280).IsRequired();
            e.Property(x => x.ContentType).HasConversion<string>().HasMaxLength(16).IsRequired();
            e.Property(x => x.KnownText).HasMaxLength(600);
            e.Property(x => x.UnknownText).HasMaxLength(400);
            e.Property(x => x.WhyItMatters).HasMaxLength(400);
            e.Property(x => x.Body).IsRequired();
            e.Property(x => x.PeriodLabel).HasMaxLength(80);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
            e.Property(x => x.AuthorName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Version).IsRowVersion();
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => new { x.Status, x.PublishedAt });
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Series>().WithMany().HasForeignKey(x => x.SeriesId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ArticleTag>(e =>
        {
            e.ToTable("article_tags");
            e.HasKey(x => new { x.ArticleId, x.TagId });
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Tag>().WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ArticleContributor>(e =>
        {
            e.ToTable("article_contributors");
            e.HasKey(x => new { x.ArticleId, x.UserId });
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Source>(e =>
        {
            e.ToTable("sources");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Author).HasMaxLength(150);
            e.Property(x => x.Url).HasMaxLength(500).IsRequired();
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();
            e.Property(x => x.ContextNote).HasMaxLength(400);
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VideoEmbed>(e =>
        {
            e.ToTable("video_embeds");
            e.HasKey(x => x.Id);
            e.Property(x => x.YouTubeId).HasMaxLength(11).IsRequired();
            e.Property(x => x.Title).HasMaxLength(120).IsRequired();
            e.Property(x => x.Note).HasMaxLength(300);
            e.HasIndex(x => x.ArticleId).IsUnique();
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Correction>(e =>
        {
            e.ToTable("corrections");
            e.HasKey(x => x.Id);
            e.Property(x => x.Text).HasMaxLength(600).IsRequired();
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Verification>(e =>
        {
            e.ToTable("verifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.ReviewerName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Scope).HasMaxLength(500).IsRequired();
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
            e.Property(x => x.WithdrawalNote).HasMaxLength(500);
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NewsLink>(e =>
        {
            e.ToTable("news_links");
            e.HasKey(x => x.Id);
            e.Property(x => x.Headline).HasMaxLength(200).IsRequired();
            e.Property(x => x.Outlet).HasMaxLength(100).IsRequired();
            e.Property(x => x.Url).HasMaxLength(500).IsRequired();
            e.Property(x => x.ContextNote).HasMaxLength(500).IsRequired();
            e.Property(x => x.Topic).HasMaxLength(80);
        });

        modelBuilder.Entity<SavedArticle>(e =>
        {
            e.ToTable("saved_articles");
            e.HasKey(x => new { x.UserId, x.ArticleId });
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FollowedCategory>(e =>
        {
            e.ToTable("followed_categories");
            e.HasKey(x => new { x.UserId, x.CategoryId });
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Reaction>(e =>
        {
            e.ToTable("reactions");
            e.HasKey(x => new { x.ArticleId, x.UserId, x.Kind });
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(16);
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ErrorReport>(e =>
        {
            e.ToTable("error_reports");
            e.HasKey(x => x.Id);
            e.Property(x => x.Text).HasMaxLength(500).IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
            e.Property(x => x.ResolutionNote).HasMaxLength(300);
            e.HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
