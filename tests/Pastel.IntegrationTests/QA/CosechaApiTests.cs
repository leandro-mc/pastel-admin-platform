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
/// Cosecha por HTTP contra PostgreSQL: permisos por ruta, aislamiento entre compradores, datos que un comprador nunca ve y
/// concurrencia (casos 8, 9, 10 y 12 de <c>docs/modules/COSECHA.md</c> §10). Cada cuenta recibe exactamente los permisos de
/// la prueba mediante excepciones individuales, así no depende de qué roles existan en la base.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class CosechaApiTests : IClassFixture<IdentityApiFactory>
{
    private static readonly string[] ManagerPermissions =
    [
        "cosecha.access",
        "cosecha.catalog.read", "cosecha.catalog.manage",
        "cosecha.producers.read", "cosecha.producers.manage",
        "cosecha.buyers.read", "cosecha.buyers.manage",
        "cosecha.orders.read", "cosecha.orders.manage",
        "cosecha.shipments.read", "cosecha.shipments.manage",
        "cosecha.settlements.read", "cosecha.settlements.manage",
        "cosecha.reports.read",
    ];

    private static readonly string[] BuyerPermissions = ["cosecha.access", "cosecha.orders.read.own"];

    private readonly IdentityApiFactory _factory;

    public CosechaApiTests(IdentityApiFactory factory) => _factory = factory;

    [RequiresPostgresFact]
    public async Task Routes_require_a_session_and_the_right_permission()
    {
        _ = _factory.Server;
        using var anonymous = NewClient(_factory);
        Assert.Equal(HttpStatusCode.Unauthorized, await StatusOfAsync(anonymous, HttpMethod.Get, "/api/cosecha/products"));

        using var accessOnly = await SignedInAsync(["cosecha.access"]);
        Assert.Equal(HttpStatusCode.Forbidden, await StatusOfAsync(accessOnly, HttpMethod.Get, "/api/cosecha/products"));
        Assert.Equal(HttpStatusCode.Forbidden, await StatusOfAsync(accessOnly, HttpMethod.Post, "/api/cosecha/producers", new { name = "No debería crearse" }));

        using var manager = await SignedInAsync(ManagerPermissions);
        Assert.Equal(HttpStatusCode.OK, await StatusOfAsync(manager, HttpMethod.Get, "/api/cosecha/products"));
    }

    [RequiresPostgresFact]
    public async Task A_buyer_sees_only_the_orders_of_their_own_buyers()
    {
        var accountA = await CreateAccountAsync(BuyerPermissions);
        var accountB = await CreateAccountAsync(BuyerPermissions);
        using var manager = await SignedInAsync(ManagerPermissions);
        var seed = await SeedAsync(manager, accountA.Id, accountB.Id);

        using var buyerA = NewClient(_factory);
        await LoginAsync(buyerA, accountA.Email, accountA.Password);

        var list = await GetJsonAsync(buyerA, "/api/cosecha/my/orders");
        var ids = list.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToList();
        Assert.Contains(seed.OrderAId, ids);
        Assert.DoesNotContain(seed.OrderBId, ids);
        Assert.Equal(HttpStatusCode.OK, await StatusOfAsync(buyerA, HttpMethod.Get, $"/api/cosecha/my/orders/{seed.OrderAId}"));
        Assert.Equal(HttpStatusCode.NotFound, await StatusOfAsync(buyerA, HttpMethod.Get, $"/api/cosecha/my/orders/{seed.OrderBId}"));
    }

    [RequiresPostgresFact]
    public async Task A_buyer_cannot_reach_producer_prices_payments_or_margins()
    {
        var accountA = await CreateAccountAsync(BuyerPermissions);
        using var manager = await SignedInAsync(ManagerPermissions);
        var seed = await SeedAsync(manager, accountA.Id, Guid.NewGuid());

        using var buyerA = NewClient(_factory);
        await LoginAsync(buyerA, accountA.Email, accountA.Password);

        foreach (var path in new[]
        {
            "/api/cosecha/producers",
            "/api/cosecha/settlements/producers",
            "/api/cosecha/reports/season",
            "/api/cosecha/shipments",
            "/api/cosecha/orders",
        })
        {
            Assert.Equal(HttpStatusCode.Forbidden, await StatusOfAsync(buyerA, HttpMethod.Get, path));
        }

        using var response = await SendAsync(buyerA, HttpMethod.Get, $"/api/cosecha/my/orders/{seed.OrderAId}");
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        foreach (var hidden in new[] { "producer", "margin", "settlement", "payment" })
        {
            Assert.DoesNotContain(hidden, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [RequiresPostgresFact]
    public async Task Two_simultaneous_edits_of_the_same_delivery_end_in_a_clear_409()
    {
        using var manager = await SignedInAsync(ManagerPermissions);
        var seed = await SeedAsync(manager, Guid.NewGuid(), Guid.NewGuid());

        var shipment = await CreateAsync(
            manager,
            "/api/cosecha/shipments",
            new { seasonId = seed.SeasonId, shipmentDate = "2026-11-20", bufferPercent = 0, orders = new[] { new { orderId = seed.OrderAId } } });
        var shipmentId = shipment.GetProperty("summary").GetProperty("id").GetGuid();
        var shipmentVersion = shipment.GetProperty("summary").GetProperty("version").GetUInt32();

        using var applied = await SendAsync(
            manager,
            HttpMethod.Put,
            $"/api/cosecha/shipments/{shipmentId}/deliveries",
            new { deliveries = new[] { new { producerId = seed.ProducerId, requestedKg = 100m } }, version = shipmentVersion });
        var detail = await ReadJsonAsync(applied, HttpStatusCode.OK);
        var delivery = detail.GetProperty("deliveries")[0];
        var deliveryId = delivery.GetProperty("id").GetGuid();
        var version = delivery.GetProperty("version").GetUInt32();
        var path = $"/api/cosecha/shipments/{shipmentId}/deliveries/{deliveryId}/reception";

        using var first = await SendAsync(manager, HttpMethod.Put, path, new { receivedKg = 100m, rejectedKg = 0m, quality = "Good", version });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        using var second = await SendAsync(manager, HttpMethod.Put, path, new { receivedKg = 90m, rejectedKg = 10m, quality = "Good", version });
        var problem = await AssertProblemAsync(second, HttpStatusCode.Conflict);
        Assert.Equal("platform.concurrency_conflict", problem.GetProperty("code").GetString());
    }

    private sealed record Seed(Guid SeasonId, Guid ProducerId, Guid OrderAId, Guid OrderBId);

    /// <summary>Datos mínimos creados por la API como lo haría el gestor: producto, temporada, un productor con capacidad y dos compradores con un pedido confirmado cada uno.</summary>
    private static async Task<Seed> SeedAsync(HttpClient manager, Guid buyerAUserId, Guid buyerBUserId)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var product = await CreateAsync(manager, "/api/cosecha/products", new { name = $"Rambután {suffix}" });
        var productId = product.GetProperty("id").GetGuid();
        var season = await CreateAsync(
            manager,
            "/api/cosecha/seasons",
            new { name = $"Temporada {suffix}", productId, startsOn = "2026-07-01", endsOn = "2026-12-31", defaultProducerPricePerKg = 650m });
        var seasonId = season.GetProperty("id").GetGuid();
        var producer = await CreateAsync(
            manager,
            "/api/cosecha/producers",
            new { name = $"Productor {suffix}", phones = new[] { new { phone = "88881234", isPrimary = true } } });
        var producerId = producer.GetProperty("id").GetGuid();
        using (var capacity = await SendAsync(manager, HttpMethod.Put, $"/api/cosecha/producers/{producerId}/capacities/{seasonId}", new { estimatedCapacityKg = 100m }))
        {
            Assert.Equal(HttpStatusCode.OK, capacity.StatusCode);
        }

        var orderA = await CreateOrderAsync(manager, $"Comprador A {suffix}", buyerAUserId, seasonId, productId);
        var orderB = await CreateOrderAsync(manager, $"Comprador B {suffix}", buyerBUserId, seasonId, productId);
        return new Seed(seasonId, producerId, orderA, orderB);
    }

    private static async Task<Guid> CreateOrderAsync(HttpClient manager, string buyerName, Guid userId, Guid seasonId, Guid productId)
    {
        var buyer = await CreateAsync(
            manager,
            "/api/cosecha/buyers",
            new { name = buyerName, userId, contacts = new[] { new { name = "Ana", phone = "88885678", isPrimary = true } } });
        var order = await CreateAsync(
            manager,
            "/api/cosecha/orders",
            new
            {
                buyerId = buyer.GetProperty("id").GetGuid(),
                seasonId,
                requiredOn = "2026-11-20",
                confirm = true,
                lines = new[] { new { productId, kilograms = 100m, pricePerKg = 900m } },
            });
        return order.GetProperty("summary").GetProperty("id").GetGuid();
    }

    private static async Task<JsonElement> CreateAsync(HttpClient client, string path, object body)
    {
        using var response = await SendAsync(client, HttpMethod.Post, path, body);
        return await ReadJsonAsync(response, HttpStatusCode.Created);
    }

    private static async Task<JsonElement> GetJsonAsync(HttpClient client, string path)
    {
        using var response = await SendAsync(client, HttpMethod.Get, path);
        return await ReadJsonAsync(response, HttpStatusCode.OK);
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"Se esperaba {(int)expected} y se obtuvo {(int)response.StatusCode}: {body}");
        using var document = JsonDocument.Parse(body);
        return document.RootElement.Clone();
    }

    private async Task<HttpClient> SignedInAsync(string[] permissions)
    {
        var account = await CreateAccountAsync(permissions);
        var client = NewClient(_factory);
        await LoginAsync(client, account.Email, account.Password);
        return client;
    }

    private async Task<(Guid Id, string Email, string Password)> CreateAccountAsync(string[] permissionCodes)
    {
        _ = _factory.Server;
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.cosecha.{suffix}@pastel.test";
        var password = $"Qa-Cosecha-{suffix}-Passphrase-2026!";
        var now = DateTimeOffset.UtcNow;
        var memberRoleId = await db.Roles.Where(role => role.NormalizedName == "MEMBER").Select(role => role.Id).SingleAsync();
        var permissions = await db.Permissions.Where(permission => permissionCodes.Contains(permission.Code)).ToListAsync();
        Assert.Equal(permissionCodes.Length, permissions.Count);

        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA Cosecha",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { User = user, RoleId = memberRoleId });
        foreach (var permission in permissions)
        {
            db.UserPermissionOverrides.Add(new UserPermissionOverride { User = user, PermissionId = permission.Id, Effect = PermissionEffect.Grant });
        }

        await db.SaveChangesAsync();
        return (user.Id, email, password);
    }
}
