using Pastel.Domain.Entities;

namespace Pastel.Application.Abstractions;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(AppUser user);
}
