using Pastel.Platform.Modules;

namespace Pastel.Modules.Agora;

/// <summary>Permisos de Ágora. Formato <c>agora.&lt;recurso&gt;.&lt;accion&gt;</c>; <c>agora.access</c> habilita el módulo en el hub y el router.</summary>
internal static class AgoraPermissions
{
    public const string Code = "agora";
    public const string Access = "agora.access";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Ágora", 230,
        [
            new(Access, "Usar Ágora", "Entrar a Ágora."),
        ]),
    ];
}
