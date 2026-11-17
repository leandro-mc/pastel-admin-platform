/** Cuerpos de las peticiones de `/api/cosecha` (lo que el backend espera; ver `MODULE.md`). */
export type ProductBody = { name: string; isActive?: boolean; version?: number };

export type SeasonBody = {
  name: string;
  productId?: string;
  startsOn: string;
  endsOn: string;
  defaultProducerPricePerKg: number;
  note?: string;
  version?: number;
};

export type PolicyBase = {
  effectiveFrom: string;
  ratified: boolean;
  note?: string;
};

export type PaymentPolicyBody = PolicyBase & {
  advancePct?: number | null;
  referencePricePerKg?: number | null;
  gradeBWeightPct?: number | null;
  fundPct?: number | null;
  managementPct?: number | null;
  maxAdvancePct?: number | null;
  paymentWeekday?: number | null;
};

export type ClaimsPolicyBody = PolicyBase & {
  claimWindowHours?: number | null;
  requiredPhotos?: number | null;
  tolerancePct?: number | null;
  majorClaimPct?: number | null;
  creditPctRot?: number | null;
  creditPctDiscoloration?: number | null;
  ackHours?: number | null;
  resolutionDays?: number | null;
  majorResolutionDays?: number | null;
};

export type PhoneBody = { phone: string; label?: string; isPrimary: boolean };

export type ProducerBody = {
  name: string;
  pickupPoint?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  notes?: string;
  userId?: string | null;
  phones: PhoneBody[];
  version?: number;
};

export type ContactBody = {
  name: string;
  phone?: string;
  roleTitle?: string;
  isPrimary: boolean;
};

export type BuyerBody = {
  name: string;
  address?: string;
  zone?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  deliveryConditions?: string;
  notes?: string;
  userId?: string | null;
  contacts: ContactBody[];
  version?: number;
};

export type OrderLineBody = {
  productId: string;
  kilograms: number;
  pricePerKg: number;
};

export type OrderBody = {
  buyerId?: string;
  seasonId?: string;
  requiredOn: string;
  notes?: string;
  lines: OrderLineBody[];
  confirm?: boolean;
  note?: string;
  version?: number;
};

export type ShipmentOrderBody = { orderId: string; plannedKg?: number };

export type ShipmentBody = {
  seasonId: string;
  shipmentDate: string;
  bufferPercent: number;
  notes?: string;
  orders: ShipmentOrderBody[];
};

export type ShipmentUpdateBody = {
  shipmentDate: string;
  bufferPercent: number;
  notes?: string;
  note?: string;
  version: number;
};

export type ParticipantBody = {
  producerId: string;
  included: boolean;
  availableKg?: number | null;
};

export type DeliveryAssignmentBody = {
  producerId: string;
  requestedKg: number;
  availableKg?: number | null;
};

export type ReceptionBody = {
  receivedKg: number;
  rejectedKg: number;
  quality: string;
  notes?: string;
  pricePerKg?: number;
  note?: string;
  version: number;
};

export type PaymentBody = {
  producerId: string;
  paidOn: string;
  amountCrc: number;
  method: string;
  reference?: string;
  note?: string;
  deliveryIds?: string[];
};
