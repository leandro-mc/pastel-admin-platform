using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Serilog.Core;
using Serilog.Events;

namespace Pastel.Platform.Observability;

/// <summary>Agrega a cada evento <c>TraceId</c>, <c>RequestId</c>, <c>UserId</c> (GUID, nunca el correo), <c>Module</c> y <c>ClientIp</c>.</summary>
public sealed class PastelLogEnricher(IHttpContextAccessor accessor) : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        if (Activity.Current?.TraceId.ToString() is { } traceId)
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("TraceId", traceId));
        }

        var context = accessor.HttpContext;
        if (context is null)
        {
            return;
        }

        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("RequestId", context.TraceIdentifier));
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Module", ModuleOf(context.Request.Path)));
        if (context.Connection.RemoteIpAddress is { } ip)
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ClientIp", ip.ToString()));
        }

        if (Guid.TryParse(context.User.FindFirst("sub")?.Value, out var userId))
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("UserId", userId));
        }
    }

    internal static string ModuleOf(PathString path)
    {
        var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments is not { Length: >= 2 } || segments[0] != "api")
        {
            return "platform";
        }

        return segments[1] switch
        {
            "auth" or "admin" => "identity",
            "client-errors" => "platform",
            var other => other,
        };
    }
}
