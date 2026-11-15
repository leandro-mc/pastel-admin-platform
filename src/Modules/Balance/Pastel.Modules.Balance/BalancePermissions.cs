using Pastel.Platform.Modules;

namespace Pastel.Modules.Balance;

/// <summary>Permisos de Balance, según su ficha (<c>docs/modules/BALANCE.md</c>, «Roles y permisos»). Formato <c>balance.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
internal static class BalancePermissions
{
    public const string Code = "balance";
    public const string Access = "balance.access";
    public const string GroupsManage = "balance.groups.manage";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Balance", 220,
        [
            new(Access, "Usar Balance", "Entrar a Balance."),
            new(GroupsManage, "Gestionar grupos", "Administrar los grupos de gasto de los que forma parte."),
        ]),
    ];
}
