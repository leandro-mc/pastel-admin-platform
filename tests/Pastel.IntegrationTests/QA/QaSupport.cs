using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>Utilidades compartidas por las pruebas de QA que necesitan un host derivado o inspeccionar respuestas.</summary>
internal static class QaSupport
{
    private static readonly string[] InternalDetails =
    [
        "Exception",
        "StackTrace",
        "   at ",
        "Npgsql",
        "System.",
        "Microsoft.",
        "Pastel.Modules",
        "SELECT ",
        "INSERT ",
        "UPDATE ",
    ];

    /// <summary>
    /// Host derivado de la fábrica de pruebas. Con interceptores sustituye las opciones del DbContext de Identity
    /// (misma base aislada) para poder simular fallos de persistencia.
    /// </summary>
    public static WebApplicationFactory<global::Program> CreateHost(
        IdentityApiFactory baseFactory,
        params IInterceptor[] interceptors)
    {
        var factory = baseFactory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            if (interceptors.Length == 0)
            {
                return;
            }

            var connectionString = Environment.GetEnvironmentVariable("PASTEL_TEST_CONNECTION_STRING")!;
            services.RemoveAll<DbContextOptions<IdentityDbContext>>();
            services.RemoveAll<IdentityDbContext>();
            services.AddDbContext<IdentityDbContext>(options => options
                .UseNpgsql(
                    connectionString,
                    npgsql => npgsql
                        .MigrationsHistoryTable("__EFMigrationsHistory", IdentityDbContext.Schema)
                        .MigrationsAssembly(typeof(IdentityDbContext).Assembly.GetName().Name))
                .AddInterceptors(interceptors));
        }));
        _ = factory.Server;
        return factory;
    }

    public static HttpClient NewClient(WebApplicationFactory<global::Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
            AllowAutoRedirect = false,
        });

    public static async Task<string> CsrfTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("csrfToken").GetString()!;
    }

    /// <summary>Envía una petición (con CSRF en las escrituras) y devuelve la respuesta completa.</summary>
    public static async Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        object? body = null)
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

        return await client.SendAsync(request);
    }

    public static async Task<HttpStatusCode> StatusOfAsync(HttpClient client, HttpMethod method, string path, object? body = null)
    {
        using var response = await SendAsync(client, method, path, body);
        return response.StatusCode;
    }

    public static async Task LoginAsync(HttpClient client, string email, string password)
    {
        using var response = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email, password });
        if (response.StatusCode != HttpStatusCode.OK)
        {
            Assert.Fail($"El inicio de sesión de {email} devolvió {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        }
    }

    /// <summary>Verifica el contrato de error: problem+json con code, traceId y título, sin detalles internos.</summary>
    public static async Task<JsonElement> AssertProblemAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await response.Content.ReadAsStringAsync();
        if (response.StatusCode != expected)
        {
            Assert.Fail($"Se esperaba {(int)expected} y se obtuvo {(int)response.StatusCode}: {body}");
        }

        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement.Clone();
        Assert.Equal((int)expected, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("code").GetString()), "Falta `code`.");
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("traceId").GetString()), "Falta `traceId`.");
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()), "Falta `title`.");
        foreach (var internalDetail in InternalDetails)
        {
            Assert.DoesNotContain(internalDetail, body, StringComparison.Ordinal);
        }

        return root;
    }

    /// <summary>Redirige la salida estándar (donde escribe Serilog en JSON) mientras vive el objeto.</summary>
    public sealed class ConsoleCapture : IDisposable
    {
        private readonly TextWriter _previous = Console.Out;
        private readonly StringWriter _buffer = new();

        public ConsoleCapture() => Console.SetOut(TextWriter.Synchronized(_buffer));

        public string Text => _buffer.ToString();

        public void Dispose() => Console.SetOut(_previous);
    }

    /// <summary>Entradas JSON de log (una por línea) a partir de la posición indicada.</summary>
    public static List<JsonElement> LogEntries(string text, int fromIndex = 0)
    {
        var entries = new List<JsonElement>();
        foreach (var line in text[fromIndex..].Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = line.Trim();
            if (!trimmed.StartsWith('{'))
            {
                continue;
            }

            using var document = JsonDocument.Parse(trimmed);
            entries.Add(document.RootElement.Clone());
        }

        return entries;
    }

    public static string? Property(JsonElement entry, string name) =>
        entry.TryGetProperty(name, out var value) ? value.ToString() : null;
}
