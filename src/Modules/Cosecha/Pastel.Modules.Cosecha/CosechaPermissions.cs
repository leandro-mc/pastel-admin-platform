using Pastel.Platform.Modules;

namespace Pastel.Modules.Cosecha;

/// <summary>Permisos de Cosecha. Formato <c>cosecha.&lt;recurso&gt;.&lt;accion&gt;</c>; <c>cosecha.access</c> habilita el módulo en el hub y el router.</summary>
internal static class CosechaPermissions
{
    public const string Code = "cosecha";
    public const string Access = "cosecha.access";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Cosecha", 240,
        [
            new(Access, "Usar Cosecha", "Entrar a Cosecha."),
        ]),
    ];
}
