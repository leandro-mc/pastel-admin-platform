using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Application.Abstractions;
using Pastel.Application.Contracts;
using Pastel.Infrastructure.Security;

namespace Pastel.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, IAppDbContext db, IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    public const string AccessCookieName = "__Host-pastel_access";
    public const string RefreshCookieName = "__Host-pastel_refresh";
    public const string CsrfCookieName = "__Host-pastel_csrf";
    private readonly JwtOptions _jwt = jwtOptions.Value;

    [AllowAnonymous]
    [HttpGet("csrf")]
    public IActionResult GetCsrfToken()
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        Response.Cookies.Append(CsrfCookieName, token, new CookieOptions
        {
            HttpOnly = false, Secure = true, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true,
            MaxAge = TimeSpan.FromHours(8)
        });
        Response.Headers.CacheControl = "no-store";
        return Ok(new { csrfToken = token });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(new RegisterCommand(request.Email, request.DisplayName, request.Password), ClientIp, cancellationToken);
        return WriteAuthResult(result, StatusCodes.Status201Created, StatusCodes.Status400BadRequest);
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(new LoginCommand(request.Email, request.Password), ClientIp, cancellationToken);
        return WriteAuthResult(result, StatusCodes.Status200OK, StatusCodes.Status401Unauthorized);
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken);
        var result = await authService.RefreshAsync(refreshToken ?? string.Empty, ClientIp, cancellationToken);
        return WriteAuthResult(result, StatusCodes.Status200OK, StatusCodes.Status401Unauthorized);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken);
        await authService.LogoutAsync(refreshToken, CurrentUserId, ClientIp, cancellationToken);
        ClearSessionCookies();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (!TryCurrentUserId(out var userId)) return Unauthorized();
        var user = await authService.GetUserAsync(userId, cancellationToken);
        if (user is null) return Unauthorized();
        var rolePermissionCodes = await db.RolePermissions.AsNoTracking()
            .Where(x => x.Role.UserRoles.Any(ur => ur.UserId == userId) && x.Permission.Module.IsEnabled)
            .Select(x => x.Permission.Code).ToListAsync(cancellationToken);
        var overrides = await db.UserPermissionOverrides.AsNoTracking().Include(x => x.Permission).ThenInclude(x => x.Module)
            .Where(x => x.UserId == userId && x.Permission.Module.IsEnabled).ToListAsync(cancellationToken);
        var codes = rolePermissionCodes.ToHashSet(StringComparer.Ordinal);
        foreach (var item in overrides)
        {
            if (item.Effect == PermissionEffect.Deny) codes.Remove(item.Permission.Code);
            else codes.Add(item.Permission.Code);
        }
        return Ok(new { user, permissions = codes.OrderBy(x => x).ToArray() });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (!TryCurrentUserId(out var userId)) return Unauthorized();
        await authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, ClientIp, cancellationToken);
        ClearSessionCookies();
        return NoContent();
    }

    private IActionResult WriteAuthResult(AuthenticationResult result, int successStatus, int failureStatus)
    {
        if (!result.Success || result.Session is null || result.AccessToken is null || result.RefreshToken is null)
            return StatusCode(failureStatus, new ProblemDetails { Title = "No se pudo completar la solicitud", Detail = result.Error ?? "Revisá los datos y el estado de la cuenta.", Status = failureStatus });

        Response.Cookies.Append(AccessCookieName, result.AccessToken, new CookieOptions
        {
            HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true,
            Expires = result.Session.AccessTokenExpiresAt
        });
        Response.Cookies.Append(RefreshCookieName, result.RefreshToken, new CookieOptions
        {
            HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(_jwt.RefreshTokenDays)
        });
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
        return StatusCode(successStatus, result.Session);
    }

    private void ClearSessionCookies()
    {
        var options = new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true, Expires = DateTimeOffset.UnixEpoch };
        Response.Cookies.Delete(AccessCookieName, options);
        Response.Cookies.Delete(RefreshCookieName, options);
    }

    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
    private Guid? CurrentUserId => TryCurrentUserId(out var id) ? id : null;
    private bool TryCurrentUserId(out Guid userId) => Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);
}

public sealed class RegisterRequest
{
    [Required, EmailAddress, StringLength(320)] public string Email { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 2)] public string DisplayName { get; init; } = string.Empty;
    [Required, StringLength(128, MinimumLength = 12)] public string Password { get; init; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(320)] public string Email { get; init; } = string.Empty;
    [Required, StringLength(128)] public string Password { get; init; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    [Required, StringLength(128)] public string CurrentPassword { get; init; } = string.Empty;
    [Required, StringLength(128, MinimumLength = 12)] public string NewPassword { get; init; } = string.Empty;
}
