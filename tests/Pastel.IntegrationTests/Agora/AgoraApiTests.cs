using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Pastel.IntegrationTests.QA;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Xunit;

namespace Pastel.IntegrationTests.Agora;

/// <summary>
/// Pruebas HTTP esenciales de Ágora (docs/modules/AGORA.md §7, Etapa 1): lo público solo muestra piezas publicadas y las
/// escrituras de personas registradas exigen sesión y permiso. Necesitan la base aislada (ver <see cref="RequiresPostgresFactAttribute"/>).
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class AgoraApiTests : IClassFixture<IdentityApiFactory>
{
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";
    private const string OwnerEmail = "test.owner@pastel.local";
    private const string OwnerPassword = "Local-Only-Test-Owner-2026!";

    private readonly IdentityApiFactory _factory;

    public AgoraApiTests(IdentityApiFactory factory) => _factory = factory;

    [RequiresPostgresFact]
    public async Task An_anonymous_person_cannot_save_a_piece()
    {
        using var client = QaSupport.NewClient(_factory);

        var status = await QaSupport.StatusOfAsync(client, HttpMethod.Put, "/api/agora/articles/cualquier-pieza/saved");

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [RequiresPostgresFact]
    public async Task A_member_without_the_permission_cannot_save_react_or_report()
    {
        using var client = QaSupport.NewClient(_factory);
        await QaSupport.LoginAsync(client, MemberEmail, MemberPassword);

        Assert.Equal(HttpStatusCode.Forbidden, await QaSupport.StatusOfAsync(client, HttpMethod.Put, "/api/agora/articles/cualquier-pieza/saved"));
        Assert.Equal(HttpStatusCode.Forbidden, await QaSupport.StatusOfAsync(client, HttpMethod.Put, "/api/agora/articles/cualquier-pieza/reactions/helped"));
        Assert.Equal(
            HttpStatusCode.Forbidden,
            await QaSupport.StatusOfAsync(client, HttpMethod.Post, "/api/agora/articles/cualquier-pieza/error-reports", new { text = "Hay un dato incorrecto." }));
    }

    [RequiresPostgresFact]
    public async Task Public_reads_show_published_pieces_only_and_a_draft_answers_404()
    {
        var (draftSlug, publishedSlug) = await SeedDraftAndPublishedAsync();
        using var client = QaSupport.NewClient(_factory);

        using var draft = await client.GetAsync($"/api/agora/articles/{draftSlug}");
        using var published = await client.GetAsync($"/api/agora/articles/{publishedSlug}");
        using var draftShare = await client.GetAsync($"/api/agora/share/{draftSlug}");
        using var publishedShare = await client.GetAsync($"/api/agora/share/{publishedSlug}");
        using var list = await client.GetAsync("/api/agora/articles?pageSize=100");

        Assert.Equal(HttpStatusCode.NotFound, draft.StatusCode);
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, draftShare.StatusCode);
        Assert.Equal(HttpStatusCode.OK, publishedShare.StatusCode);
        Assert.Contains("og:title", await publishedShare.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        using var document = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        var slugs = document.RootElement.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("slug").GetString()).ToList();
        Assert.Contains(publishedSlug, slugs);
        Assert.DoesNotContain(draftSlug, slugs);
    }

    [RequiresPostgresFact]
    public async Task The_share_card_is_unavailable_until_the_renderer_exists()
    {
        var (_, publishedSlug) = await SeedDraftAndPublishedAsync();
        using var client = QaSupport.NewClient(_factory);

        using var response = await client.GetAsync($"/api/agora/share/{publishedSlug}/card.png");

        await QaSupport.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }

    [RequiresPostgresFact]
    public async Task Editorial_routes_require_a_session_and_the_manage_permission()
    {
        using var anonymous = QaSupport.NewClient(_factory);
        Assert.Equal(HttpStatusCode.Unauthorized, await QaSupport.StatusOfAsync(anonymous, HttpMethod.Get, "/api/agora/editorial/articles"));

        using var member = QaSupport.NewClient(_factory);
        await QaSupport.LoginAsync(member, MemberEmail, MemberPassword);
        Assert.Equal(HttpStatusCode.Forbidden, await QaSupport.StatusOfAsync(member, HttpMethod.Get, "/api/agora/editorial/articles"));
        Assert.Equal(HttpStatusCode.Forbidden, await QaSupport.StatusOfAsync(member, HttpMethod.Post, "/api/agora/editorial/articles", new { title = "Intento sin permiso" }));
    }

    [RequiresPostgresFact]
    public async Task A_piece_needs_two_sources_to_be_published_and_then_it_is_public_and_pending_verification()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        using var author = QaSupport.NewClient(_factory);
        await QaSupport.LoginAsync(author, OwnerEmail, OwnerPassword);

        using var categoryResponse = await QaSupport.SendAsync(author, HttpMethod.Post, "/api/agora/editorial/categories", new { name = $"Historia {suffix}" });
        Assert.Equal(HttpStatusCode.Created, categoryResponse.StatusCode);
        var categoryId = (await ReadAsync(categoryResponse)).GetProperty("id").GetGuid();

        object Article(object[] sources, long? version = null) => new
        {
            title = $"La abolición del ejército {suffix}",
            summary = "En 1948 Costa Rica decidió disolver su ejército.",
            contentType = "facts",
            body = "Un texto con **negrita** y <script>alert(1)</script>.",
            categoryId,
            tags = new[] { "historia", "1948" },
            sources,
            version,
        };

        var oneSource = new object[] { new { title = "Constitución Política", url = "https://example.org/constitucion", kind = "official" } };
        var twoSources = new object[]
        {
            new { title = "Constitución Política", url = "https://example.org/constitucion", kind = "official" },
            new { title = "Archivo Nacional", url = "https://example.org/archivo", kind = "document" },
        };

        using var created = await QaSupport.SendAsync(author, HttpMethod.Post, "/api/agora/editorial/articles", Article(oneSource));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var createdJson = await ReadAsync(created);
        var id = createdJson.GetProperty("detail").GetProperty("card").GetProperty("id").GetGuid();
        var slug = createdJson.GetProperty("detail").GetProperty("card").GetProperty("slug").GetString()!;
        var version = createdJson.GetProperty("version").GetInt64();
        Assert.DoesNotContain("<script", createdJson.GetProperty("detail").GetProperty("body").GetString(), StringComparison.OrdinalIgnoreCase);

        using var notReady = await QaSupport.SendAsync(author, HttpMethod.Post, $"/api/agora/editorial/articles/{id}/publish");
        var problem = await QaSupport.AssertProblemAsync(notReady, HttpStatusCode.BadRequest);
        Assert.Equal("agora.article.not_ready", problem.GetProperty("code").GetString());

        using var updated = await QaSupport.SendAsync(author, HttpMethod.Put, $"/api/agora/editorial/articles/{id}", Article(twoSources, version));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        using var published = await QaSupport.SendAsync(author, HttpMethod.Post, $"/api/agora/editorial/articles/{id}/publish");
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);

        using var anonymous = QaSupport.NewClient(_factory);
        using var publicPiece = await anonymous.GetAsync($"/api/agora/articles/{slug}");
        Assert.Equal(HttpStatusCode.OK, publicPiece.StatusCode);
        var seal = (await ReadAsync(publicPiece)).GetProperty("card").GetProperty("seal");
        Assert.Equal("pending", seal.GetProperty("state").GetString());
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private async Task<(string DraftSlug, string PublishedSlug)> SeedDraftAndPublishedAsync()
    {
        using var client = _factory.CreateClient(); // Arranca el host: aplica las migraciones en la base aislada.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AgoraDbContext>();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var category = new Category { Slug = $"prueba-{suffix}", Name = $"Prueba {suffix}" };
        db.Categories.Add(category);
        db.Articles.Add(NewArticle($"borrador-{suffix}", ArticleStatus.Draft, category.Id));
        db.Articles.Add(NewArticle($"publicada-{suffix}", ArticleStatus.Published, category.Id));
        await db.SaveChangesAsync();
        return ($"borrador-{suffix}", $"publicada-{suffix}");
    }

    private static Article NewArticle(string slug, ArticleStatus status, Guid categoryId)
    {
        var now = DateTimeOffset.UtcNow;
        return new Article
        {
            Slug = slug,
            Title = $"Pieza {slug}",
            Summary = "Resumen de prueba.",
            Status = status,
            CategoryId = categoryId,
            AuthorUserId = Guid.NewGuid(),
            AuthorName = "Autoría de prueba",
            CreatedAt = now,
            UpdatedAt = now,
            PublishedAt = status == ArticleStatus.Published ? now : null,
        };
    }
}
