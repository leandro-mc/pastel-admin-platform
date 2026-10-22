using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Casos obligatorios F0-S101 a F0-S116 (jerarquía de privilegios). Cada prueba crea sus propios roles y
/// cuentas con sufijo único y ejerce la API real contra la base aislada pastel_integration_tests.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class PrivilegeHierarchyTests : IClassFixture<IdentityApiFactory>, IDisposable
{
    private const string AdminEmail = "test.admin@pastel.local";
    private const string AdminPassword = "Local-Only-Test-Admin-2026!";
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";
    private const string DeniedAudit = "identity.privilege.denied";

    // Gestor-usuarios: rol no administrador con permisos de usuarios (el código de bloqueo es settings.users.lock).
    private static readonly string[] UserManagerPermissions =
    [
        "settings.users.read",
        "settings.users.update",
        "settings.users.lock",
        "settings.users.reset_password",
    ];

    // Gestor-roles: puede editar permisos de roles y conoce solo algunos permisos.
    private static readonly string[] RoleManagerPermissions =
    [
        "settings.roles.read",
        "settings.roles.update",
        "settings.permissions.read",
        "settings.users.read",
    ];

    private readonly IdentityApiFactory _factory;
    private readonly List<HttpClient> _clients = [];

    public PrivilegeHierarchyTests(IdentityApiFactory factory) => _factory = factory;

    public void Dispose()
    {
        foreach (var client in _clients)
        {
            client.Dispose();
        }
    }

    // ---------------------------------------------------------------- F0-S101 a F0-S103

    [Trait("RequirementId", "F0-S101")]
    [RequiresPostgresFact]
    public async Task S101_user_manager_cannot_assign_administrator_to_self()
    {
        var manager = await UserManagerAsync();
        var administratorRole = await RoleIdByNameAsync("Administrator");

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/users/{manager.Account.Id}/roles",
            new { roleIds = new[] { manager.RoleId, administratorRole } });

        AssertDenied(result, "identity.privilege.escalation");
        Assert.Equal(new[] { manager.RoleId }, await RoleIdsOfAsync(manager.Account.Id));
        Assert.True(await AuditExistsAsync(manager.Account.Id, DeniedAudit, "identity.privilege.escalation"));
    }

    [Trait("RequirementId", "F0-S102")]
    [RequiresPostgresFact]
    public async Task S102_user_manager_cannot_assign_administrator_to_another_user()
    {
        var manager = await UserManagerAsync();
        var target = await CreateUserAsync("objetivo", await RoleIdByNameAsync("Member"));
        var administratorRole = await RoleIdByNameAsync("Administrator");

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/users/{target.Id}/roles",
            new { roleIds = new[] { administratorRole } });

        AssertDenied(result, "identity.privilege.escalation");
        Assert.DoesNotContain(administratorRole, await RoleIdsOfAsync(target.Id));
    }

    [Trait("RequirementId", "F0-S103")]
    [RequiresPostgresFact]
    public async Task S103_administrator_can_assign_administrator_and_it_is_audited_with_before_and_after()
    {
        var target = await CreateUserAsync("promovido", await RoleIdByNameAsync("Member"));
        var administratorRole = await RoleIdByNameAsync("Administrator");
        var adminId = await UserIdByEmailAsync(AdminEmail);
        var admin = await CachedSignInAsync(AdminEmail, AdminPassword);

        var result = await SendAsync(
            admin, HttpMethod.Put, $"/api/admin/users/{target.Id}/roles",
            new { roleIds = new[] { administratorRole } });

        Assert.Equal(HttpStatusCode.OK, result.Status);
        Assert.Contains(administratorRole, await RoleIdsOfAsync(target.Id));
        var entries = await AuditEntriesAsync(adminId, target.Id);
        Assert.Contains(entries, entry => entry.Action != DeniedAudit
            && entry.DetailsJson is not null
            && entry.DetailsJson.Contains("before", StringComparison.Ordinal)
            && entry.DetailsJson.Contains("after", StringComparison.Ordinal));
    }

    // ---------------------------------------------------------------- F0-S104 y F0-S105

    [Trait("RequirementId", "F0-S104")]
    [RequiresPostgresFact]
    public async Task S104_user_manager_cannot_reset_the_password_of_an_administrator()
    {
        var manager = await UserManagerAsync();
        var adminId = await UserIdByEmailAsync(AdminEmail);
        var hashBefore = await PasswordHashOfAsync(adminId);

        var result = await SendAsync(manager.Client, HttpMethod.Post, $"/api/admin/users/{adminId}/reset-password");

        AssertDenied(result, "identity.privilege.administrator_account_protected");
        Assert.DoesNotContain("temporaryPassword", result.Body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(hashBefore, await PasswordHashOfAsync(adminId));
    }

    [Trait("RequirementId", "F0-S105")]
    [RequiresPostgresFact]
    public async Task S105_user_manager_resets_a_normal_user_but_not_their_own_password()
    {
        var manager = await UserManagerAsync();
        var target = await CreateUserAsync("normal", await RoleIdByNameAsync("Member"));

        var reset = await SendAsync(manager.Client, HttpMethod.Post, $"/api/admin/users/{target.Id}/reset-password");

        Assert.Equal(HttpStatusCode.OK, reset.Status);
        using var document = JsonDocument.Parse(reset.Body);
        var temporaryPassword = document.RootElement.GetProperty("temporaryPassword").GetString();
        Assert.False(string.IsNullOrWhiteSpace(temporaryPassword));
        Assert.True(document.RootElement.GetProperty("mustChangePassword").GetBoolean());

        var login = NewClient();
        var loginResult = await SendAsync(
            login, HttpMethod.Post, "/api/auth/login", new { email = target.Email, password = temporaryPassword });
        Assert.Equal(HttpStatusCode.OK, loginResult.Status);

        var self = await SendAsync(manager.Client, HttpMethod.Post, $"/api/admin/users/{manager.Account.Id}/reset-password");
        AssertDenied(self, "identity.privilege.self_action_not_allowed");
    }

    // ---------------------------------------------------------------- F0-S106 a F0-S108

    [Trait("RequirementId", "F0-S106")]
    [RequiresPostgresFact]
    public async Task S106_role_manager_cannot_add_a_permission_they_do_not_hold()
    {
        var manager = await RoleManagerAsync();
        var targetRole = await CreateRoleAsync("Rol objetivo", "settings.permissions.read");
        var requested = await PermissionIdsAsync("settings.permissions.read", "settings.audit.read");

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/roles/{targetRole}/permissions",
            new { permissionIds = requested });

        AssertDenied(result, "identity.privilege.permission_not_held");
        Assert.DoesNotContain("settings.audit.read", await PermissionCodesOfRoleAsync(targetRole));
    }

    [Trait("RequirementId", "F0-S107")]
    [RequiresPostgresFact]
    public async Task S107_role_manager_can_add_a_permission_they_hold_and_it_is_audited()
    {
        var manager = await RoleManagerAsync();
        var targetRole = await CreateRoleAsync("Rol objetivo", "settings.permissions.read");
        var requested = await PermissionIdsAsync("settings.permissions.read", "settings.users.read");

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/roles/{targetRole}/permissions",
            new { permissionIds = requested });

        Assert.Equal(HttpStatusCode.NoContent, result.Status);
        Assert.Contains("settings.users.read", await PermissionCodesOfRoleAsync(targetRole));
        var entries = await AuditEntriesAsync(manager.Account.Id, null);
        Assert.Contains(entries, entry => entry.Action == "admin.role.permissions-updated"
            && entry.DetailsJson is not null
            && entry.DetailsJson.Contains("settings.users.read", StringComparison.Ordinal));
    }

    [Trait("RequirementId", "F0-S108")]
    [RequiresPostgresFact]
    public async Task S108_role_manager_cannot_modify_a_role_they_hold()
    {
        var manager = await RoleManagerAsync();
        var requested = await PermissionIdsAsync("settings.roles.read", "settings.roles.update");

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/roles/{manager.RoleId}/permissions",
            new { permissionIds = requested });

        AssertDenied(result, "identity.privilege.own_role_protected");
    }

    // ---------------------------------------------------------------- F0-S109 y F0-S110

    [Trait("RequirementId", "F0-S109")]
    [RequiresPostgresFact]
    public async Task S109_user_manager_cannot_grant_themselves_permission_exceptions()
    {
        var manager = await UserManagerAsync();
        var permission = (await PermissionIdsAsync("settings.users.create"))[0];

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/users/{manager.Account.Id}/permissions",
            new { changes = new[] { new { permissionId = permission, effect = "Grant" } } });

        AssertDenied(result, "identity.privilege.self_action_not_allowed");
        Assert.Empty(await OverridesOfAsync(manager.Account.Id));
    }

    [Trait("RequirementId", "F0-S110")]
    [RequiresPostgresFact]
    public async Task S110_user_manager_cannot_grant_an_exception_they_do_not_hold_to_another_user()
    {
        var manager = await UserManagerAsync();
        var target = await CreateUserAsync("normal", await RoleIdByNameAsync("Member"));
        var permission = (await PermissionIdsAsync("settings.audit.read"))[0];

        var result = await SendAsync(
            manager.Client, HttpMethod.Put, $"/api/admin/users/{target.Id}/permissions",
            new { changes = new[] { new { permissionId = permission, effect = "Grant" } } });

        AssertDenied(result, "identity.privilege.permission_not_held");
        Assert.Empty(await OverridesOfAsync(target.Id));
    }

    // ---------------------------------------------------------------- F0-S111 y F0-S112

    [Trait("RequirementId", "F0-S111")]
    [RequiresPostgresFact]
    public async Task S111_user_manager_cannot_block_an_administrator()
    {
        var manager = await UserManagerAsync();
        var adminId = await UserIdByEmailAsync(AdminEmail);

        var result = await SendAsync(manager.Client, HttpMethod.Post, $"/api/admin/users/{adminId}/block");

        AssertDenied(result, "identity.privilege.administrator_account_protected");
        Assert.True(await IsActiveAsync(adminId));
    }

    [Trait("RequirementId", "F0-S112")]
    [RequiresPostgresFact]
    public async Task S112_nobody_can_block_their_own_account_not_even_an_administrator()
    {
        var manager = await UserManagerAsync();
        var adminId = await UserIdByEmailAsync(AdminEmail);
        var admin = await CachedSignInAsync(AdminEmail, AdminPassword);

        var byManager = await SendAsync(manager.Client, HttpMethod.Post, $"/api/admin/users/{manager.Account.Id}/block");
        var byAdministrator = await SendAsync(admin, HttpMethod.Post, $"/api/admin/users/{adminId}/block");

        AssertDenied(byManager, "identity.privilege.self_action_not_allowed");
        AssertDenied(byAdministrator, "identity.privilege.self_action_not_allowed");
        Assert.True(await IsActiveAsync(manager.Account.Id));
        Assert.True(await IsActiveAsync(adminId));
    }

    // ---------------------------------------------------------------- F0-S113 y F0-S114 (concurrencia y último administrador)

    [Trait("RequirementId", "F0-S113")]
    [RequiresPostgresFact]
    public async Task S113_two_administrators_blocking_each_other_never_leave_zero_active_administrators()
    {
        var administratorRole = await RoleIdByNameAsync("Administrator");
        var first = await CreateUserAsync("admin-a", administratorRole);
        var second = await CreateUserAsync("admin-b", administratorRole);
        var firstClient = await SignInAsync(first.Email, first.Password);
        var secondClient = await SignInAsync(second.Email, second.Password);

        await WithOnlyTheseAdministratorsActiveAsync([first.Id, second.Id], async () =>
        {
            var results = await Task.WhenAll(
                SendAsync(firstClient, HttpMethod.Post, $"/api/admin/users/{second.Id}/block"),
                SendAsync(secondClient, HttpMethod.Post, $"/api/admin/users/{first.Id}/block"));

            Assert.All(results, result => Assert.NotEqual(HttpStatusCode.InternalServerError, result.Status));
            Assert.Contains(results, result => result.Status == HttpStatusCode.NoContent);
            Assert.True(await CountActiveAdministratorsAsync() >= 1, "Nunca debe quedar la plataforma sin administradores activos.");
        });
    }

    [Trait("RequirementId", "F0-S114")]
    [RequiresPostgresFact]
    public async Task S114_removing_the_administrator_role_from_the_last_administrator_is_rejected()
    {
        var adminId = await UserIdByEmailAsync(AdminEmail);
        var admin = await CachedSignInAsync(AdminEmail, AdminPassword);

        await WithOnlyTheseAdministratorsActiveAsync([adminId], async () =>
        {
            var result = await SendAsync(
                admin, HttpMethod.Put, $"/api/admin/users/{adminId}/roles", new { roleIds = Array.Empty<Guid>() });

            Assert.Equal(HttpStatusCode.Conflict, result.Status);
            Assert.Equal("identity.user.last_admin", result.Code);
            Assert.Contains(await RoleIdByNameAsync("Administrator"), await RoleIdsOfAsync(adminId));
        });
    }

    // ---------------------------------------------------------------- F0-S116

    [Trait("RequirementId", "F0-S116")]
    [RequiresPostgresFact]
    public async Task S116_every_admin_endpoint_returns_401_without_session_and_403_without_the_permission()
    {
        var partial = await PartialAsync();
        var anonymous = NewClient();
        var member = await CachedSignInAsync(MemberEmail, MemberPassword);

        var id = Guid.NewGuid();
        var endpoints = new (HttpMethod Method, string Path, object? Body)[]
        {
            (HttpMethod.Get, "/api/admin/users/", null),
            (HttpMethod.Get, $"/api/admin/users/{id}", null),
            (HttpMethod.Post, "/api/admin/users/", new { }),
            (HttpMethod.Put, $"/api/admin/users/{id}/roles", new { roleIds = Array.Empty<Guid>() }),
            (HttpMethod.Get, $"/api/admin/users/{id}/permissions", null),
            (HttpMethod.Put, $"/api/admin/users/{id}/permissions", new { changes = Array.Empty<object>() }),
            (HttpMethod.Post, $"/api/admin/users/{id}/block", null),
            (HttpMethod.Post, $"/api/admin/users/{id}/unblock", null),
            (HttpMethod.Post, $"/api/admin/users/{id}/reset-password", null),
            (HttpMethod.Get, "/api/admin/roles/", null),
            (HttpMethod.Post, "/api/admin/roles/", new { }),
            (HttpMethod.Put, $"/api/admin/roles/{id}/permissions", new { permissionIds = Array.Empty<Guid>() }),
            (HttpMethod.Get, "/api/admin/permissions/", null),
            (HttpMethod.Get, "/api/admin/modules/", null),
            (HttpMethod.Patch, $"/api/admin/modules/{id}", new { isEnabled = false }),
        };
        const string auditList = "/api/admin/audit/";

        foreach (var (method, path, body) in endpoints)
        {
            var withoutSession = await SendAsync(anonymous, method, path, body);
            ExpectStatus(withoutSession, HttpStatusCode.Unauthorized, $"{method} {path} sin sesión");

            var withoutPermission = await SendAsync(member, method, path, body);
            ExpectStatus(withoutPermission, HttpStatusCode.Forbidden, $"{method} {path} para Member");

            var withPartialPermission = await SendAsync(partial.Client, method, path, body);
            ExpectStatus(withPartialPermission, HttpStatusCode.Forbidden, $"{method} {path} con permiso parcial");
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await SendAsync(anonymous, HttpMethod.Get, auditList)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await SendAsync(member, HttpMethod.Get, auditList)).Status);
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(partial.Client, HttpMethod.Get, auditList)).Status);
    }

    // ---------------------------------------------------------------- Infraestructura de prueba

    private sealed record Actor(TestAccount Account, Guid RoleId, HttpClient Client);

    // El limitador de autenticación admite 12 inicios de sesión por minuto y por IP, y TestServer comparte IP.
    // Por eso los actores de uso común se crean y firman una sola vez por fixture (≈8 inicios de sesión en total).
    private sealed class SharedState
    {
        public Dictionary<string, HttpClient> Clients { get; } = [];

        public Dictionary<string, Actor> Actors { get; } = [];
    }

    private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<IdentityApiFactory, SharedState> Shared = new();

    private SharedState State => Shared.GetOrCreateValue(_factory);

    private async Task<HttpClient> CachedSignInAsync(string email, string password)
    {
        if (State.Clients.TryGetValue(email, out var existing))
        {
            return existing;
        }

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
        var login = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email, password });
        ExpectStatus(login, HttpStatusCode.OK, $"Inicio de sesión de {email}");
        State.Clients[email] = client;
        return client;
    }

    private Task<Actor> UserManagerAsync() => SharedActorAsync("gestor-usuarios", UserManagerPermissions);

    private Task<Actor> RoleManagerAsync() => SharedActorAsync("gestor-roles", RoleManagerPermissions);

    private Task<Actor> PartialAsync() => SharedActorAsync("permiso-parcial", "settings.audit.read");

    private async Task<Actor> SharedActorAsync(string label, params string[] permissionCodes)
    {
        if (State.Actors.TryGetValue(label, out var existing))
        {
            return existing;
        }

        var roleId = await CreateRoleAsync(label, permissionCodes);
        var account = await CreateUserAsync(label, roleId);
        var client = await CachedSignInAsync(account.Email, account.Password);
        var actor = new Actor(account, roleId, client);
        State.Actors[label] = actor;
        return actor;
    }

    private sealed record ApiResult(HttpStatusCode Status, string? Code, string Body);

    private sealed record TestAccount(Guid Id, string Email, string Password);

    private static void AssertDenied(ApiResult result, string expectedCode)
    {
        if (result.Status != HttpStatusCode.Forbidden || result.Code != expectedCode)
        {
            Assert.Fail($"Se esperaba 403 {expectedCode} y se obtuvo {(int)result.Status} {result.Code}: {result.Body}");
        }
    }

    private static void ExpectStatus(ApiResult result, HttpStatusCode expected, string description)
    {
        if (result.Status != expected)
        {
            Assert.Fail($"{description}: se esperaba {(int)expected} y se obtuvo {(int)result.Status}: {result.Body}");
        }
    }

    private HttpClient NewClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
        _clients.Add(client);
        return client;
    }

    private async Task<HttpClient> SignInAsync(string email, string password)
    {
        var client = NewClient();
        var login = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email, password });
        ExpectStatus(login, HttpStatusCode.OK, $"Inicio de sesión de {email}");
        return client;
    }

    private static async Task<string> CsrfTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("csrfToken").GetString()
            ?? throw new InvalidOperationException("El endpoint CSRF no devolvió un token.");
    }

    private static async Task<ApiResult> SendAsync(HttpClient client, HttpMethod method, string path, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        if (method != HttpMethod.Get)
        {
            request.Headers.Add("X-CSRF-TOKEN", await CsrfTokenAsync(client));
        }

        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        string? code = null;
        if ((int)response.StatusCode >= 400 && text.Length > 0)
        {
            try
            {
                using var document = JsonDocument.Parse(text);
                if (document.RootElement.ValueKind == JsonValueKind.Object
                    && document.RootElement.TryGetProperty("code", out var codeElement))
                {
                    code = codeElement.GetString();
                }
            }
            catch (JsonException)
            {
                // Cuerpo que no es JSON: el código queda en null y el cuerpo se conserva para el mensaje de la aserción.
            }
        }

        return new ApiResult(response.StatusCode, code, text);
    }

    private IServiceScope CreateScope()
    {
        // Acceder a Server arranca el host (migraciones y semillas) antes de tocar la base.
        _ = _factory.Server;
        return _factory.Services.CreateScope();
    }

    private static string Suffix() => Guid.NewGuid().ToString("N")[..8];

    private async Task<Guid> RoleIdByNameAsync(string name)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = name.ToUpperInvariant();
        return await db.Roles.Where(role => role.NormalizedName == normalized).Select(role => role.Id).SingleAsync();
    }

    private async Task<Guid> CreateRoleAsync(string label, params string[] permissionCodes)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var name = $"QA {label} {Suffix()}";
        var role = new AppRole
        {
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            Description = "Rol de prueba de QA",
            IsSystemRole = false,
        };
        db.Roles.Add(role);
        var permissionIds = await db.Permissions
            .Where(permission => permissionCodes.Contains(permission.Code))
            .Select(permission => permission.Id)
            .ToListAsync();
        Assert.Equal(permissionCodes.Length, permissionIds.Count);
        foreach (var permissionId in permissionIds)
        {
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permissionId });
        }

        await db.SaveChangesAsync();
        return role.Id;
    }

    private async Task<TestAccount> CreateUserAsync(string label, params Guid[] roleIds)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var suffix = Suffix();
        var email = $"qa.{label}.{suffix}@pastel.test";
        var password = $"Qa-Priv-{suffix}-Passphrase-2026!";
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = $"QA {label}",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        foreach (var roleId in roleIds)
        {
            db.UserRoles.Add(new UserRole { User = user, RoleId = roleId });
        }

        await db.SaveChangesAsync();
        return new TestAccount(user.Id, email, password);
    }

    private async Task<Guid> UserIdByEmailAsync(string email)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = email.ToUpperInvariant();
        return await db.Users.Where(user => user.NormalizedEmail == normalized).Select(user => user.Id).SingleAsync();
    }

    private async Task<Guid[]> PermissionIdsAsync(params string[] codes)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var ids = await db.Permissions.Where(permission => codes.Contains(permission.Code))
            .Select(permission => permission.Id).ToArrayAsync();
        Assert.Equal(codes.Length, ids.Length);
        return ids;
    }

    private async Task<Guid[]> RoleIdsOfAsync(Guid userId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.UserRoles.Where(link => link.UserId == userId).Select(link => link.RoleId).ToArrayAsync();
    }

    private async Task<string[]> PermissionCodesOfRoleAsync(Guid roleId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.RolePermissions.Where(link => link.RoleId == roleId)
            .Select(link => link.Permission.Code).ToArrayAsync();
    }

    private async Task<Guid[]> OverridesOfAsync(Guid userId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.UserPermissionOverrides.Where(item => item.UserId == userId)
            .Select(item => item.PermissionId).ToArrayAsync();
    }

    private async Task<string?> PasswordHashOfAsync(Guid userId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Users.Where(user => user.Id == userId).Select(user => user.PasswordHash).SingleAsync();
    }

    private async Task<bool> IsActiveAsync(Guid userId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Users.Where(user => user.Id == userId).Select(user => user.IsActive).SingleAsync();
    }

    private async Task<int> CountActiveAdministratorsAsync()
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Users.CountAsync(user => user.IsActive
            && user.UserRoles.Any(link => link.Role.NormalizedName == "ADMINISTRATOR"));
    }

    private async Task<List<AuditLog>> AuditEntriesAsync(Guid actorId, Guid? targetId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var query = db.AuditLogs.AsNoTracking().Where(entry => entry.ActorUserId == actorId);
        if (targetId is { } target)
        {
            query = query.Where(entry => entry.TargetUserId == target);
        }

        return await query.ToListAsync();
    }

    private async Task<bool> AuditExistsAsync(Guid actorId, string action, string code)
    {
        var entries = await AuditEntriesAsync(actorId, null);
        return entries.Any(entry => entry.Action == action
            && entry.DetailsJson is not null
            && entry.DetailsJson.Contains(code, StringComparison.Ordinal));
    }

    /// <summary>
    /// Desactiva temporalmente al resto de administradores para probar el invariante del último administrador
    /// y siempre los restaura. Las pruebas de esta colección no se ejecutan en paralelo.
    /// </summary>
    private async Task WithOnlyTheseAdministratorsActiveAsync(Guid[] keepActive, Func<Task> body)
    {
        List<Guid> deactivated;
        using (var scope = CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var others = await db.Users
                .Where(user => user.IsActive
                    && user.UserRoles.Any(link => link.Role.NormalizedName == "ADMINISTRATOR")
                    && !keepActive.Contains(user.Id))
                .ToListAsync();
            deactivated = others.Select(user => user.Id).ToList();
            foreach (var user in others)
            {
                user.IsActive = false;
            }

            await db.SaveChangesAsync();
        }

        try
        {
            await body();
        }
        finally
        {
            using var scope = CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var restore = await db.Users.Where(user => deactivated.Contains(user.Id)).ToListAsync();
            foreach (var user in restore)
            {
                user.IsActive = true;
            }

            await db.SaveChangesAsync();
        }
    }
}
