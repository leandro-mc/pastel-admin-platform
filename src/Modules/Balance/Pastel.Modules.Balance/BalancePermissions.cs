using Pastel.Platform.Modules;

namespace Pastel.Modules.Balance;

/// <summary>Permisos de Balance. Formato <c>balance.&lt;recurso&gt;.&lt;accion&gt;</c>; <c>balance.access</c> habilita el módulo en el hub y el router.</summary>
internal static class BalancePermissions
{
    public const string Code = "balance";
    public const string Access = "balance.access";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Balance", 220,
        [
            new(Access, "Usar Balance", "Entrar a Balance."),
        ]),
    ];
}
