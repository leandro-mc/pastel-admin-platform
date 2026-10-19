using Pastel.Platform.Modules;

namespace Pastel.Modules.Cosecha;

/// <summary>Permisos de Cosecha, según su ficha (<c>docs/modules/COSECHA.md</c>, «Roles y permisos»). Formato <c>cosecha.&lt;recurso&gt;.&lt;accion&gt;</c>.</summary>
internal static class CosechaPermissions
{
    public const string Code = "cosecha";
    public const string Access = "cosecha.access";
    public const string CatalogRead = "cosecha.catalog.read";
    public const string CatalogManage = "cosecha.catalog.manage";
    public const string ProducersRead = "cosecha.producers.read";
    public const string ProducersManage = "cosecha.producers.manage";
    public const string BuyersRead = "cosecha.buyers.read";
    public const string BuyersManage = "cosecha.buyers.manage";
    public const string OrdersRead = "cosecha.orders.read";
    public const string OrdersManage = "cosecha.orders.manage";
    public const string OrdersReadOwn = "cosecha.orders.read.own";
    public const string ShipmentsRead = "cosecha.shipments.read";
    public const string ShipmentsManage = "cosecha.shipments.manage";
    public const string SettlementsRead = "cosecha.settlements.read";
    public const string SettlementsManage = "cosecha.settlements.manage";
    public const string ReportsRead = "cosecha.reports.read";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new(Code, "Cosecha", 240,
        [
            new(Access, "Usar Cosecha", "Entrar a Cosecha."),
            new(CatalogRead, "Ver catálogo", "Consultar productos y presentaciones."),
            new(CatalogManage, "Gestionar catálogo", "Crear y editar productos y presentaciones."),
            new(ProducersRead, "Ver productores", "Consultar productores."),
            new(ProducersManage, "Gestionar productores", "Crear y editar productores."),
            new(BuyersRead, "Ver compradores", "Consultar compradores."),
            new(BuyersManage, "Gestionar compradores", "Crear y editar compradores."),
            new(OrdersRead, "Ver pedidos", "Consultar todos los pedidos."),
            new(OrdersManage, "Gestionar pedidos", "Crear y editar pedidos."),
            new(OrdersReadOwn, "Ver sus pedidos", "Consultar solo los pedidos de los compradores vinculados a su cuenta, y el estado de sus envíos."),
            new(ShipmentsRead, "Ver envíos", "Consultar envíos, recepciones y entregas."),
            new(ShipmentsManage, "Gestionar envíos", "Planear envíos y registrar recepciones y entregas."),
            new(SettlementsRead, "Ver pagos", "Consultar liquidaciones y pagos."),
            new(SettlementsManage, "Gestionar pagos", "Registrar liquidaciones y pagos."),
            new(ReportsRead, "Ver reportes", "Consultar reportes."),
        ]),
    ];
}
