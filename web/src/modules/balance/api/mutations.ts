import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/api";
import { balanceKeys } from "./keys";
import {
  createdGroupSchema,
  expenseSchema,
  groupSchema,
  invitationSchema,
  joinedGroupSchema,
  participantSchema,
  sheetResultSchema,
} from "./schemas";

const base = "/api/balance";

export type NewGroup = {
  name: string;
  description: string;
  currencyCode: string;
  startDate: string;
  timeZone: string;
};
export type GroupChanges = { name: string; description: string; timeZone: string; version: number };
export type ExpenseInput = { payerId: string; description: string; amount: string; date: string; version: number };
export type SheetRowInput = {
  id: string | null;
  payerId: string;
  description: string;
  amount: string;
  date: string;
  version: number;
};

/** Cada mutación invalida lo que cambia; las pantallas no guardan copias propias de los datos del servidor. */
function useInvalidate() {
  const client = useQueryClient();
  return (groupId?: string) =>
    client.invalidateQueries({ queryKey: groupId ? balanceKeys.group(groupId) : balanceKeys.groups });
}

export function useCreateGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (group: NewGroup) => api.post(`${base}/groups`, createdGroupSchema, group),
    onSuccess: () => invalidate(),
  });
}

export function useJoinGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { token: string; code: string }) => api.post(`${base}/join`, joinedGroupSchema, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateGroup(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (changes: GroupChanges) => api.patch(`${base}/groups/${groupId}`, groupSchema, changes),
    onSuccess: () => invalidate(groupId),
  });
}

export function useChangeCurrency(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (currencyCode: string) =>
      api.put(`${base}/groups/${groupId}/currency`, groupSchema, { currencyCode }),
    onSuccess: () => invalidate(groupId),
  });
}

export function useSetClosed(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (close: boolean) =>
      api.post(`${base}/groups/${groupId}/${close ? "close" : "reopen"}`, groupSchema),
    onSuccess: () => invalidate(groupId),
  });
}

export function useDeleteGroup(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api.send("DELETE", `${base}/groups/${groupId}`),
    onSuccess: () => invalidate(),
  });
}

export function useSetRole(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { participantId: string; role: "admin" | "member" }) =>
      api.put(`${base}/groups/${groupId}/participants/${input.participantId}/role`, participantSchema, {
        role: input.role,
      }),
    onSuccess: () => invalidate(groupId),
  });
}

export function useRemoveParticipant(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (participantId: string) =>
      api.send("DELETE", `${base}/groups/${groupId}/participants/${participantId}`),
    onSuccess: () => invalidate(groupId),
  });
}

export function useLeaveGroup(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api.send("POST", `${base}/groups/${groupId}/leave`),
    onSuccess: () => invalidate(),
  });
}

export function useRegenerateInvitation(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api.post(`${base}/groups/${groupId}/invitation/regenerate`, invitationSchema),
    onSuccess: () => invalidate(groupId),
  });
}

export function useSaveExpense(groupId: string, expenseId: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      expenseId
        ? api.put(`${base}/groups/${groupId}/expenses/${expenseId}`, expenseSchema, input)
        : api.post(`${base}/groups/${groupId}/expenses`, expenseSchema, input),
    onSuccess: () => invalidate(groupId),
  });
}

export function useDeleteExpense(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: string; version: number }) =>
      api.send("DELETE", `${base}/groups/${groupId}/expenses/${input.id}?version=${input.version}`),
    onSuccess: () => invalidate(groupId),
  });
}

export function useSaveSheet(groupId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { rows: SheetRowInput[]; deletedIds: string[] }) =>
      api.put(`${base}/groups/${groupId}/expenses/sheet`, sheetResultSchema, input),
    onSuccess: () => invalidate(groupId),
  });
}
