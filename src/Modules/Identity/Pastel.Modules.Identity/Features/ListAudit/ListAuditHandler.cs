using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ListAudit;

internal sealed class ListAuditHandler(IdentityDbContext db)
{
    public async Task<Result<PagedResult<AuditEntry>>> HandleAsync(ListAuditQuery query, CancellationToken cancellationToken)
    {
        if (query.From is { } from && query.To is { } to && from > to)
        {
            return Error.Validation(
                "identity.audit.invalid_range", "La fecha inicial no puede ser posterior a la final.",
                new Dictionary<string, string[]> { ["from"] = ["La fecha inicial no puede ser posterior a la final."] });
        }

        var page = PageRequest.Normalize(query.Page, query.PageSize);
        var logs = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var pattern = LikePattern.Contains(query.Action);
            logs = logs.Where(x => EF.Functions.ILike(x.Action, pattern, LikePattern.EscapeCharacter));
        }

        if (!string.IsNullOrWhiteSpace(query.Module))
        {
            var module = query.Module.Trim().ToLowerInvariant();
            logs = logs.Where(x => x.Module == module);
        }

        if (!string.IsNullOrWhiteSpace(query.Actor))
        {
            var pattern = LikePattern.Contains(query.Actor);
            logs = logs.Where(x => db.Users.Any(u => u.Id == x.ActorUserId && EF.Functions.ILike(u.Email, pattern, LikePattern.EscapeCharacter)));
        }

        if (query.TargetUserId is { } target)
        {
            logs = logs.Where(x => x.TargetUserId == target);
        }

        if (query.From is { } since)
        {
            logs = logs.Where(x => x.CreatedAt >= since);
        }

        if (query.To is { } until)
        {
            logs = logs.Where(x => x.CreatedAt <= until);
        }

        var total = await logs.CountAsync(cancellationToken);
        var rows = await logs
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .Skip(page.Skip).Take(page.PageSize)
            .Select(x => new
            {
                Log = x,
                ActorEmail = db.Users.Where(u => u.Id == x.ActorUserId).Select(u => u.Email).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new AuditEntry(
            x.Log.Id, x.Log.ActorUserId, x.ActorEmail, x.Log.TargetUserId, x.Log.Action, x.Log.Module,
            x.Log.Target, x.Log.DetailsJson, x.Log.IpAddress, x.Log.TraceId, x.Log.CreatedAt)).ToArray();
        return new PagedResult<AuditEntry>(items, page.Page, page.PageSize, total);
    }
}
