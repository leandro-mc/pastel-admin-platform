using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;

namespace Pastel.Modules.Identity.Security;

/// <summary>Auditoría de negocio y seguridad. <c>Add</c> comparte la transacción del cambio; <c>WriteAsync</c> guarda por separado.</summary>
internal sealed class AuditTrail(IdentityDbContext db, IHttpContextAccessor accessor, IServiceScopeFactory scopes) : IAuditTrail
{
    private static readonly JsonSerializerOptions DetailsOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public void Add(AuditRecord record) => db.AuditLogs.Add(ToEntity(record));

    public async Task WriteAsync(AuditRecord record, CancellationToken cancellationToken = default)
    {
        await using var scope = scopes.CreateAsyncScope();
        var separate = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        separate.AuditLogs.Add(ToEntity(record));
        await separate.SaveChangesAsync(cancellationToken);
    }

    private AuditLog ToEntity(AuditRecord record)
    {
        var context = accessor.HttpContext;
        return new AuditLog
        {
            Action = record.Action,
            Module = record.Module,
            ActorUserId = record.ActorUserId,
            TargetUserId = record.TargetUserId,
            Target = record.Target,
            DetailsJson = record.Before is null && record.After is null
                ? null
                : JsonSerializer.Serialize(new { before = record.Before, after = record.After }, DetailsOptions),
            IpAddress = context?.Connection.RemoteIpAddress?.ToString(),
            TraceId = context is null ? null : PastelProblem.TraceId(context),
        };
    }
}
