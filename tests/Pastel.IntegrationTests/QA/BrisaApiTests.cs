using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Pruebas esenciales de Etapa 1 de Brisa (ficha §6, pruebas 2, 4 y 7) contra la API real y la base aislada
/// <c>pastel_integration_tests</c>. Las cuentas se crean una sola vez por fixture: el limitador de autenticación admite
/// 12 inicios de sesión por minuto y TestServer comparte IP.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class BrisaApiTests : IClassFixture<IdentityApiFactory>
{
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";
    private const string TasksPath = "/api/brisa/tasks";

    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static Actors? _actors;

    private readonly IdentityApiFactory _factory;

    public BrisaApiTests(IdentityApiFactory factory) => _factory = factory;

    private sealed record Actors(HttpClient A, HttpClient B, HttpClient Member);

    // ---------------------------------------------------------------- Prueba 7: permisos

    [RequiresPostgresFact]
    public async Task Anonymous_gets_401_and_a_person_without_brisa_access_gets_403()
    {
        var actors = await ActorsAsync();
        using var anonymous = QaSupport.NewClient(_factory);

        Assert.Equal(HttpStatusCode.Unauthorized, await QaSupport.StatusOfAsync(anonymous, HttpMethod.Get, TasksPath));
        Assert.Equal(HttpStatusCode.Forbidden, await QaSupport.StatusOfAsync(actors.Member, HttpMethod.Get, TasksPath));
        Assert.Equal(
            HttpStatusCode.Forbidden,
            await QaSupport.StatusOfAsync(actors.Member, HttpMethod.Post, TasksPath, new { title = "No debería crearse" }));
    }

    // ---------------------------------------------------------------- Prueba 2: aislamiento

    [RequiresPostgresFact]
    public async Task Person_a_never_sees_edits_or_deletes_tasks_of_person_b()
    {
        var actors = await ActorsAsync();
        var created = await CreateTaskAsync(actors.A, "Pendiente solo de A");
        var id = created.GetProperty("id").GetString()!;
        var version = created.GetProperty("version").GetString()!;

        Assert.DoesNotContain(await ListIdsAsync(actors.B), listed => listed == id);

        var edit = new { title = "Editada por B", scheduledDate = "2026-10-18", version };
        Assert.Equal(HttpStatusCode.NotFound, await QaSupport.StatusOfAsync(actors.B, HttpMethod.Put, $"{TasksPath}/{id}", edit));
        Assert.Equal(
            HttpStatusCode.NotFound,
            await QaSupport.StatusOfAsync(actors.B, HttpMethod.Put, $"{TasksPath}/{id}/completed", new { completed = true }));
        Assert.Equal(HttpStatusCode.NotFound, await QaSupport.StatusOfAsync(actors.B, HttpMethod.Post, $"{TasksPath}/{id}/delete"));

        // La tarea de A quedó intacta.
        Assert.Contains(await ListIdsAsync(actors.A), listed => listed == id);
    }

    // ---------------------------------------------------------------- Prueba 4: borrado lógico, updatedSince y concurrencia

    [RequiresPostgresFact]
    public async Task Soft_delete_incremental_read_and_concurrency_conflict()
    {
        var actors = await ActorsAsync();
        var created = await CreateTaskAsync(actors.A, "Para borrar y editar");
        var id = created.GetProperty("id").GetString()!;
        var version = created.GetProperty("version").GetString()!;
        var createdAt = created.GetProperty("updatedAt").GetDateTimeOffset();

        // Concurrencia: la primera edición con la versión vigente pasa; repetir con la versión vieja devuelve 409 claro.
        var body = new { title = "Editada", scheduledDate = "2026-10-18", version };
        using var first = await QaSupport.SendAsync(actors.A, HttpMethod.Put, $"{TasksPath}/{id}", body);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        using var stale = await QaSupport.SendAsync(actors.A, HttpMethod.Put, $"{TasksPath}/{id}", body);
        var problem = await QaSupport.AssertProblemAsync(stale, HttpStatusCode.Conflict);
        Assert.Equal("brisa.task.changed", problem.GetProperty("code").GetString());

        // Borrado lógico: deja de listarse, pero la lectura incremental lo informa con su fecha de borrado.
        using var deleted = await QaSupport.SendAsync(actors.A, HttpMethod.Post, $"{TasksPath}/{id}/delete");
        Assert.Equal(HttpStatusCode.OK, deleted.StatusCode);
        Assert.DoesNotContain(await ListIdsAsync(actors.A), listed => listed == id);

        var since = Uri.EscapeDataString(createdAt.AddSeconds(-1).ToString("O"));
        var changes = await ListAsync(actors.A, $"?updatedSince={since}");
        var change = changes.Single(item => item.GetProperty("id").GetString() == id);
        Assert.NotEqual(JsonValueKind.Null, change.GetProperty("deletedAt").ValueKind);

        // Solo cambios: con un instante posterior al borrado ya no aparece.
        var after = Uri.EscapeDataString(change.GetProperty("updatedAt").GetDateTimeOffset().AddSeconds(1).ToString("O"));
        Assert.DoesNotContain(await ListAsync(actors.A, $"?updatedSince={after}"), item => item.GetProperty("id").GetString() == id);
    }

    // ---------------------------------------------------------------- Prueba 6: importación

    [RequiresPostgresFact]
    public async Task Import_is_all_or_nothing_previewable_idempotent_and_reversible()
    {
        var actors = await ActorsAsync();
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        string Archive(string secondDay) =>
            $$"""
            [
             {"id":"{{first}}","title":"Importada uno","details":"","scheduledDate":"2026-10-18","priority":"HIGH","colorHex":"#F6DDCE","dueDate":"","completed":false,"createdAt":1792278000000},
             {"id":"{{second}}","title":"Importada dos","details":"","scheduledDate":"{{secondDay}}","priority":"URGENT","colorHex":"#DCEAF4","dueDate":"2026-10-20","completed":true,"createdAt":1792022400000}
            ]
            """;

        // Archivo inválido (día posterior a la fecha límite): se rechaza todo el lote y no se crea nada.
        var rejected = await PostImportAsync(actors.A, Archive("2026-10-25"), dryRun: false);
        Assert.False(rejected.GetProperty("accepted").GetBoolean());
        Assert.Equal(0, rejected.GetProperty("toCreate").GetInt32());
        Assert.DoesNotContain(await ListIdsAsync(actors.A), listed => listed == first.ToString());

        // Vista previa: con totales y sin escribir nada.
        var preview = await PostImportAsync(actors.A, Archive("2026-10-15"), dryRun: true);
        Assert.True(preview.GetProperty("accepted").GetBoolean());
        Assert.Equal(2, preview.GetProperty("totals").GetProperty("records").GetInt32());
        Assert.Equal(2, preview.GetProperty("toCreate").GetInt32());
        Assert.Single(preview.GetProperty("warnings").EnumerateArray()); // prioridad URGENT → Media con aviso
        Assert.DoesNotContain(await ListIdsAsync(actors.A), listed => listed == first.ToString());

        // Importación definitiva y reimportación idempotente.
        var imported = await PostImportAsync(actors.A, Archive("2026-10-15"), dryRun: false);
        Assert.Equal(2, imported.GetProperty("toCreate").GetInt32());
        var batchId = imported.GetProperty("batchId").GetString()!;
        Assert.Contains(await ListIdsAsync(actors.A), listed => listed == first.ToString());

        var again = await PostImportAsync(actors.A, Archive("2026-10-15"), dryRun: false);
        Assert.Equal(0, again.GetProperty("toCreate").GetInt32());
        Assert.Equal(2, again.GetProperty("alreadyExisting").GetInt32());

        // El mismo id con contenido distinto se omite y no se sobrescribe.
        var changed = await PostImportAsync(actors.A, Archive("2026-10-16"), dryRun: false);
        Assert.Equal(1, changed.GetProperty("withDifferences").GetInt32());

        // Otra persona puede importar el mismo archivo: los ids se resuelven por dueño.
        var other = await PostImportAsync(actors.B, Archive("2026-10-15"), dryRun: false);
        Assert.Equal(2, other.GetProperty("toCreate").GetInt32());

        // Reversión: quita lo creado por el lote (borrado lógico) y no se puede repetir.
        using var revert = await QaSupport.SendAsync(actors.A, HttpMethod.Post, $"/api/brisa/import/{batchId}/revert");
        Assert.Equal(HttpStatusCode.OK, revert.StatusCode);
        Assert.DoesNotContain(await ListIdsAsync(actors.A), listed => listed == first.ToString());
        using var repeated = await QaSupport.SendAsync(actors.A, HttpMethod.Post, $"/api/brisa/import/{batchId}/revert");
        await QaSupport.AssertProblemAsync(repeated, HttpStatusCode.Conflict);
    }

    // ---------------------------------------------------------------- Apoyo

    private static async Task<JsonElement> CreateTaskAsync(HttpClient client, string title)
    {
        using var response = await QaSupport.SendAsync(
            client, HttpMethod.Post, TasksPath, new { title, scheduledDate = "2026-10-18" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static async Task<JsonElement> PostImportAsync(HttpClient client, string content, bool dryRun)
    {
        using var response = await QaSupport.SendAsync(client, HttpMethod.Post, "/api/brisa/import", new { content, dryRun });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static async Task<List<JsonElement>> ListAsync(HttpClient client, string query = "")
    {
        using var response = await QaSupport.SendAsync(client, HttpMethod.Get, TasksPath + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("items").EnumerateArray().Select(item => item.Clone()).ToList();
    }

    private static async Task<List<string>> ListIdsAsync(HttpClient client) =>
        (await ListAsync(client)).Select(item => item.GetProperty("id").GetString()!).ToList();

    private async Task<Actors> ActorsAsync()
    {
        await Gate.WaitAsync();
        try
        {
            if (_actors is not null)
            {
                return _actors;
            }

            // Acceder a Server arranca el host (migraciones y semillas) antes de tocar la base.
            _ = _factory.Server;
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();

            var roleId = await CreateBrisaRoleAsync(db);
            var a = await CreateUserAsync(db, hasher, "a", roleId);
            var b = await CreateUserAsync(db, hasher, "b", roleId);

            var clientA = QaSupport.NewClient(_factory);
            await QaSupport.LoginAsync(clientA, a.Email, a.Password);
            var clientB = QaSupport.NewClient(_factory);
            await QaSupport.LoginAsync(clientB, b.Email, b.Password);
            var member = QaSupport.NewClient(_factory);
            await QaSupport.LoginAsync(member, MemberEmail, MemberPassword);

            _actors = new Actors(clientA, clientB, member);
            return _actors;
        }
        finally
        {
            Gate.Release();
        }
    }

    private static async Task<Guid> CreateBrisaRoleAsync(IdentityDbContext db)
    {
        string[] codes = ["brisa.access", "brisa.items.manage"];
        var name = $"QA Brisa {Guid.NewGuid():N}"[..20];
        var role = new AppRole
        {
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            Description = "Rol de prueba de QA",
            IsSystemRole = false,
        };
        db.Roles.Add(role);
        var permissionIds = await db.Permissions
            .Where(permission => codes.Contains(permission.Code))
            .Select(permission => permission.Id)
            .ToListAsync();
        Assert.Equal(codes.Length, permissionIds.Count);
        foreach (var permissionId in permissionIds)
        {
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permissionId });
        }

        await db.SaveChangesAsync();
        return role.Id;
    }

    private sealed record Account(string Email, string Password);

    private static async Task<Account> CreateUserAsync(IdentityDbContext db, IPasswordHasher<AppUser> hasher, string label, Guid roleId)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.brisa.{label}.{suffix}@pastel.test";
        var password = $"Qa-Brisa-{suffix}-Passphrase-2026!";
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = $"QA Brisa {label}",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { User = user, RoleId = roleId });
        await db.SaveChangesAsync();
        return new Account(email, password);
    }
}
