using Pastel.Platform.Modules;

namespace Pastel.Modules.Brisa;

/// <summary>Permisos de Brisa. Formato <c>brisa.&lt;recurso&gt;.&lt;accion&gt;</c>; <c>brisa.access</c> habilita el módulo en el hub y el router.</summary>
internal static class BrisaPermissions
{
    public const string Code = "brisa";
    public const string Access = "brisa.access";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Brisa", 210,
        [
            new(Access, "Usar Brisa", "Entrar a Brisa."),
        ]),
    ];
}
