import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/api";
import { API } from "../paths";
import { cosechaKeys } from "./keys";
import type {
  BuyerBody,
  ClaimsPolicyBody,
  DeliveryAssignmentBody,
  OrderBody,
  ParticipantBody,
  PaymentBody,
  PaymentPolicyBody,
  ProducerBody,
  ProductBody,
  ReceptionBody,
  SeasonBody,
  ShipmentBody,
  ShipmentOrderBody,
  ShipmentUpdateBody,
} from "./requests";
import {
  buyerDetailSchema,
  capacitySchema,
  claimsPolicySchema,
  orderDetailSchema,
  paymentPolicySchema,
  paymentSchema,
  producerDetailSchema,
  productSchema,
  seasonSchema,
  shipmentDetailSchema,
  suggestionSchema,
} from "./schemas";

/**
 * Toda escritura invalida las consultas del módulo: tras guardar, las pantallas vuelven a leer del servidor y
 * muestran cifras recalculadas (totales, saldos, estados) sin que el cliente tenga que replicarlas.
 */
function useWrite<TVars, TData>(run: (vars: TVars) => Promise<TData>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: cosechaKeys.all }),
  });
}

type WithId<T> = { id: string; body: T };

// ---------------------------------------------------------------- catálogo
export const useCreateProduct = () =>
  useWrite((body: ProductBody) =>
    api.post(`${API}/products`, productSchema, body),
  );

export const useUpdateProduct = () =>
  useWrite(({ id, body }: WithId<ProductBody>) =>
    api.put(`${API}/products/${id}`, productSchema, body),
  );

export const useCreateSeason = () =>
  useWrite((body: SeasonBody) => api.post(`${API}/seasons`, seasonSchema, body));

export const useUpdateSeason = () =>
  useWrite(({ id, body }: WithId<SeasonBody>) =>
    api.put(`${API}/seasons/${id}`, seasonSchema, body),
  );

export const useSetSeasonStatus = () =>
  useWrite(
    ({ id, status, version }: { id: string; status: string; version: number }) =>
      api.post(`${API}/seasons/${id}/status`, seasonSchema, { status, version }),
  );

export const usePublishPaymentPolicy = () =>
  useWrite((body: PaymentPolicyBody) =>
    api.post(`${API}/policy/payment`, paymentPolicySchema, body),
  );

export const usePublishClaimsPolicy = () =>
  useWrite((body: ClaimsPolicyBody) =>
    api.post(`${API}/policy/claims`, claimsPolicySchema, body),
  );

// ---------------------------------------------------------------- personas
export const useCreateProducer = () =>
  useWrite((body: ProducerBody) =>
    api.post(`${API}/producers`, producerDetailSchema, body),
  );

export const useUpdateProducer = () =>
  useWrite(({ id, body }: WithId<ProducerBody>) =>
    api.put(`${API}/producers/${id}`, producerDetailSchema, body),
  );

export const useArchiveProducer = () =>
  useWrite(
    ({ id, archived, version }: { id: string; archived: boolean; version: number }) =>
      api.post(`${API}/producers/${id}/archive`, producerDetailSchema, {
        archived,
        version,
      }),
  );

export const useSetCapacity = () =>
  useWrite(
    (vars: {
      producerId: string;
      seasonId: string;
      estimatedCapacityKg: number;
      note?: string;
    }) =>
      api.put(
        `${API}/producers/${vars.producerId}/capacities/${vars.seasonId}`,
        capacitySchema,
        { estimatedCapacityKg: vars.estimatedCapacityKg, note: vars.note },
      ),
  );

export const useCreateBuyer = () =>
  useWrite((body: BuyerBody) =>
    api.post(`${API}/buyers`, buyerDetailSchema, body),
  );

export const useUpdateBuyer = () =>
  useWrite(({ id, body }: WithId<BuyerBody>) =>
    api.put(`${API}/buyers/${id}`, buyerDetailSchema, body),
  );

export const useArchiveBuyer = () =>
  useWrite(
    ({ id, archived, version }: { id: string; archived: boolean; version: number }) =>
      api.post(`${API}/buyers/${id}/archive`, buyerDetailSchema, {
        archived,
        version,
      }),
  );

// ----------------------------------------------------------------- pedidos
export const useCreateOrder = () =>
  useWrite((body: OrderBody) =>
    api.post(`${API}/orders`, orderDetailSchema, body),
  );

export const useUpdateOrder = () =>
  useWrite(({ id, body }: WithId<OrderBody>) =>
    api.put(`${API}/orders/${id}`, orderDetailSchema, body),
  );

export const useConfirmOrder = () =>
  useWrite(({ id, version }: { id: string; version: number }) =>
    api.post(`${API}/orders/${id}/confirm`, orderDetailSchema, { version }),
  );

export const useCancelOrder = () =>
  useWrite(
    ({ id, reason, version }: { id: string; reason: string; version: number }) =>
      api.post(`${API}/orders/${id}/cancel`, orderDetailSchema, {
        reason,
        version,
      }),
  );

// ------------------------------------------------------------------ envíos
export const useCreateShipment = () =>
  useWrite((body: ShipmentBody) =>
    api.post(`${API}/shipments`, shipmentDetailSchema, body),
  );

export const useUpdateShipment = () =>
  useWrite(({ id, body }: WithId<ShipmentUpdateBody>) =>
    api.put(`${API}/shipments/${id}`, shipmentDetailSchema, body),
  );

export const useDeleteShipment = () =>
  useWrite(({ id, version }: { id: string; version: number }) =>
    api.send("DELETE", `${API}/shipments/${id}?version=${version}`),
  );

export const useSetShipmentOrders = () =>
  useWrite(
    (vars: {
      id: string;
      orders: ShipmentOrderBody[];
      note?: string;
      version: number;
    }) =>
      api.put(`${API}/shipments/${vars.id}/orders`, shipmentDetailSchema, {
        orders: vars.orders,
        note: vars.note,
        version: vars.version,
      }),
  );

export const useSetShipmentStatus = () =>
  useWrite(
    (vars: { id: string; status: string; reason?: string; version: number }) =>
      api.post(`${API}/shipments/${vars.id}/status`, shipmentDetailSchema, {
        status: vars.status,
        reason: vars.reason,
        version: vars.version,
      }),
  );

export const useCloseShipment = () =>
  useWrite((vars: { id: string; reason?: string; version: number }) =>
    api.post(`${API}/shipments/${vars.id}/close`, shipmentDetailSchema, {
      reason: vars.reason,
      version: vars.version,
    }),
  );

/** Calcula el reparto sin guardar nada: no invalida consultas. */
export function useSuggestAllocation() {
  return useMutation({
    mutationFn: (vars: { id: string; participants: ParticipantBody[] }) =>
      api.post(`${API}/shipments/${vars.id}/allocation/suggest`, suggestionSchema, {
        participants: vars.participants,
      }),
  });
}

export const useApplyAllocation = () =>
  useWrite(
    (vars: {
      id: string;
      deliveries: DeliveryAssignmentBody[];
      note?: string;
      version: number;
    }) =>
      api.put(`${API}/shipments/${vars.id}/deliveries`, shipmentDetailSchema, {
        deliveries: vars.deliveries,
        note: vars.note,
        version: vars.version,
      }),
  );

export const useSetDeliveryStatus = () =>
  useWrite(
    (vars: {
      shipmentId: string;
      deliveryId: string;
      status: string;
      note?: string;
      version: number;
    }) =>
      api.post(
        `${API}/shipments/${vars.shipmentId}/deliveries/${vars.deliveryId}/status`,
        shipmentDetailSchema,
        { status: vars.status, note: vars.note, version: vars.version },
      ),
  );

export const useRecordReception = () =>
  useWrite(
    (vars: { shipmentId: string; deliveryId: string; body: ReceptionBody }) =>
      api.put(
        `${API}/shipments/${vars.shipmentId}/deliveries/${vars.deliveryId}/reception`,
        shipmentDetailSchema,
        vars.body,
      ),
  );

export const useRecordOrderDelivery = () =>
  useWrite(
    (vars: {
      shipmentId: string;
      shipmentOrderId: string;
      deliveredKg: number;
      deliveryNote?: string;
      note?: string;
      version: number;
    }) =>
      api.put(
        `${API}/shipments/${vars.shipmentId}/orders/${vars.shipmentOrderId}/delivery`,
        shipmentDetailSchema,
        {
          deliveredKg: vars.deliveredKg,
          deliveryNote: vars.deliveryNote,
          note: vars.note,
          version: vars.version,
        },
      ),
  );

// ------------------------------------------------------------- liquidación
export const useRegisterPayment = () =>
  useWrite((body: PaymentBody) =>
    api.post(`${API}/settlements/payments`, paymentSchema, body),
  );

export const useVoidPayment = () =>
  useWrite(
    ({ id, reason, version }: { id: string; reason: string; version: number }) =>
      api.post(`${API}/settlements/payments/${id}/void`, paymentSchema, {
        reason,
        version,
      }),
  );
