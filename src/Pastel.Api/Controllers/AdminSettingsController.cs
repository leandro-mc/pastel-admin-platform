using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pastel.Application.Abstractions;
using Pastel.Application.Contracts;

namespace Pastel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminSettingsController(IAdministrationService administration) : ControllerBase
{
    [HttpGet("roles")]
    [Authorize(Policy = "permission:settings.roles.read")]
    public async Task<IActionResult> GetRoles(CancellationToken ct) => Ok(await administration.GetRolesAsync(ct));

    [HttpPost("roles")]
    [Authorize(Policy = "permission:settings.roles.create")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken ct)
    {
        var role = await administration.CreateRoleAsync(new CreateRoleCommand(request.Name, request.Description, request.PermissionIds), ActorId, ClientIp, ct);
        return StatusCode(StatusCodes.Status201Created, role);
    }

    [HttpPut("roles/{roleId:guid}/permissions")]
    [Authorize(Policy = "permission:settings.roles.update")]
    public async Task<IActionResult> SetRolePermissions(Guid roleId, [FromBody] SetRolePermissionsRequest request, CancellationToken ct)
    {
        await administration.SetRolePermissionsAsync(roleId, request.PermissionIds, ActorId, ClientIp, ct);
        return NoContent();
    }

    [HttpGet("permissions")]
    [Authorize(Policy = "permission:settings.permissions.read")]
    public async Task<IActionResult> GetPermissions(CancellationToken ct) => Ok(await administration.GetPermissionsAsync(ct));

    [HttpGet("modules")]
    [Authorize(Policy = "permission:settings.modules.read")]
    public async Task<IActionResult> GetModules(CancellationToken ct) => Ok(await administration.GetModulesAsync(ct));

    [HttpPost("modules")]
    [Authorize(Policy = "permission:settings.modules.manage")]
    public async Task<IActionResult> CreateModule([FromBody] CreateModuleRequest request, CancellationToken ct)
    {
        var module = await administration.CreateModuleAsync(new CreateModuleCommand(request.Code, request.Name, request.Description, request.Actions), ActorId, ClientIp, ct);
        return StatusCode(StatusCodes.Status201Created, module);
    }

    [HttpPatch("modules/{moduleId:guid}")]
    [Authorize(Policy = "permission:settings.modules.manage")]
    public async Task<IActionResult> SetModuleEnabled(Guid moduleId, [FromBody] SetModuleEnabledRequest request, CancellationToken ct)
    {
        await administration.SetModuleEnabledAsync(moduleId, request.IsEnabled, ActorId, ClientIp, ct);
        return NoContent();
    }

    [HttpGet("audit")]
    [Authorize(Policy = "permission:settings.audit.read")]
    public async Task<IActionResult> GetAudit([FromQuery] int take = 100, CancellationToken ct = default) => Ok(await administration.GetAuditLogAsync(take, ct));

    private Guid ActorId => Guid.TryParse(User.FindFirst("sub")?.Value, out var id) ? id : throw new UnauthorizedAccessException();
    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
}

public sealed class CreateRoleRequest
{
    [Required, StringLength(64, MinimumLength = 2)] public string Name { get; init; } = string.Empty;
    [StringLength(500)] public string? Description { get; init; }
    public Guid[] PermissionIds { get; init; } = [];
}
public sealed class SetRolePermissionsRequest { public Guid[] PermissionIds { get; init; } = []; }
public sealed class CreateModuleRequest
{
    [Required, StringLength(64, MinimumLength = 2)] public string Code { get; init; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 2)] public string Name { get; init; } = string.Empty;
    [StringLength(500)] public string? Description { get; init; }
    [Required, MinLength(1), MaxLength(20)] public string[] Actions { get; init; } = [];
}
public sealed class SetModuleEnabledRequest { public bool IsEnabled { get; init; } }
