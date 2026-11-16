using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Pruebas esenciales de Etapa 1 de Huella (<c>docs/modules/HUELLA.md</c>, sección 7): acceso público por token,
/// borrador frente a publicado, autorización, aislamiento del propietario, entradas hostiles y secreto del token.
/// Usan la cuenta Owner sembrada y datos propios; requieren la base aislada pastel_integration_tests.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class HuellaApiTests : IClassFixture<IdentityApiFactory>, IDisposable
{
    private const string OwnerEmail = "test.owner@pastel.local";
    private const string OwnerPassword = "Local-Only-Test-Owner-2026!";
    private const string AdminEmail = "test.admin@pastel.local";
    private const string AdminPassword = "Local-Only-Test-Admin-2026!";
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";
    private const string TokenHeader = "X-Huella-Token";

    private readonly IdentityApiFactory _factory;
    private readonly List<HttpClient> _clients = [];

    public HuellaApiTests(IdentityApiFactory factory) => _factory = factory;

    public void Dispose()
    {
        foreach (var client in _clients)
        {
            client.Dispose();
        }
    }

    // Criterios 1, 2 y 5: un anónimo ve la última publicación (no el borrador) y el correo oculto no viaja.
    [Trait("RequirementId", "HUELLA-E1-1")]
    [RequiresPostgresFact]
    public async Task Anonymous_visitor_sees_only_the_last_publication_and_no_hidden_contact()
    {
        var owner = await OwnerAsync();
        await SaveProfileAsync(owner, headline: "QA Engineer publicado", email: "marta.oculta@correo.test", showEmail: false);
        var token = await NewLinkAsync(owner);
        await PostAsync(owner, "/api/huella/publication/publish");

        var anonymous = NewAnonymous();
        using var first = await PublicGetAsync(anonymous, token);
        var body = await first.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Contains("QA Engineer publicado", body, StringComparison.Ordinal);
        Assert.DoesNotContain("marta.oculta@correo.test", body, StringComparison.Ordinal);
        Assert.Contains("noindex", string.Join(",", first.Headers.GetValues("X-Robots-Tag")), StringComparison.Ordinal);

        await SaveProfileAsync(owner, headline: "Borrador sin publicar", email: "marta.oculta@correo.test", showEmail: false);
        using var after = await PublicGetAsync(anonymous, token);
        var afterBody = await after.Content.ReadAsStringAsync();
        Assert.Contains("QA Engineer publicado", afterBody, StringComparison.Ordinal);
        Assert.DoesNotContain("Borrador sin publicar", afterBody, StringComparison.Ordinal);
    }

    // Criterios 3, 4 y 8: despublicado, ausente, mal formado, desconocido o regenerado responden igual, sin filtrar nada.
    [Trait("RequirementId", "HUELLA-E1-2")]
    [RequiresPostgresFact]
    public async Task Unpublished_missing_malformed_and_regenerated_tokens_get_the_same_404()
    {
        var owner = await OwnerAsync();
        await SaveProfileAsync(owner, headline: "QA Engineer", email: null, showEmail: false);
        var tokenA = await NewLinkAsync(owner);
        await PostAsync(owner, "/api/huella/publication/publish");
        var anonymous = NewAnonymous();

        using (var live = await PublicGetAsync(anonymous, tokenA))
        {
            Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        }

        await PostAsync(owner, "/api/huella/publication/unpublish");
        var codes = new List<string?>
        {
            await NotFoundCodeAsync(anonymous, tokenA),
            await NotFoundCodeAsync(anonymous, null),
            await NotFoundCodeAsync(anonymous, "abc"),
            await NotFoundCodeAsync(anonymous, new string('x', 43)),
        };

        await PostAsync(owner, "/api/huella/publication/publish");
        var tokenB = await NewLinkAsync(owner);
        codes.Add(await NotFoundCodeAsync(anonymous, tokenA));
        using (var renewed = await PublicGetAsync(anonymous, tokenB))
        {
            Assert.Equal(HttpStatusCode.OK, renewed.StatusCode);
        }

        Assert.All(codes, code => Assert.Equal("huella.public.not_found", code));
    }

    // Criterio 6 (parte 1): anónimo en el panel → 401; sin el permiso (Administrator y Member) → 403.
    [Trait("RequirementId", "HUELLA-E1-3")]
    [RequiresPostgresFact]
    public async Task Panel_requires_a_session_and_the_owner_only_permission()
    {
        var anonymous = NewAnonymous();
        using (var response = await QaSupport.SendAsync(anonymous, HttpMethod.Get, "/api/huella/profile"))
        {
            await QaSupport.AssertProblemAsync(response, HttpStatusCode.Unauthorized);
        }

        foreach (var (email, password) in new[] { (AdminEmail, AdminPassword), (MemberEmail, MemberPassword) })
        {
            var client = NewAnonymous();
            await QaSupport.LoginAsync(client, email, password);
            using var read = await QaSupport.SendAsync(client, HttpMethod.Get, "/api/huella/bank");
            await QaSupport.AssertProblemAsync(read, HttpStatusCode.Forbidden);
            using var write = await QaSupport.SendAsync(client, HttpMethod.Post, "/api/huella/publication/publish");
            await QaSupport.AssertProblemAsync(write, HttpStatusCode.Forbidden);
        }
    }

    // Criterio 6 (parte 2): con identificadores de otro perfil el Owner recibe 404 y la fila ajena no cambia.
    [Trait("RequirementId", "HUELLA-E1-4")]
    [RequiresPostgresFact]
    public async Task Owner_cannot_read_or_change_rows_of_another_profile()
    {
        var foreign = await InsertForeignProfileAsync();
        var owner = await OwnerAsync();

        using (var bank = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/bank"))
        {
            Assert.DoesNotContain("EmpresaAjena", await bank.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }

        var edits = new (HttpMethod Method, string Path, object? Body)[]
        {
            (HttpMethod.Put, "/api/huella/bank/experiences", new { items = new[] { new { id = foreign.ExperienceId, role = "Intruso", company = "Intruso", start = "2020-01" } } }),
            (HttpMethod.Put, $"/api/huella/bank/experiences/{foreign.ExperienceId}/achievements", new { items = Array.Empty<object>() }),
            (HttpMethod.Post, $"/api/huella/bank/experiences/{foreign.ExperienceId}/derive", null),
            (HttpMethod.Get, $"/api/huella/studio/offers/{foreign.OfferId}", null),
            (HttpMethod.Delete, $"/api/huella/studio/offers/{foreign.OfferId}", null),
            (HttpMethod.Get, $"/api/huella/studio/versions/{foreign.VersionId}", null),
            (HttpMethod.Put, $"/api/huella/studio/versions/{foreign.VersionId}/public?isPublic=true", null),
            (HttpMethod.Delete, $"/api/huella/studio/versions/{foreign.VersionId}", null),
        };
        foreach (var (method, path, body) in edits)
        {
            using var response = await QaSupport.SendAsync(owner, method, path, body);
            await QaSupport.AssertProblemAsync(response, HttpStatusCode.NotFound);
        }

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HuellaDbContext>();
        Assert.Equal("EmpresaAjena", (await db.Experiences.AsNoTracking().SingleAsync(e => e.Id == foreign.ExperienceId)).Company);
        Assert.True(await db.JobOffers.AnyAsync(o => o.Id == foreign.OfferId));
        Assert.False((await db.CvVersions.AsNoTracking().SingleAsync(v => v.Id == foreign.VersionId)).IsPublic);
    }

    // Criterio 7: script y enlaces inseguros se neutralizan o se rechazan en el servidor.
    [Trait("RequirementId", "HUELLA-E1-5")]
    [RequiresPostgresFact]
    public async Task Hostile_input_is_neutralized_or_rejected_by_the_api()
    {
        var owner = await OwnerAsync();
        using (var saved = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/profile", ProfileBody(headline: "QA <script>alert(1)</script> Engineer")))
        {
            var text = await saved.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
            Assert.DoesNotContain("<script", text, StringComparison.OrdinalIgnoreCase);
        }

        foreach (var url in new[] { "http://ejemplo.com/perfil", "javascript:alert(1)", "https://usuario:clave@ejemplo.com" })
        {
            var body = ProfileBody(headline: "QA Engineer", links: [new { kind = "website", label = "Sitio", url, isPublic = true }]);
            using var response = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/profile", body);
            await QaSupport.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        }

        // El icono de un enlace es solo una clave del catálogo: cualquier otro valor se rechaza y nunca se guarda.
        var badIcon = ProfileBody(headline: "QA Engineer", links: [new { kind = "website", label = "Sitio", url = "https://ejemplo.com", isPublic = true, icon = "<img src=x onerror=alert(1)>" }]);
        using (var response = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/profile", badIcon))
        {
            await QaSupport.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        }
    }

    // Criterio 8: el token no se guarda en claro (hash para buscar y texto cifrado para que el propietario lo copie) ni llega a la auditoría; regenerar queda auditado.
    [Trait("RequirementId", "HUELLA-E1-6")]
    [RequiresPostgresFact]
    public async Task Link_token_is_stored_only_as_a_hash_and_never_audited()
    {
        var owner = await OwnerAsync();
        var token = await NewLinkAsync(owner);

        // El propietario puede volver a copiar su enlace; un anónimo no lo recibe de ningún modo.
        using (var status = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/publication"))
        {
            Assert.Contains(token, await status.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }

        using (var anonymousStatus = await QaSupport.SendAsync(NewAnonymous(), HttpMethod.Get, "/api/huella/publication"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, anonymousStatus.StatusCode);
        }

        await using var scope = _factory.Services.CreateAsyncScope();
        var huella = scope.ServiceProvider.GetRequiredService<HuellaDbContext>();
        var hashes = await huella.Profiles.AsNoTracking().Where(p => p.PublicTokenHash != null).Select(p => p.PublicTokenHash!).ToListAsync();
        Assert.NotEmpty(hashes);
        Assert.All(hashes, hash => Assert.Equal(32, hash.Length));
        Assert.DoesNotContain(hashes, hash => hash.SequenceEqual(Encoding.UTF8.GetBytes(token)));
        var ciphers = await huella.Profiles.AsNoTracking().Where(p => p.PublicTokenCipher != null).Select(p => p.PublicTokenCipher!).ToListAsync();
        Assert.NotEmpty(ciphers);
        Assert.All(ciphers, cipher => Assert.DoesNotContain(token, cipher, StringComparison.Ordinal));

        var identity = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var audit = await identity.AuditLogs.AsNoTracking().Where(a => a.Module == "huella").ToListAsync();
        Assert.Contains(audit, a => a.Action == "huella.link.regenerated");
        Assert.All(audit, a =>
        {
            Assert.DoesNotContain(token, a.DetailsJson ?? string.Empty, StringComparison.Ordinal);
            Assert.DoesNotContain(token, a.Target ?? string.Empty, StringComparison.Ordinal);
        });
    }

    // IA automática: la clave se guarda cifrada y nunca vuelve por la API; lo que responde el proveedor pasa por las mismas
    // reglas que el JSON pegado (una cifra que no está en el relato se rechaza). Proveedor falso: sin red ni costo.
    [Trait("RequirementId", "HUELLA-E1-7")]
    [RequiresPostgresFact]
    public async Task Ai_key_is_stored_encrypted_never_returned_and_provider_output_is_validated()
    {
        const string apiKey = "AIzaFAKE-integration-key-0123456789wxyz";
        var fake = new FakeGemini();
        using var host = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            var gemini = services.Single(d => d.ServiceType == typeof(IAiProvider) && d.ImplementationType == typeof(GeminiProvider));
            services.Remove(gemini);
            services.AddSingleton<IAiProvider>(fake);
        }));
        var owner = QaSupport.NewClient(host);
        _clients.Add(owner);
        await QaSupport.LoginAsync(owner, OwnerEmail, OwnerPassword);

        using (var saved = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/ai/settings/gemini", new { apiKey, model = "gemini-falso", makeActive = true }))
        {
            var text = await saved.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
            Assert.DoesNotContain(apiKey, text, StringComparison.Ordinal);
            Assert.Contains("wxyz", text, StringComparison.Ordinal);
        }

        using (var read = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/ai/settings"))
        {
            Assert.DoesNotContain(apiKey, await read.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }

        await using (var scope = host.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HuellaDbContext>();
            var stored = await db.AiCredentials.AsNoTracking().Select(c => c.EncryptedApiKey).ToListAsync();
            Assert.NotEmpty(stored);
            Assert.All(stored, value => Assert.DoesNotContain(apiKey, value, StringComparison.Ordinal));
        }

        using var bank = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/bank/experiences", new
        {
            items = new[] { new { role = "QA Engineer", company = "Empresa IA", start = "2022-03", narrative = "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas." } },
        });
        Assert.Equal(HttpStatusCode.OK, bank.StatusCode);
        using var bankJson = JsonDocument.Parse(await bank.Content.ReadAsStringAsync());
        var experienceId = bankJson.RootElement.GetProperty("experiences").EnumerateArray()
            .First(e => e.GetProperty("company").GetString() == "Empresa IA").GetProperty("id").GetString();

        using var run = await QaSupport.SendAsync(owner, HttpMethod.Post, $"/api/huella/bank/experiences/{experienceId}/ai-run");
        Assert.Equal(HttpStatusCode.OK, run.StatusCode);
        Assert.Equal(apiKey, fake.LastKey);
        using var runJson = JsonDocument.Parse(await run.Content.ReadAsStringAsync());
        var proposals = runJson.RootElement.GetProperty("proposals").EnumerateArray().Select(p => p.GetProperty("longText").GetString()).ToList();
        var rejected = runJson.RootElement.GetProperty("rejected").EnumerateArray().Select(r => r.GetString()).ToList();
        Assert.Single(proposals);
        Assert.Contains("140 pruebas", proposals[0], StringComparison.Ordinal);
        Assert.Contains(rejected, r => r!.Contains("999", StringComparison.Ordinal));
    }

    // El CV y el perfil público los redacta la IA desde el banco en crudo. Sin proveedor, la respuesta de una IA externa se
    // importa por la misma vía: lo que no respalda el banco se rechaza, los hechos salen del banco y el inglés queda al día.
    [Trait("RequirementId", "HUELLA-E1-8")]
    [RequiresPostgresFact]
    public async Task Cv_and_profile_are_written_by_ai_from_the_raw_bank_and_validated()
    {
        var owner = await OwnerAsync();
        using var bank = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/bank/experiences", new
        {
            items = new[] { new { role = "QA Engineer", company = "Empresa Compose", start = "2022-03", isVisible = true, narrative = "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas." } },
        });
        Assert.Equal(HttpStatusCode.OK, bank.StatusCode);
        using var bankJson = JsonDocument.Parse(await bank.Content.ReadAsStringAsync());
        var experienceId = bankJson.RootElement.GetProperty("experiences").EnumerateArray()
            .First(e => e.GetProperty("company").GetString() == "Empresa Compose").GetProperty("id").GetString();

        // El prompt lleva el banco en crudo y nunca los datos de contacto.
        using (var package = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/cv/ai-package", new { level = "junior", paper = "letter", languages = new[] { "es", "en" } }))
        {
            var text = await package.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, package.StatusCode);
            Assert.Contains("Automaticé 140 pruebas", text, StringComparison.Ordinal);
            Assert.DoesNotContain(OwnerEmail, text, StringComparison.OrdinalIgnoreCase);
        }

        object Version(string language, string bullet) => new
        {
            language,
            headline = "QA Engineer",
            summary = "QA con foco en automatización.",
            skills = Array.Empty<object>(),
            experience = new[] { new { id = experienceId, title = "QA Engineer", bullets = new[] { bullet, "Aumenté la cobertura 999 % en un solo mes con suites nuevas." } } },
        };
        var json = JsonSerializer.Serialize(new
        {
            versions = new[]
            {
                Version("es", "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas."),
                Version("en", "Automated 140 Playwright tests and cut manual regression from 2 days to 3 hours."),
            },
        });
        using (var imported = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/cv/ai-result", new { level = "junior", paper = "letter", languages = new[] { "es", "en" }, name = "CV prueba", json }))
        {
            Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
            using var outcome = JsonDocument.Parse(await imported.Content.ReadAsStringAsync());
            Assert.Equal(2, outcome.RootElement.GetProperty("accepted").GetInt32());
            Assert.Equal(2, outcome.RootElement.GetProperty("versionIds").GetArrayLength());
            Assert.Contains(outcome.RootElement.GetProperty("rejected").EnumerateArray(), r => r.GetString()!.Contains("999", StringComparison.Ordinal));
        }

        using (var anonymous = await QaSupport.SendAsync(NewAnonymous(), HttpMethod.Post, "/api/huella/tasks/cv/ai-package", new { level = "junior", languages = new[] { "es" } }))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        }

        using (var unknown = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/inventada/ai-package", new { }))
        {
            Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        }

        // Perfil público: sección de experiencia en los dos idiomas; el resumen editado en español deja su inglés pendiente.
        var profileJson = JsonSerializer.Serialize(new
        {
            sections = new
            {
                experience = new[]
                {
                    new
                    {
                        id = experienceId,
                        role = new { es = "Ingeniería de calidad", en = "Quality Engineer" },
                        bullets = new[] { new { es = "Automaticé 140 pruebas y bajé la regresión de 2 días a 3 horas.", en = "Automated 140 tests and cut regression from 2 days to 3 hours." } },
                    },
                },
            },
        });
        using (var generated = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/profile/ai-result", new { sections = new[] { "experience" }, json = profileJson }))
        {
            Assert.Equal(HttpStatusCode.OK, generated.StatusCode);
        }

        using (var content = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/profile/content"))
        {
            using var doc = JsonDocument.Parse(await content.Content.ReadAsStringAsync());
            Assert.Equal("Empresa Compose", doc.RootElement.GetProperty("es").GetProperty("experience")[0].GetProperty("company").GetString());
            Assert.Equal("Quality Engineer", doc.RootElement.GetProperty("en").GetProperty("experience")[0].GetProperty("role").GetString());
            Assert.Equal("ready", doc.RootElement.GetProperty("sections").EnumerateArray().First(s => s.GetProperty("id").GetString() == "experience").GetProperty("status").GetString());
        }

        using (var edited = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/profile/content/overview", new { headline = "QA Engineer", summary = "Resumen editado." }))
        {
            Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
            using var doc = JsonDocument.Parse(await edited.Content.ReadAsStringAsync());
            Assert.Equal("stale", doc.RootElement.GetProperty("sections").EnumerateArray().First(s => s.GetProperty("id").GetString() == "overview").GetProperty("status").GetString());
        }
    }

    // El historial sigue lo que se envía: marcar un CV como enviado pasa su oferta a «postulada» con un seguimiento; un estado
    // inventado se rechaza y volver a «sin postular» borra la fecha de postulación.
    [Trait("RequirementId", "HUELLA-E1-9")]
    [RequiresPostgresFact]
    public async Task Offer_tracking_follows_what_is_sent_and_rejects_invalid_states()
    {
        var owner = await OwnerAsync();
        using var bank = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/bank/experiences", new
        {
            items = new[] { new { role = "QA Engineer", company = "Empresa Historial", start = "2022-03", isVisible = true, narrative = "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas." } },
        });
        using var bankJson = JsonDocument.Parse(await bank.Content.ReadAsStringAsync());
        var experienceId = bankJson.RootElement.GetProperty("experiences").EnumerateArray()
            .First(e => e.GetProperty("company").GetString() == "Empresa Historial").GetProperty("id").GetString();

        using var created = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/studio/offers", new
        {
            title = "QA Senior",
            company = "Acme",
            rawText = "Buscamos QA con Playwright, k6 y GitHub Actions para un equipo remoto. Se requiere experiencia en pruebas de API.",
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        using var offerJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var offerId = offerJson.RootElement.GetProperty("id").GetString();

        var cv = JsonSerializer.Serialize(new
        {
            versions = new[]
            {
                new
                {
                    language = "es",
                    headline = "QA Engineer",
                    summary = "QA con foco en automatización.",
                    skills = Array.Empty<object>(),
                    experience = new[] { new { id = experienceId, title = "QA Engineer", bullets = new[] { "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas." } } },
                },
            },
        });
        using var imported = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/cv/ai-result", new { offerId, level = "junior", paper = "letter", languages = new[] { "es" }, json = cv });
        Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
        using var outcome = JsonDocument.Parse(await imported.Content.ReadAsStringAsync());
        var versionId = outcome.RootElement.GetProperty("versionIds")[0].GetString();

        async Task<JsonElement> OfferAsync()
        {
            using var list = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/studio/offers");
            using var doc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
            return doc.RootElement.EnumerateArray().First(o => o.GetProperty("id").GetString() == offerId).Clone();
        }

        Assert.Equal("saved", (await OfferAsync()).GetProperty("status").GetString());

        using (var sent = await QaSupport.SendAsync(owner, HttpMethod.Put, $"/api/huella/studio/versions/{versionId}/sent?sent=true"))
        {
            Assert.Equal(HttpStatusCode.OK, sent.StatusCode);
            using var doc = JsonDocument.Parse(await sent.Content.ReadAsStringAsync());
            Assert.NotEqual(JsonValueKind.Null, doc.RootElement.GetProperty("summary").GetProperty("sentAt").ValueKind);
        }

        var applied = await OfferAsync();
        Assert.Equal("applied", applied.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, applied.GetProperty("appliedAt").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, applied.GetProperty("followUpAt").ValueKind);

        using (var invalid = await QaSupport.SendAsync(owner, HttpMethod.Put, $"/api/huella/studio/offers/{offerId}/tracking", new { status = "inventado", notes = "" }))
        {
            await QaSupport.AssertProblemAsync(invalid, HttpStatusCode.BadRequest);
        }

        using (var back = await QaSupport.SendAsync(owner, HttpMethod.Put, $"/api/huella/studio/offers/{offerId}/tracking", new { status = "saved", notes = "Volver a empezar" }))
        {
            Assert.Equal(HttpStatusCode.OK, back.StatusCode);
            using var doc = JsonDocument.Parse(await back.Content.ReadAsStringAsync());
            Assert.Equal("saved", doc.RootElement.GetProperty("status").GetString());
            Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("appliedAt").ValueKind);
            Assert.Equal("Volver a empezar", doc.RootElement.GetProperty("notes").GetString());
        }
    }

    // La carta de presentación se redacta para una oferta con las mismas vías que el CV, pasa por el guardián de verdad al
    // editarla, se puede descargar en Word y, al enviarla, la oferta pasa a «postulada».
    [Trait("RequirementId", "HUELLA-E1-10")]
    [RequiresPostgresFact]
    public async Task Cover_letter_is_written_for_an_offer_validated_and_updates_the_history_when_sent()
    {
        var owner = await OwnerAsync();
        using var bank = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/bank/experiences", new
        {
            items = new[] { new { role = "QA Engineer", company = "Empresa Carta", start = "2022-03", isVisible = true, narrative = "Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas." } },
        });
        Assert.Equal(HttpStatusCode.OK, bank.StatusCode);

        using var created = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/studio/offers", new
        {
            title = "QA para carta",
            company = "Acme",
            rawText = "Buscamos QA con Playwright para un equipo de 12 personas. Se valora experiencia en pruebas de API.",
        });
        using var offerJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var offerId = offerJson.RootElement.GetProperty("id").GetString();

        // Sin oferta no hay carta.
        using (var noOffer = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/letter/ai-package", new { languages = new[] { "es" } }))
        {
            await QaSupport.AssertProblemAsync(noOffer, HttpStatusCode.BadRequest);
        }

        using (var package = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/letter/ai-package", new { offerId, languages = new[] { "es" }, tone = "formal" }))
        {
            var text = await package.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, package.StatusCode);
            Assert.Contains("Buscamos QA con Playwright", text, StringComparison.Ordinal);
            Assert.DoesNotContain(OwnerEmail, text, StringComparison.OrdinalIgnoreCase);
        }

        var json = JsonSerializer.Serialize(new
        {
            letters = new[]
            {
                new
                {
                    language = "es",
                    subject = "Postulación a QA",
                    greeting = "Estimado equipo de Acme:",
                    closing = "Atentamente,",
                    paragraphs = new[]
                    {
                        "Me interesa el puesto porque busca automatizar con Playwright, algo que hice en mi último cargo.",
                        "Automaticé 140 pruebas y bajé la regresión de 2 días a 3 horas; aportaría ese enfoque a un equipo de 12 personas.",
                    },
                },
            },
        });
        using var imported = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/tasks/letter/ai-result", new { offerId, languages = new[] { "es" }, tone = "formal", json });
        Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
        using var outcome = JsonDocument.Parse(await imported.Content.ReadAsStringAsync());
        var letterId = outcome.RootElement.GetProperty("versionIds")[0].GetString();

        // Forma de carta formal: fecha, destinatario (equipo y empresa de la oferta) y tipo de letra.
        using (var read = await QaSupport.SendAsync(owner, HttpMethod.Get, $"/api/huella/studio/letters/{letterId}"))
        {
            using var doc = JsonDocument.Parse(await read.Content.ReadAsStringAsync());
            var letter = doc.RootElement.GetProperty("document");
            Assert.Matches(@"^\d{4}-\d{2}-\d{2}$", letter.GetProperty("date").GetString());
            Assert.Equal("Acme", letter.GetProperty("recipient")[1].GetString());
            Assert.Equal("times", letter.GetProperty("font").GetString());
        }

        // Editar: una cifra que no está en el banco ni en la oferta se rechaza.
        using (var bad = await QaSupport.SendAsync(owner, HttpMethod.Put, $"/api/huella/studio/letters/{letterId}/content", new
        {
            subject = "Postulación a QA",
            greeting = "Estimado equipo:",
            closing = "Atentamente,",
            paragraphs = new[] { "Primer párrafo sin cifras.", "Aumenté la cobertura 999 % en un mes." },
        }))
        {
            await QaSupport.AssertProblemAsync(bad, HttpStatusCode.BadRequest);
        }

        using (var docx = await QaSupport.SendAsync(owner, HttpMethod.Get, $"/api/huella/studio/letters/{letterId}/docx"))
        {
            Assert.Equal(HttpStatusCode.OK, docx.StatusCode);
            Assert.Equal("application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx.Content.Headers.ContentType?.MediaType);
        }

        using (var sent = await QaSupport.SendAsync(owner, HttpMethod.Put, $"/api/huella/studio/letters/{letterId}/sent?sent=true"))
        {
            Assert.Equal(HttpStatusCode.OK, sent.StatusCode);
        }

        using var offers = await QaSupport.SendAsync(owner, HttpMethod.Get, "/api/huella/studio/offers");
        using var list = JsonDocument.Parse(await offers.Content.ReadAsStringAsync());
        Assert.Equal("applied", list.RootElement.EnumerateArray().First(o => o.GetProperty("id").GetString() == offerId).GetProperty("status").GetString());

        using (var anonymous = await QaSupport.SendAsync(NewAnonymous(), HttpMethod.Get, $"/api/huella/studio/letters/{letterId}"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        }
    }

    private sealed class FakeGemini : IAiProvider
    {
        public string? LastKey { get; private set; }

        public string Id => "gemini";

        public string Label => "Gemini (prueba)";

        public string DefaultModel => "gemini-falso";

        public Task<Pastel.SharedKernel.Result<IReadOnlyList<AiModelInfo>>> ListModelsAsync(string apiKey, CancellationToken cancellationToken) =>
            Task.FromResult<Pastel.SharedKernel.Result<IReadOnlyList<AiModelInfo>>>(new List<AiModelInfo> { new("gemini-falso", "Falso") });

        public Task<Pastel.SharedKernel.Result<string>> GenerateJsonAsync(string apiKey, string model, string prompt, CancellationToken cancellationToken)
        {
            LastKey = apiKey;
            const string json = """
                {"achievements":[
                  {"shortText":"Automaticé 140 pruebas con Playwright","longText":"Automaticé 140 pruebas con Playwright y bajé la regresión de 2 días a 3 horas","skills":["Playwright"],"strength":4,"impactType":"delivery"},
                  {"shortText":"Aumenté la cobertura 999 %","longText":"Aumenté la cobertura de pruebas en 999 % en un trimestre","skills":[],"strength":5,"impactType":"quality"}
                ]}
                """;
            return Task.FromResult<Pastel.SharedKernel.Result<string>>(json);
        }
    }

    // ---------------------------------------------------------------- apoyo

    private HttpClient NewAnonymous()
    {
        var client = QaSupport.NewClient(_factory);
        _clients.Add(client);
        return client;
    }

    private async Task<HttpClient> OwnerAsync()
    {
        var client = NewAnonymous();
        await QaSupport.LoginAsync(client, OwnerEmail, OwnerPassword);
        return client;
    }

    private static object ProfileBody(string headline, string? email = null, bool showEmail = false, object[]? links = null) => new
    {
        displayName = "Marta Prueba",
        headline,
        summary = "Perfil de prueba.",
        contactEmail = email,
        showContactEmail = showEmail,
        links = links ?? [],
    };

    private static async Task SaveProfileAsync(HttpClient owner, string headline, string? email, bool showEmail)
    {
        using var response = await QaSupport.SendAsync(owner, HttpMethod.Put, "/api/huella/profile", ProfileBody(headline, email, showEmail));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task PostAsync(HttpClient owner, string path)
    {
        using var response = await QaSupport.SendAsync(owner, HttpMethod.Post, path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>Crea un enlace nuevo y devuelve el token en claro, que la API entrega una sola vez.</summary>
    private static async Task<string> NewLinkAsync(HttpClient owner)
    {
        using var response = await QaSupport.SendAsync(owner, HttpMethod.Post, "/api/huella/publication/link");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("token").GetString()!;
    }

    private static async Task<HttpResponseMessage> PublicGetAsync(HttpClient client, string? token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/huella/public/profile");
        if (token is not null)
        {
            request.Headers.Add(TokenHeader, token);
        }

        return await client.SendAsync(request);
    }

    private static async Task<string?> NotFoundCodeAsync(HttpClient client, string? token)
    {
        using var response = await PublicGetAsync(client, token);
        var problem = await QaSupport.AssertProblemAsync(response, HttpStatusCode.NotFound);
        return problem.GetProperty("code").GetString();
    }

    private sealed record ForeignIds(Guid ExperienceId, Guid OfferId, Guid VersionId);

    /// <summary>Inserta directamente en la base un perfil de otra persona con experiencia, oferta y versión de CV.</summary>
    private async Task<ForeignIds> InsertForeignProfileAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var profile = new Profile { Id = Guid.CreateVersion7(), OwnerUserId = Guid.NewGuid(), DisplayName = "Ajeno Secreto", Headline = "Titular ajeno", CreatedAt = now, UpdatedAt = now };
        var experience = new Experience { Id = Guid.CreateVersion7(), ProfileId = profile.Id, Role = "Rol ajeno", Company = "EmpresaAjena", StartDate = new DateOnly(2021, 1, 1), CreatedAt = now, UpdatedAt = now };
        var offer = new JobOffer { Id = Guid.CreateVersion7(), ProfileId = profile.Id, Title = "Oferta ajena", RawText = "Texto de oferta ajena de prueba.", TextHash = new byte[32], CreatedAt = now, UpdatedAt = now };
        var version = new CvVersion
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profile.Id,
            Name = "CV ajeno",
            Level = "mid",
            Paper = "letter",
            Language = "es",
            Mode = "general",
            Source = "rules",
            ContentJson = "{}",
            Pages = 1,
            LinesUsed = 1,
            LineBudget = 97,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HuellaDbContext>();
        db.Profiles.Add(profile);
        db.Experiences.Add(experience);
        db.JobOffers.Add(offer);
        db.CvVersions.Add(version);
        await db.SaveChangesAsync();
        return new ForeignIds(experience.Id, offer.Id, version.Id);
    }
}
