import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import { balanceKeys, toQuery, type ExpenseFilters } from "./keys";
import {
  balancesSchema,
  currencySchema,
  eventPageSchema,
  expensePageSchema,
  groupListSchema,
  groupSchema,
  invitationSchema,
  participantSchema,
  settlementSchema,
  sheetSchema,
} from "./schemas";

const base = "/api/balance";
type Gate = { enabled?: boolean };

export function useCurrencies() {
  return useQuery({
    queryKey: balanceKeys.currencies,
    queryFn: ({ signal }) => api.get(`${base}/currencies`, z.array(currencySchema), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: balanceKeys.groupList(),
    queryFn: ({ signal }) => api.get(`${base}/groups?pageSize=100`, groupListSchema, { signal }),
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: balanceKeys.detail(id),
    queryFn: ({ signal }) => api.get(`${base}/groups/${id}`, groupSchema, { signal }),
  });
}

export function useParticipants(id: string) {
  return useQuery({
    queryKey: balanceKeys.participants(id),
    queryFn: ({ signal }) =>
      api.get(`${base}/groups/${id}/participants`, z.array(participantSchema), { signal }),
  });
}

export function useInvitation(id: string, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: balanceKeys.invitation(id),
    queryFn: ({ signal }) => api.get(`${base}/groups/${id}/invitation`, invitationSchema, { signal }),
    enabled,
  });
}

export function useBalances(id: string) {
  return useQuery({
    queryKey: balanceKeys.balances(id),
    queryFn: ({ signal }) => api.get(`${base}/groups/${id}/balances`, balancesSchema, { signal }),
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: balanceKeys.settlement(id),
    queryFn: ({ signal }) => api.get(`${base}/groups/${id}/settlement`, settlementSchema, { signal }),
  });
}

export function useExpenses(id: string, filters: ExpenseFilters) {
  return useQuery({
    queryKey: balanceKeys.expenses(id, filters),
    queryFn: ({ signal }) =>
      api.get(
        `${base}/groups/${id}/expenses${toQuery({
          page: filters.page,
          pageSize: 25,
          q: filters.q,
          payerId: filters.payerId,
          from: filters.from,
          to: filters.to,
          order: filters.order,
        })}`,
        expensePageSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSheet(id: string) {
  return useQuery({
    queryKey: balanceKeys.sheet(id),
    queryFn: ({ signal }) => api.get(`${base}/groups/${id}/expenses/sheet`, sheetSchema, { signal }),
    // El borrador es del usuario: no se pisa con una recarga automática.
    refetchOnWindowFocus: false,
  });
}

export function useHistory(id: string, page: number, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: balanceKeys.history(id, page),
    queryFn: ({ signal }) =>
      api.get(`${base}/groups/${id}/history${toQuery({ page, pageSize: 20 })}`, eventPageSchema, { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
}
