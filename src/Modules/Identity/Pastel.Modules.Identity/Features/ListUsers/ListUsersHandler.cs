using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ListUsers;

internal sealed class ListUsersHandler(IdentityDbContext db)
{
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
            var pattern = LikePattern.Contains(query.Search);
            users = users.Where(x => EF.Functions.ILike(x.Email, pattern, LikePattern.EscapeCharacter)
                || EF.Functions.ILike(x.DisplayName, pattern, LikePattern.EscapeCharacter));
        }

        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            var role = query.Role.Trim().ToUpperInvariant();
            users = users.Where(x => x.UserRoles.Any(r =>
                r.Role.NormalizedName == role
                && (r.Role.IsSystemRole
                    || (r.Role.RolePermissions.Any(p => p.Permission.Code.StartsWith("settings."))
                        && !r.Role.RolePermissions.Any(p =>
                            p.Permission.Code != IdentityPermissions.DashboardView
                            && !p.Permission.Code.StartsWith("settings."))))));
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
                x.Id,
                x.Email,
                x.DisplayName,
                x.IsActive,
                x.MustChangePassword,
                x.AccessFailedCount,
                x.LockoutEnd,
                x.CreatedAt,
                // El directorio global solo presenta roles de plataforma; la membresía de cada app se ve allí.
                Roles = x.UserRoles
                    .Where(r => r.Role.IsSystemRole
                        || (r.Role.RolePermissions.Any(p => p.Permission.Code.StartsWith("settings."))
                            && !r.Role.RolePermissions.Any(p =>
                                p.Permission.Code != IdentityPermissions.DashboardView
                                && !p.Permission.Code.StartsWith("settings."))))
                    .Select(r => r.Role.Name).ToList(),
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(x => new UserSummary(
            x.Id, x.Email, x.DisplayName, x.IsActive, x.MustChangePassword, x.AccessFailedCount, x.LockoutEnd, x.CreatedAt,
            x.Roles.OrderBy(r => r, StringComparer.Ordinal).ToArray())).ToArray();
        return new PagedResult<UserSummary>(items, page.Page, page.PageSize, total);
    }
}
