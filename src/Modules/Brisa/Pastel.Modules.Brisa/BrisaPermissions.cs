using Pastel.Platform.Modules;

namespace Pastel.Modules.Brisa;

/// <summary>Permisos de Brisa, según su ficha (<c>docs/modules/BRISA.md</c>, «Roles y permisos»). Formato <c>brisa.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
internal static class BrisaPermissions
{
    public const string Code = "brisa";
    public const string Access = "brisa.access";
    public const string ItemsManage = "brisa.items.manage";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Brisa", 210,
        [
            new(Access, "Usar Brisa", "Entrar a Brisa."),
            new(ItemsManage, "Gestionar pendientes", "Crear y editar sus propios pendientes."),
        ]),
    ];
}
