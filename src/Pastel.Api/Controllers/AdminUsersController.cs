using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pastel.Application.Abstractions;
using Pastel.Application.Contracts;
using Pastel.Domain.Entities;

namespace Pastel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/users")]
public sealed class AdminUsersController(IAdministrationService administration) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "permission:settings.users.read")]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken) => Ok(await administration.GetUsersAsync(cancellationToken));

    [HttpPost]
    [Authorize(Policy = "permission:settings.users.create")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await administration.CreateUserAsync(new CreateUserCommand(request.Email, request.DisplayName, request.TemporaryPassword, request.RoleIds), ActorId, ClientIp, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, user);
    }

    [HttpPut("{userId:guid}/roles")]
    [Authorize(Policy = "permission:settings.users.update")]
    public async Task<IActionResult> SetRoles(Guid userId, [FromBody] SetRolesRequest request, CancellationToken cancellationToken)
    {
        var roles = await administration.SetUserRolesAsync(userId, request.RoleIds, ActorId, ClientIp, cancellationToken);
        return Ok(new { roles });
    }

    [HttpGet("{userId:guid}/permissions")]
    [Authorize(Policy = "permission:settings.users.read")]
    public async Task<IActionResult> GetPermissionOverrides(Guid userId, CancellationToken cancellationToken) => Ok(await administration.GetUserPermissionOverridesAsync(userId, cancellationToken));

    [HttpPut("{userId:guid}/permissions")]
    [Authorize(Policy = "permission:settings.users.update")]
    public async Task<IActionResult> SetPermissionOverrides(Guid userId, [FromBody] SetUserPermissionsRequest request, CancellationToken cancellationToken)
    {
        await administration.SetUserPermissionOverridesAsync(userId, request.Changes.Select(x => new UserPermissionChange(x.PermissionId, x.Effect)).ToArray(), ActorId, ClientIp, cancellationToken);
        return NoContent();
    }

    [HttpPost("{userId:guid}/block")]
    [Authorize(Policy = "permission:settings.users.lock")]
    public async Task<IActionResult> Block(Guid userId, CancellationToken cancellationToken)
    {
        await administration.BlockUserAsync(userId, ActorId, ClientIp, cancellationToken);
        return NoContent();
    }

    [HttpPost("{userId:guid}/unblock")]
    [Authorize(Policy = "permission:settings.users.lock")]
    public async Task<IActionResult> Unblock(Guid userId, CancellationToken cancellationToken)
    {
        await administration.UnblockUserAsync(userId, ActorId, ClientIp, cancellationToken);
        return NoContent();
    }

    [HttpPost("{userId:guid}/reset-password")]
    [Authorize(Policy = "permission:settings.users.reset_password")]
    public async Task<IActionResult> ResetPassword(Guid userId, CancellationToken cancellationToken)
    {
        var temporaryPassword = await administration.ResetPasswordAsync(userId, ActorId, ClientIp, cancellationToken);
        Response.Headers.CacheControl = "no-store";
        return Ok(new { temporaryPassword, mustChangePassword = true });
    }

    private Guid ActorId => Guid.TryParse(User.FindFirst("sub")?.Value, out var id) ? id : throw new UnauthorizedAccessException();
    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
}

public sealed class CreateUserRequest
{
    [Required, EmailAddress, StringLength(320)] public string Email { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 2)] public string DisplayName { get; init; } = string.Empty;
    [Required, StringLength(128, MinimumLength = 12)] public string TemporaryPassword { get; init; } = string.Empty;
    public Guid[] RoleIds { get; init; } = [];
}

public sealed class SetRolesRequest { public Guid[] RoleIds { get; init; } = []; }
public sealed class PermissionChangeRequest { public Guid PermissionId { get; init; } public PermissionEffect Effect { get; init; } }
public sealed class SetUserPermissionsRequest { public PermissionChangeRequest[] Changes { get; init; } = []; }
