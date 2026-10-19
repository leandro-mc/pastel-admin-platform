using Pastel.Platform.Modules;

namespace Pastel.Modules.Huella;

/// <summary>Permisos de Huella, según su ficha (<c>docs/modules/HUELLA.md</c>, «Roles y permisos»). Formato <c>huella.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
internal static class HuellaPermissions
{
    public const string Code = "huella";
    public const string Access = "huella.access";
    public const string ProfileManage = "huella.profile.manage";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Huella", 250,
        [
            new(Access, "Entrar al panel de Huella", "Entrar al panel de edición de Huella. Las rutas públicas no requieren permiso."),
            new(ProfileManage, "Gestionar su perfil", "Editar, previsualizar y publicar su propio perfil."),
        ]),
    ];
}
