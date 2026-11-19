using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace Pastel.Modules.Agora.Features;

/// <summary>Límites de tasa propios de Ágora. Se registran aquí para no tocar la composición de la plataforma.</summary>
internal static class AgoraRateLimits
{
    /// <summary>Lecturas públicas y anónimas, por IP.</summary>
    public const string Public = "agora-public";

    /// <summary>Escrituras de personas registradas (guardar, reaccionar, avisar errores), por IP.</summary>
    public const string Interaction = "agora-interaction";

    public static IServiceCollection AddAgoraRateLimits(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(Public, context => PerIp(context, 120));
            options.AddPolicy(Interaction, context => PerIp(context, 60));
        });

    private static RateLimitPartition<string> PerIp(HttpContext context, int permitsPerMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(
            (context.Connection.RemoteIpAddress?.ToString() ?? "unknown") + ":" + permitsPerMinute,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
}
