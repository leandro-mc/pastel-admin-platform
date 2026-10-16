using Pastel.Application.Contracts;

namespace Pastel.Application.Abstractions;

public interface IAuthService
{
    Task<AuthenticationResult> RegisterAsync(RegisterCommand command, string? ipAddress, CancellationToken cancellationToken);
    Task<AuthenticationResult> LoginAsync(LoginCommand command, string? ipAddress, CancellationToken cancellationToken);
    Task<AuthenticationResult> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken);
    Task LogoutAsync(string? refreshToken, Guid? actorUserId, string? ipAddress, CancellationToken cancellationToken);
    Task<UserSummary?> GetUserAsync(Guid userId, CancellationToken cancellationToken);
    Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress, CancellationToken cancellationToken);
}
