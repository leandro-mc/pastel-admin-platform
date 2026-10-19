using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ListUsers;

internal sealed class ListUsersHandler(IdentityDbContext db)
{
    private const int MaxSearchLength = 100;

    public async Task<Result<PagedResult<UserSummary>>> HandleAsync(ListUsersQuery query, CancellationToken cancellationToken)
    {
        var status = query.Status?.Trim().ToLowerInvariant();
        if (status is not (null or "" or "active" or "blocked"))
        {
            return Error.Validation(
                "identity.users.invalid_filter", "El filtro de estado no es válido.",
                new Dictionary<string, string[]> { ["status"] = ["Use active o blocked."] });
        }

        var page = PageRequest.Normalize(query.Page, query.PageSize);
        var users = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            var pattern = "%" + Escape(term.Length > MaxSearchLength ? term[..MaxSearchLength] : term) + "%";
            users = users.Where(x => EF.Functions.ILike(x.Email, pattern, "\\") || EF.Functions.ILike(x.DisplayName, pattern, "\\"));
        }

        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            var role = query.Role.Trim().ToUpperInvariant();
            users = users.Where(x => x.UserRoles.Any(r => r.Role.NormalizedName == role));
        }

        users = status switch
        {
            "active" => users.Where(x => x.IsActive),
            "blocked" => users.Where(x => !x.IsActive),
            _ => users,
        };

        var total = await users.CountAsync(cancellationToken);
        var rows = await users
            .OrderBy(x => x.NormalizedEmail)
            .Skip(page.Skip).Take(page.PageSize)
            .Select(x => new
            {
                x.Id, x.Email, x.DisplayName, x.IsActive, x.MustChangePassword, x.AccessFailedCount, x.LockoutEnd, x.CreatedAt,
                Roles = x.UserRoles.Select(r => r.Role.Name).ToList(),
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new UserSummary(
            x.Id, x.Email, x.DisplayName, x.IsActive, x.MustChangePassword, x.AccessFailedCount, x.LockoutEnd, x.CreatedAt,
            x.Roles.OrderBy(r => r, StringComparer.Ordinal).ToArray())).ToArray();
        return new PagedResult<UserSummary>(items, page.Page, page.PageSize, total);
    }

    /// <summary>Escapa los comodines de <c>ILIKE</c> para que la búsqueda sea literal.</summary>
    private static string Escape(string value) => value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
