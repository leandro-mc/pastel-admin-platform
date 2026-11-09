using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;
using static Pastel.IntegrationTests.QA.QaSupport;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Modo desarrollador: lo recibe todo Administrator, se concede a cuentas concretas, nunca a un rol personalizado, y
/// el endpoint de definiciones de rol lo exige en el servidor. La simulación visual no cambia ninguna autorización.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class DeveloperModeTests : IClassFixture<IdentityApiFactory>
{
    private const string DeveloperMode = "platform.developer.mode";
    private const string AdminEmail = "test.admin@pastel.local";
    private const string AdminPassword = "Local-Only-Test-Admin-2026!";
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";

    private readonly IdentityApiFactory _factory;

    public DeveloperModeTests(IdentityApiFactory factory) => _factory = factory;

    [RequiresPostgresFact]
    public async Task Administrator_receives_developer_mode_automatically_and_a_member_does_not()
    {
        Assert.Contains(DeveloperMode, await PermissionsOfAsync(AdminEmail, AdminPassword));
        Assert.DoesNotContain(DeveloperMode, await PermissionsOfAsync(MemberEmail, MemberPassword));
    }

    [RequiresPostgresFact]
    public async Task Developer_roles_endpoint_requires_the_permission_and_rejects_unknown_apps()
    {
        using var member = await SignedInAsync(MemberEmail, MemberPassword);
        using var denied = await SendAsync(member, HttpMethod.Get, "/api/admin/developer/roles?app=identity");
        await AssertProblemAsync(denied, HttpStatusCode.Forbidden);

        using var admin = await SignedInAsync(AdminEmail, AdminPassword);
        using var unknown = await SendAsync(admin, HttpMethod.Get, "/api/admin/developer/roles?app=no-existe");
        var problem = await AssertProblemAsync(unknown, HttpStatusCode.NotFound);
        Assert.Equal("identity.developer.app_not_found", problem.GetProperty("code").GetString());

        using var allowed = await SendAsync(admin, HttpMethod.Get, "/api/admin/developer/roles?app=identity");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        using var document = JsonDocument.Parse(await allowed.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal("identity", root.GetProperty("app").GetString());
        Assert.Contains(DeveloperMode, root.GetProperty("appPermissions").EnumerateArray().Select(x => x.GetString()));
        var administrator = root.GetProperty("roles").EnumerateArray()
            .Single(role => role.GetProperty("name").GetString() == "Administrator");
        Assert.Contains(DeveloperMode, administrator.GetProperty("permissions").EnumerateArray().Select(x => x.GetString()));
    }

    [RequiresPostgresFact]
    public async Task Developer_mode_cannot_be_given_to_a_custom_role()
    {
        using var admin = await SignedInAsync(AdminEmail, AdminPassword);
        var developerPermissionId = await PermissionIdAsync(DeveloperMode);

        using var response = await SendAsync(admin, HttpMethod.Post, "/api/admin/roles", new
        {
            name = $"QA modo dev {Guid.NewGuid():N}"[..24],
            description = "No debe crearse",
            permissionIds = new[] { developerPermissionId },
        });

        var problem = await AssertProblemAsync(response, HttpStatusCode.Forbidden);
        Assert.Equal("identity.privilege.developer_mode_individual_only", problem.GetProperty("code").GetString());
    }

    [RequiresPostgresFact]
    public async Task Administrator_can_grant_developer_mode_to_one_account_and_it_takes_effect_after_signing_in_again()
    {
        var target = await CreateMemberAsync();
        var developerPermissionId = await PermissionIdAsync(DeveloperMode);

        using var admin = await SignedInAsync(AdminEmail, AdminPassword);
        using var grant = await SendAsync(admin, HttpMethod.Put, $"/api/admin/users/{target.Id}/permissions", new
        {
            changes = new[] { new { permissionId = developerPermissionId, effect = "Grant" } },
        });
        Assert.Equal(HttpStatusCode.NoContent, grant.StatusCode);

        // La cuenta no es administradora: lo recibe como excepción individual y puede usar el endpoint.
        Assert.Contains(DeveloperMode, await PermissionsOfAsync(target.Email, target.Password));
        using var member = await SignedInAsync(target.Email, target.Password);
        using var roles = await SendAsync(member, HttpMethod.Get, "/api/admin/developer/roles?app=identity");
        Assert.Equal(HttpStatusCode.OK, roles.StatusCode);
    }

    private async Task<HttpClient> SignedInAsync(string email, string password)
    {
        _ = _factory.Server;
        var client = NewClient(_factory);
        await LoginAsync(client, email, password);
        return client;
    }

    private async Task<string[]> PermissionsOfAsync(string email, string password)
    {
        using var client = await SignedInAsync(email, password);
        using var response = await SendAsync(client, HttpMethod.Get, "/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("permissions").EnumerateArray().Select(x => x.GetString()!).ToArray();
    }

    private async Task<Guid> PermissionIdAsync(string code)
    {
        _ = _factory.Server;
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Permissions.Where(permission => permission.Code == code).Select(permission => permission.Id).SingleAsync();
    }

    private async Task<(Guid Id, string Email, string Password)> CreateMemberAsync()
    {
        _ = _factory.Server;
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.devmode.{suffix}@pastel.test";
        var password = $"Qa-Dev-{suffix}-Passphrase-2026!";
        var now = DateTimeOffset.UtcNow;
        var memberRoleId = await db.Roles.Where(role => role.NormalizedName == "MEMBER").Select(role => role.Id).SingleAsync();
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA modo desarrollador",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { User = user, RoleId = memberRoleId });
        await db.SaveChangesAsync();
        return (user.Id, email, password);
    }
}
