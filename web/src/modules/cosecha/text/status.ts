/** Etiquetas en español de los estados que devuelve el servidor (siempre texto + color, nunca solo color). */
export const status = {
  order: {
    Draft: "Borrador",
    Confirmed: "Confirmado",
    Cancelled: "Cancelado",
  },
  progress: {
    Draft: "Borrador",
    Confirmed: "Confirmado",
    PartiallyDelivered: "Parcial",
    Delivered: "Entregado",
    Cancelled: "Cancelado",
  },
  shipment: {
    Planned: "Planificado",
    Collecting: "En recolección",
    Collected: "Recolectado",
    Delivered: "Entregado",
    Closed: "Cerrado",
  },
  delivery: {
    Requested: "Solicitada",
    Confirmed: "Confirmada",
    Received: "Recibida",
    NoDelivery: "Sin entrega",
  },
  quality: {
    Good: "Buena",
    WithObservations: "Con observaciones",
    Bad: "Mala",
  },
  settlement: {
    Pending: "Pendiente",
    Partial: "Parcial",
    Paid: "Pagada",
  },
  method: {
    Cash: "Efectivo",
    Sinpe: "SINPE",
    Transfer: "Transferencia",
  },
  season: {
    Active: "Activa",
    Closed: "Cerrada",
  },
} as const;
