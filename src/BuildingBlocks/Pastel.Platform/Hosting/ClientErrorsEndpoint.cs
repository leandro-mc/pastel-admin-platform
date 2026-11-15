using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Pastel.Platform.Errors;
using Pastel.Platform.Observability;
using Pastel.Platform.Security;

namespace Pastel.Platform.Hosting;

/// <summary><c>POST /api/client-errors</c>: el cliente reporta errores inesperados. Se registra como Warning y no se guarda en la base.</summary>
internal static class ClientErrorsEndpoint
{
    private const int MaxBodyBytes = 8 * 1024;

    public static IEndpointRouteBuilder MapClientErrors(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/client-errors", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.ClientErrorsRateLimit);
        return app;
    }

    private static async Task<IResult> HandleAsync(HttpContext context, ILoggerFactory loggers)
    {
        var limit = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (limit is { IsReadOnly: false })
        {
            limit.MaxRequestBodySize = MaxBodyBytes;
        }

        var report = await context.Request.ReadFromJsonAsync<ClientErrorReport>(context.RequestAborted);
        if (report is null || string.IsNullOrWhiteSpace(report.Message))
        {
            return PastelProblem.From(PlatformErrors.ValidationFailed, context);
        }

        loggers.CreateLogger("Pastel.ClientError").LogWarning(
            PastelEventIds.ClientError,
            "Error del cliente en {ClientModule} {ClientRoute} versión {ClientVersion}: {ClientMessage} {ClientStack}",
            Clean(report.Module, 64), Clean(report.Route, 200), Clean(report.Version, 32), Clean(report.Message, 500), Clean(report.Stack, 2048));
        return Results.NoContent();
    }

    private static string Clean(string? value, int max)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var cut = value.Length > max ? value[..max] : value;
        return string.Concat(cut.Select(c => char.IsControl(c) && c != '\n' ? ' ' : c));
    }

    private sealed record ClientErrorReport(string? Message, string? Stack, string? Route, string? Module, string? Version);
}
