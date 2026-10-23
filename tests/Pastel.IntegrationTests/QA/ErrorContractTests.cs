using System.Net;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;
using static Pastel.IntegrationTests.QA.QaSupport;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Casos F0-E01, F0-E03 y F0-E04: todos los errores comparten el contrato problem+json (con code y traceId, sin
/// detalles internos) y las operaciones concurrentes terminan de forma controlada, nunca con un 500.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class ErrorContractTests : IClassFixture<IdentityApiFactory>
{
    private const string AdminEmail = "test.admin@pastel.local";
    private const string AdminPassword = "Local-Only-Test-Admin-2026!";
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";

    private readonly IdentityApiFactory _factory;

    public ErrorContractTests(IdentityApiFactory factory) => _factory = factory;

    [Trait("RequirementId", "F0-E01")]
    [RequiresPostgresFact]
    public async Task E01_validation_401_403_404_and_unique_conflict_share_the_problem_json_contract()
    {
        using var anonymous = NewClient(_factory);
        using var member = NewClient(_factory);
        using var admin = NewClient(_factory);
        await LoginAsync(member, MemberEmail, MemberPassword);
        await LoginAsync(admin, AdminEmail, AdminPassword);

        // 401: sin sesión.
        using (var response = await SendAsync(anonymous, HttpMethod.Get, "/api/auth/me"))
        {
            await AssertProblemAsync(response, HttpStatusCode.Unauthorized);
        }

        // 403: sesión válida sin el permiso.
        using (var response = await SendAsync(member, HttpMethod.Get, "/api/admin/users/"))
        {
            await AssertProblemAsync(response, HttpStatusCode.Forbidden);
        }

        // 404: recurso inexistente.
        using (var response = await SendAsync(admin, HttpMethod.Get, $"/api/admin/users/{Guid.NewGuid()}"))
        {
            await AssertProblemAsync(response, HttpStatusCode.NotFound);
        }

        // 400: validación, con errores por campo.
        using (var response = await SendAsync(
            admin,
            HttpMethod.Post,
            "/api/admin/users/",
            new { email = "no-es-un-correo", displayName = "", temporaryPassword = "corta", roleIds = Array.Empty<Guid>() }))
        {
            var problem = await AssertProblemAsync(response, HttpStatusCode.BadRequest);
            Assert.True(problem.TryGetProperty("errors", out var errors), "Falta el detalle de errores por campo.");
            Assert.True(errors.TryGetProperty("email", out _), "Debe indicar el campo `email`.");
        }

        // 409: dato único repetido.
        var duplicate = ValidNewUser();
        using (var first = await SendAsync(admin, HttpMethod.Post, "/api/admin/users/", duplicate))
        {
            Assert.True(first.IsSuccessStatusCode, $"La creación inicial devolvió {(int)first.StatusCode}.");
        }

        using (var second = await SendAsync(admin, HttpMethod.Post, "/api/admin/users/", duplicate))
        {
            await AssertProblemAsync(second, HttpStatusCode.Conflict);
        }
    }

    [Trait("RequirementId", "F0-E01")]
    [RequiresPostgresFact]
    public async Task E01_429_uses_the_problem_json_contract_and_announces_when_to_retry()
    {
        // Host propio: el limitador de autenticación es por host y esta prueba lo agota a propósito.
        using var host = CreateHost(_factory);
        using var client = NewClient(host);
        var suffix = Guid.NewGuid().ToString("N")[..8];

        HttpResponseMessage? limited = null;
        try
        {
            for (var attempt = 0; attempt < 40 && limited is null; attempt++)
            {
                var response = await SendAsync(
                    client,
                    HttpMethod.Post,
                    "/api/auth/login",
                    new { email = $"qa.limite.{suffix}@pastel.test", password = "Contrasena-Incorrecta-2026!" });
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    limited = response;
                }
                else
                {
                    response.Dispose();
                }
            }

            Assert.NotNull(limited);
            await AssertProblemAsync(limited, HttpStatusCode.TooManyRequests);
            Assert.NotNull(limited.Headers.RetryAfter);
        }
        finally
        {
            limited?.Dispose();
        }
    }

    [Trait("RequirementId", "F0-E03")]
    [RequiresPostgresFact]
    public async Task E03_two_simultaneous_registrations_of_the_same_email_end_in_one_success_and_one_clean_409()
    {
        using var admin = NewClient(_factory);
        await LoginAsync(admin, AdminEmail, AdminPassword);
        var payload = ValidNewUser();

        var responses = await Task.WhenAll(
            SendAsync(admin, HttpMethod.Post, "/api/admin/users/", payload),
            SendAsync(admin, HttpMethod.Post, "/api/admin/users/", payload));
        try
        {
            var statuses = responses.Select(response => response.StatusCode).ToArray();
            Assert.DoesNotContain(HttpStatusCode.InternalServerError, statuses);
            var successes = statuses.Count(status => (int)status is >= 200 and < 300);
            Assert.Equal(1, successes);
            var loser = responses.Single(response => response.StatusCode == HttpStatusCode.Conflict);
            await AssertProblemAsync(loser, HttpStatusCode.Conflict);
        }
        finally
        {
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }
    }

    [Trait("RequirementId", "F0-E04")]
    [RequiresPostgresFact]
    public async Task E04_two_administrators_editing_the_same_role_never_get_a_500_and_leave_a_consistent_result()
    {
        var roleId = await CreateRoleAsync("settings.permissions.read");
        var first = await PermissionIdsAsync("settings.permissions.read", "settings.audit.read");
        var second = await PermissionIdsAsync("settings.permissions.read", "settings.roles.read");
        var otherAdmin = await CreateAdministratorAsync();
        using var adminA = NewClient(_factory);
        using var adminB = NewClient(_factory);
        await LoginAsync(adminA, AdminEmail, AdminPassword);
        await LoginAsync(adminB, otherAdmin.Email, otherAdmin.Password);

        var statuses = await Task.WhenAll(
            StatusOfAsync(adminA, HttpMethod.Put, $"/api/admin/roles/{roleId}/permissions", new { permissionIds = first }),
            StatusOfAsync(adminB, HttpMethod.Put, $"/api/admin/roles/{roleId}/permissions", new { permissionIds = second }));

        var allowed = new[] { HttpStatusCode.NoContent, HttpStatusCode.Conflict, HttpStatusCode.ServiceUnavailable };
        Assert.All(statuses, status => Assert.Contains(status, allowed));
        Assert.Contains(statuses, status => status == HttpStatusCode.NoContent);

        // El resultado es exactamente uno de los dos conjuntos pedidos, nunca una mezcla.
        var final = (await PermissionCodesOfRoleAsync(roleId)).OrderBy(code => code, StringComparer.Ordinal).ToArray();
        var optionA = new[] { "settings.audit.read", "settings.permissions.read" };
        var optionB = new[] { "settings.permissions.read", "settings.roles.read" };
        Assert.True(
            final.SequenceEqual(optionA) || final.SequenceEqual(optionB),
            $"Resultado mezclado: {string.Join(", ", final)}");
    }

    // ---------------------------------------------------------------- Infraestructura de prueba

    private static object ValidNewUser()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        return new
        {
            email = $"qa.errores.{suffix}@pastel.test",
            displayName = "QA Errores",
            temporaryPassword = $"Qa-Errores-{suffix}-Passphrase-2026!",
            roleIds = Array.Empty<Guid>(),
        };
    }

    private IServiceScope CreateScope()
    {
        _ = _factory.Server;
        return _factory.Services.CreateScope();
    }

    private async Task<Guid> CreateRoleAsync(params string[] permissionCodes)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var name = $"QA concurrente {Guid.NewGuid().ToString("N")[..8]}";
        var role = new AppRole
        {
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            Description = "Rol de prueba de QA",
            IsSystemRole = false,
        };
        db.Roles.Add(role);
        foreach (var permissionId in await PermissionIdsAsync(permissionCodes))
        {
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permissionId });
        }

        await db.SaveChangesAsync();
        return role.Id;
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

    private async Task<string[]> PermissionCodesOfRoleAsync(Guid roleId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.RolePermissions.Where(link => link.RoleId == roleId)
            .Select(link => link.Permission.Code).ToArrayAsync();
    }

    private async Task<(string Email, string Password)> CreateAdministratorAsync()
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var administratorRole = await db.Roles.SingleAsync(role => role.NormalizedName == "ADMINISTRATOR");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.admin.{suffix}@pastel.test";
        var password = $"Qa-Admin-{suffix}-Passphrase-2026!";
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA Admin",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { User = user, Role = administratorRole });
        await db.SaveChangesAsync();
        return (email, password);
    }
}
