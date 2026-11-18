import { z } from "zod";

/** Esquemas de las respuestas de `/api/cosecha`. Reflejan los DTO del backend (`MODULE.md`); los ids son texto. */
const id = z.string();
const day = z.string();
const moment = z.string();
const kg = z.number();
const crc = z.number();
const version = z.number();

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  });

// ---------------------------------------------------------------- catálogo
export const productSchema = z.object({
  id,
  name: z.string(),
  unit: z.string(),
  isActive: z.boolean(),
  version,
});
export type Product = z.infer<typeof productSchema>;

export const seasonSchema = z.object({
  id,
  name: z.string(),
  productId: id,
  productName: z.string(),
  startsOn: day,
  endsOn: day,
  status: z.string(),
  defaultProducerPricePerKg: crc,
  version,
});
export type Season = z.infer<typeof seasonSchema>;

export const paymentPolicySchema = z.object({
  id,
  effectiveFrom: day,
  advancePct: z.number().nullable(),
  referencePricePerKg: z.number().nullable(),
  gradeBWeightPct: z.number().nullable(),
  fundPct: z.number().nullable(),
  managementPct: z.number().nullable(),
  maxAdvancePct: z.number().nullable(),
  paymentWeekday: z.number().nullable(),
  ratified: z.boolean(),
  note: z.string().nullable(),
  createdAt: moment,
  createdByName: z.string().nullable(),
});
export type PaymentPolicy = z.infer<typeof paymentPolicySchema>;

export const claimsPolicySchema = z.object({
  id,
  effectiveFrom: day,
  claimWindowHours: z.number().nullable(),
  requiredPhotos: z.number().nullable(),
  tolerancePct: z.number().nullable(),
  majorClaimPct: z.number().nullable(),
  creditPctRot: z.number().nullable(),
  creditPctDiscoloration: z.number().nullable(),
  ackHours: z.number().nullable(),
  resolutionDays: z.number().nullable(),
  majorResolutionDays: z.number().nullable(),
  ratified: z.boolean(),
  note: z.string().nullable(),
  createdAt: moment,
  createdByName: z.string().nullable(),
});
export type ClaimsPolicy = z.infer<typeof claimsPolicySchema>;

export const policyOverviewSchema = z.object({
  payment: paymentPolicySchema.nullable(),
  paymentHistory: z.array(paymentPolicySchema),
  claims: claimsPolicySchema.nullable(),
  claimsHistory: z.array(claimsPolicySchema),
});

// ---------------------------------------------------------------- personas
export const phoneSchema = z.object({
  phone: z.string(),
  label: z.string().nullable(),
  isPrimary: z.boolean(),
});
export type Phone = z.infer<typeof phoneSchema>;

export const producerListItemSchema = z.object({
  id,
  name: z.string(),
  pickupPoint: z.string().nullable(),
  phones: z.array(phoneSchema),
  isArchived: z.boolean(),
  capacityKg: kg.nullable(),
  version,
});
export type ProducerListItem = z.infer<typeof producerListItemSchema>;

export const producerDetailSchema = z.object({
  id,
  name: z.string(),
  pickupPoint: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  mapUrl: z.string().nullable(),
  notes: z.string().nullable(),
  userId: id.nullable(),
  isArchived: z.boolean(),
  phones: z.array(phoneSchema),
  capacities: z.array(
    z.object({ seasonId: id, seasonName: z.string(), estimatedCapacityKg: kg }),
  ),
  version,
});
export type ProducerDetail = z.infer<typeof producerDetailSchema>;

export const capacitySchema = z.object({
  seasonId: id,
  seasonName: z.string(),
  estimatedCapacityKg: kg,
});

export const contactSchema = z.object({
  name: z.string(),
  phone: z.string().nullable(),
  roleTitle: z.string().nullable(),
  isPrimary: z.boolean(),
});
export type Contact = z.infer<typeof contactSchema>;

export const buyerListItemSchema = z.object({
  id,
  name: z.string(),
  zone: z.string().nullable(),
  primaryContact: contactSchema.nullable(),
  isArchived: z.boolean(),
  version,
});
export type BuyerListItem = z.infer<typeof buyerListItemSchema>;

export const buyerDetailSchema = z.object({
  id,
  name: z.string(),
  address: z.string().nullable(),
  zone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  mapUrl: z.string().nullable(),
  deliveryConditions: z.string().nullable(),
  notes: z.string().nullable(),
  userId: id.nullable(),
  isArchived: z.boolean(),
  contacts: z.array(contactSchema),
  version,
});
export type BuyerDetail = z.infer<typeof buyerDetailSchema>;

// ----------------------------------------------------------------- pedidos
export const changeSchema = z.object({
  entityType: z.string(),
  entityId: id,
  field: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  note: z.string().nullable(),
  changedByName: z.string().nullable(),
  changedAt: moment,
});
export type Change = z.infer<typeof changeSchema>;

export const orderLineSchema = z.object({
  id,
  productId: id,
  productName: z.string(),
  kilograms: kg,
  pricePerKg: crc,
});

export const orderShipmentSchema = z.object({
  shipmentId: id,
  shipmentDate: day,
  shipmentStatus: z.string(),
  plannedKg: kg,
  deliveredKg: kg.nullable(),
});

export const orderSummarySchema = z.object({
  id,
  buyerId: id,
  buyerName: z.string(),
  seasonId: id,
  seasonName: z.string(),
  requiredOn: day,
  status: z.string(),
  progress: z.string(),
  orderedKg: kg,
  deliveredKg: kg,
  pendingKg: kg,
  unplannedKg: kg,
  totalCrc: crc,
  version,
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderDetailSchema = z.object({
  summary: orderSummarySchema,
  notes: z.string().nullable(),
  cancelReason: z.string().nullable(),
  cancelledAt: moment.nullable(),
  lines: z.array(orderLineSchema),
  shipments: z.array(orderShipmentSchema),
  changes: z.array(changeSchema),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const myOrderSummarySchema = z.object({
  id,
  buyerName: z.string(),
  requiredOn: day,
  progress: z.string(),
  orderedKg: kg,
  deliveredKg: kg,
  totalCrc: crc,
});
export type MyOrderSummary = z.infer<typeof myOrderSummarySchema>;

export const myOrderDetailSchema = z.object({
  summary: myOrderSummarySchema,
  lines: z.array(orderLineSchema),
  shipments: z.array(orderShipmentSchema),
});

// ------------------------------------------------------------------ envíos
export const shipmentSummarySchema = z.object({
  id,
  seasonId: id,
  seasonName: z.string(),
  shipmentDate: day,
  status: z.string(),
  bufferPercent: z.number(),
  orderCount: z.number(),
  plannedKg: kg,
  targetKg: kg,
  requestedKg: kg,
  receivedKg: kg,
  deliveredKg: kg,
  pendingReceptions: z.number(),
  pendingDeliveries: z.number(),
  version,
});
export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;

export const shipmentOrderSchema = z.object({
  id,
  orderId: id,
  buyerId: id,
  buyerName: z.string(),
  requiredOn: day,
  orderStatus: z.string(),
  orderedKg: kg,
  plannedKg: kg,
  deliveredKg: kg.nullable(),
  deliveryNote: z.string().nullable(),
  pricePerKg: crc,
  version,
});
export type ShipmentOrder = z.infer<typeof shipmentOrderSchema>;

export const deliverySchema = z.object({
  id,
  producerId: id,
  producerName: z.string(),
  primaryPhone: z.string().nullable(),
  requestedKg: kg,
  availableKg: kg.nullable(),
  receivedKg: kg.nullable(),
  rejectedKg: kg,
  acceptedKg: kg.nullable(),
  pricePerKg: crc,
  amountCrc: crc.nullable(),
  paidCrc: crc,
  status: z.string(),
  quality: z.string().nullable(),
  notes: z.string().nullable(),
  expectedPaymentDate: day.nullable(),
  version,
});
export type Delivery = z.infer<typeof deliverySchema>;

export const shipmentTotalsSchema = z.object({
  plannedKg: kg,
  bufferKg: kg,
  targetKg: kg,
  requestedKg: kg,
  differenceKg: kg,
  receivedKg: kg,
  acceptedKg: kg,
  deliveredKg: kg,
  producerCostCrc: crc,
  buyerRevenueCrc: crc,
  marginCrc: crc,
  pendingReceptions: z.number(),
  pendingDeliveries: z.number(),
});

export const shipmentDetailSchema = z.object({
  summary: shipmentSummarySchema,
  notes: z.string().nullable(),
  closedAt: moment.nullable(),
  closeReason: z.string().nullable(),
  orders: z.array(shipmentOrderSchema),
  deliveries: z.array(deliverySchema),
  totals: shipmentTotalsSchema,
  changes: z.array(changeSchema),
});
export type ShipmentDetail = z.infer<typeof shipmentDetailSchema>;

export const candidatesSchema = z.object({
  shipmentId: id,
  targetKg: kg,
  stepKg: kg,
  producers: z.array(
    z.object({
      producerId: id,
      name: z.string(),
      primaryPhone: z.string().nullable(),
      capacityKg: kg,
      requestedKg: kg.nullable(),
      availableKg: kg.nullable(),
      deliveryStatus: z.string().nullable(),
    }),
  ),
});
export type Candidates = z.infer<typeof candidatesSchema>;

export const suggestionSchema = z.object({
  targetKg: kg,
  allocatedKg: kg,
  shortfallKg: kg,
  rows: z.array(
    z.object({
      producerId: id,
      name: z.string(),
      capacityKg: kg,
      suggestedKg: kg,
    }),
  ),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export const pendingOrderSchema = z.object({
  orderId: id,
  buyerId: id,
  buyerName: z.string(),
  requiredOn: day,
  orderedKg: kg,
  unplannedKg: kg,
  totalCrc: crc,
});
export type PendingOrder = z.infer<typeof pendingOrderSchema>;

// ------------------------------------------------------------- liquidación
export const producerBalanceSchema = z.object({
  producerId: id,
  producerName: z.string(),
  primaryPhone: z.string().nullable(),
  totalCrc: crc,
  paidCrc: crc,
  balanceCrc: crc,
  pendingDeliveries: z.number(),
  nextExpectedPaymentDate: day.nullable(),
});
export type ProducerBalance = z.infer<typeof producerBalanceSchema>;

export const settlementDeliverySchema = z.object({
  deliveryId: id,
  shipmentId: id,
  shipmentDate: day,
  acceptedKg: kg,
  pricePerKg: crc,
  amountCrc: crc,
  paidCrc: crc,
  outstandingCrc: crc,
  status: z.string(),
  expectedPaymentDate: day.nullable(),
});
export type SettlementDelivery = z.infer<typeof settlementDeliverySchema>;

export const paymentSchema = z.object({
  id,
  producerId: id,
  paidOn: day,
  amountCrc: crc,
  method: z.string(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  isVoided: z.boolean(),
  voidedAt: moment.nullable(),
  voidReason: z.string().nullable(),
  allocations: z.array(
    z.object({ deliveryId: id, shipmentDate: day, amountCrc: crc }),
  ),
  version,
});
export type Payment = z.infer<typeof paymentSchema>;

export const statementSchema = z.object({
  balance: producerBalanceSchema,
  deliveries: z.array(settlementDeliverySchema),
  payments: z.array(paymentSchema),
});

// -------------------------------------------------------- reportes y «Hoy»
export const reportSchema = z.object({
  kind: z.string(),
  title: z.string(),
  columns: z.array(
    z.object({ key: z.string(), label: z.string(), kind: z.string() }),
  ),
  rows: z.array(
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ),
});
export type Report = z.infer<typeof reportSchema>;

export const todaySchema = z.object({
  today: day,
  shipments: z.array(
    z.object({
      id,
      shipmentDate: day,
      status: z.string(),
      seasonName: z.string(),
      targetKg: kg,
      requestedKg: kg,
      differenceKg: kg,
      unconfirmedProducers: z.number(),
      pendingReceptions: z.number(),
      pendingDeliveries: z.number(),
    }),
  ),
  paymentsDueSoon: z.array(
    z.object({
      producerId: id,
      producerName: z.string(),
      outstandingCrc: crc,
      dueOn: day.nullable(),
    }),
  ),
});
export type Today = z.infer<typeof todaySchema>;
