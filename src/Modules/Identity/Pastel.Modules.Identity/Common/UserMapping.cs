using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;

namespace Pastel.Modules.Identity.Common;

/// <summary>Conversiones y normalizaciones compartidas por los slices.</summary>
internal static class UserMapping
{
    public static UserSummary ToSummary(AppUser user) => new(
        user.Id, user.Email, user.DisplayName, user.IsActive, user.MustChangePassword, user.AccessFailedCount,
        user.LockoutEnd, user.CreatedAt, user.UserRoles.Select(x => x.Role.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray());

    public static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToUpperInvariant();

    public static bool IsValidEmail(string normalizedEmail) =>
        normalizedEmail.Length is > 3 and <= 320
        && MailAddress.TryCreate(normalizedEmail, out var parsed)
        && parsed.Address.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase);

    public static Task<AppUser?> FindWithRolesAsync(this IdentityDbContext db, Guid userId, CancellationToken cancellationToken) =>
        db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role).SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
}
