export const cosechaPermissions = {
  access: "cosecha.access",
  catalogRead: "cosecha.catalog.read",
  catalogManage: "cosecha.catalog.manage",
  producersRead: "cosecha.producers.read",
  producersManage: "cosecha.producers.manage",
  buyersRead: "cosecha.buyers.read",
  buyersManage: "cosecha.buyers.manage",
  ordersRead: "cosecha.orders.read",
  ordersManage: "cosecha.orders.manage",
  ordersReadOwn: "cosecha.orders.read.own",
  shipmentsRead: "cosecha.shipments.read",
  shipmentsManage: "cosecha.shipments.manage",
  settlementsRead: "cosecha.settlements.read",
  settlementsManage: "cosecha.settlements.manage",
  reportsRead: "cosecha.reports.read",
} as const;

const base = "/cosecha";

export const cosechaPaths = {
  home: base,
  shipments: `${base}/envios`,
  newShipment: `${base}/envios/nuevo`,
  shipment: (id: string) => `${base}/envios/${id}`,
  orders: `${base}/pedidos`,
  newOrder: `${base}/pedidos/nuevo`,
  order: (id: string) => `${base}/pedidos/${id}`,
  buyers: `${base}/compradores`,
  newBuyer: `${base}/compradores/nuevo`,
  buyer: (id: string) => `${base}/compradores/${id}`,
  producers: `${base}/productores`,
  newProducer: `${base}/productores/nuevo`,
  producer: (id: string) => `${base}/productores/${id}`,
  settlements: `${base}/liquidacion`,
  settlement: (producerId: string) => `${base}/liquidacion/${producerId}`,
  reports: `${base}/reportes`,
  settings: `${base}/configuracion`,
  myOrders: `${base}/mis-pedidos`,
  myOrder: (id: string) => `${base}/mis-pedidos/${id}`,
} as const;

/** Prefijo de la API del módulo. */
export const API = "/api/cosecha";
