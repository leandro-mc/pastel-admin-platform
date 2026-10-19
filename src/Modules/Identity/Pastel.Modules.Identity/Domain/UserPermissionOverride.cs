using System.Text.Json.Serialization;

namespace Pastel.Modules.Identity.Domain;

/// <summary>Efecto de una excepción individual. Viaja como texto (<c>"Grant"</c>/<c>"Deny"</c>) en la API y en la auditoría; en la base sigue siendo entero.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
internal enum PermissionEffect { Deny = 0, Grant = 1 }

internal sealed class UserPermissionOverride
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public PermissionDefinition Permission { get; set; } = null!;
    public PermissionEffect Effect { get; set; }
    public Guid? AssignedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
