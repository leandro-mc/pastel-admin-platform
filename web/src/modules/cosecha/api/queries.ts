import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import { API } from "../paths";
import { cosechaKeys, toQuery } from "./keys";
import {
  buyerDetailSchema,
  buyerListItemSchema,
  candidatesSchema,
  myOrderDetailSchema,
  myOrderSummarySchema,
  orderDetailSchema,
  orderSummarySchema,
  pageSchema,
  pendingOrderSchema,
  policyOverviewSchema,
  producerBalanceSchema,
  producerDetailSchema,
  producerListItemSchema,
  productSchema,
  reportSchema,
  seasonSchema,
  shipmentDetailSchema,
  shipmentSummarySchema,
  statementSchema,
  todaySchema,
} from "./schemas";

type Gate = { enabled?: boolean };
type Params = Record<string, string | number | boolean | null | undefined>;

const keyOf = (params: Params) => toQuery(params);

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: cosechaKeys.products(includeInactive),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/products${toQuery({ includeInactive })}`,
        z.array(productSchema),
        { signal },
      ),
  });
}

export function useSeasons({ enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: cosechaKeys.seasons,
    queryFn: ({ signal }) =>
      api.get(`${API}/seasons`, z.array(seasonSchema), { signal }),
    enabled,
  });
}

export function usePolicy() {
  return useQuery({
    queryKey: cosechaKeys.policy,
    queryFn: ({ signal }) =>
      api.get(`${API}/policy`, policyOverviewSchema, { signal }),
  });
}

export function useProducers(params: Params) {
  return useQuery({
    queryKey: cosechaKeys.producers(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/producers${toQuery(params)}`,
        pageSchema(producerListItemSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useProducer(id: string | undefined) {
  return useQuery({
    queryKey: cosechaKeys.producer(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/producers/${id}`, producerDetailSchema, { signal }),
    enabled: Boolean(id),
  });
}

export function useBuyers(params: Params, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: cosechaKeys.buyers(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/buyers${toQuery(params)}`,
        pageSchema(buyerListItemSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBuyer(id: string | undefined) {
  return useQuery({
    queryKey: cosechaKeys.buyer(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/buyers/${id}`, buyerDetailSchema, { signal }),
    enabled: Boolean(id),
  });
}

export function useOrders(params: Params) {
  return useQuery({
    queryKey: cosechaKeys.orders(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/orders${toQuery(params)}`,
        pageSchema(orderSummarySchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: cosechaKeys.order(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/orders/${id}`, orderDetailSchema, { signal }),
    enabled: Boolean(id),
  });
}

export function useMyOrders(params: Params) {
  return useQuery({
    queryKey: cosechaKeys.myOrders(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/my/orders${toQuery(params)}`,
        pageSchema(myOrderSummarySchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrder(id: string | undefined) {
  return useQuery({
    queryKey: cosechaKeys.myOrder(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/my/orders/${id}`, myOrderDetailSchema, { signal }),
    enabled: Boolean(id),
  });
}

export function useShipments(params: Params) {
  return useQuery({
    queryKey: cosechaKeys.shipments(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/shipments${toQuery(params)}`,
        pageSchema(shipmentSummarySchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: cosechaKeys.shipment(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/shipments/${id}`, shipmentDetailSchema, { signal }),
    enabled: Boolean(id),
  });
}

export function useCandidates(id: string | undefined, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: cosechaKeys.candidates(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(`${API}/shipments/${id}/allocation/candidates`, candidatesSchema, {
        signal,
      }),
    enabled: Boolean(id) && enabled,
  });
}

export function usePendingOrders(params: Params, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: cosechaKeys.pendingOrders(keyOf(params)),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/shipments/pending-orders${toQuery(params)}`,
        z.array(pendingOrderSchema),
        { signal },
      ),
    enabled: enabled && Boolean(params.seasonId),
  });
}

export function useBalances(seasonId: string) {
  return useQuery({
    queryKey: cosechaKeys.balances(seasonId),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/settlements/producers${toQuery({ seasonId })}`,
        z.array(producerBalanceSchema),
        { signal },
      ),
  });
}

export function useStatement(producerId: string | undefined, seasonId: string) {
  return useQuery({
    queryKey: cosechaKeys.statement(producerId ?? "", seasonId),
    queryFn: ({ signal }) =>
      api.get(
        `${API}/settlements/producers/${producerId}${toQuery({ seasonId })}`,
        statementSchema,
        { signal },
      ),
    enabled: Boolean(producerId),
  });
}

export function useReport(kind: string, params: Params) {
  return useQuery({
    queryKey: cosechaKeys.report(`${kind}${keyOf(params)}`),
    queryFn: ({ signal }) =>
      api.get(`${API}/reports/${kind}${toQuery(params)}`, reportSchema, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useToday() {
  return useQuery({
    queryKey: cosechaKeys.today,
    queryFn: ({ signal }) => api.get(`${API}/today`, todaySchema, { signal }),
  });
}
