using Pastel.Platform.Modules;

namespace Pastel.Modules.Huella;

/// <summary>Permisos de Huella. Formato <c>huella.&lt;recurso&gt;.&lt;accion&gt;</c>; <c>huella.access</c> habilita el módulo en el hub y el router.</summary>
internal static class HuellaPermissions
{
    public const string Code = "huella";
    public const string Access = "huella.access";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Huella", 250,
        [
            new(Access, "Usar Huella", "Entrar a Huella."),
        ]),
    ];
}
