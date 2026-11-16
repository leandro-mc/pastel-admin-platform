import { z } from "zod";

/** Contrato con `/api/balance`. Los montos llegan como cadena decimal con punto; nunca como número. */

export const currencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  featured: z.boolean(),
});
export type Currency = z.infer<typeof currencySchema>;

export const groupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  currencyCode: z.string(),
  isClosed: z.boolean(),
  participantCount: z.number(),
  myRole: z.string(),
  total: z.string(),
  myBalance: z.string(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

export const groupListSchema = z.object({
  items: z.array(groupSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currencyCode: z.string(),
  timeZone: z.string(),
  startDate: z.string(),
  isClosed: z.boolean(),
  closedAt: z.string().nullable(),
  closedDate: z.string().nullable(),
  today: z.string(),
  myParticipantId: z.string(),
  myRole: z.string(),
  participantCount: z.number(),
  expenseCount: z.number(),
  total: z.string(),
  myPaid: z.string(),
  myShare: z.string(),
  myBalance: z.string(),
  version: z.number(),
});
export type Group = z.infer<typeof groupSchema>;

export const createdGroupSchema = z.object({ id: z.string() });
export const joinedGroupSchema = z.object({ groupId: z.string() });

export const participantSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.string(),
  joinOrder: z.number(),
  joinedAt: z.string(),
  isMe: z.boolean(),
  expenseCount: z.number(),
});
export type Participant = z.infer<typeof participantSchema>;

export const invitationSchema = z.object({
  token: z.string(),
  code: z.string(),
  rotatedAt: z.string(),
});

export const balancesSchema = z.object({
  currencyCode: z.string(),
  total: z.string(),
  extraUnits: z.string(),
  rows: z.array(
    z.object({
      participantId: z.string(),
      displayName: z.string(),
      paid: z.string(),
      share: z.string(),
      balance: z.string(),
    }),
  ),
});

export const settlementSchema = z.object({
  currencyCode: z.string(),
  isSettled: z.boolean(),
  transfers: z.array(
    z.object({
      fromId: z.string(),
      fromName: z.string(),
      toId: z.string(),
      toName: z.string(),
      amount: z.string(),
    }),
  ),
});

export const expenseSchema = z.object({
  id: z.string(),
  payerId: z.string(),
  payerName: z.string(),
  description: z.string(),
  amount: z.string(),
  date: z.string(),
  version: z.number(),
  updatedAt: z.string(),
  canEdit: z.boolean(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expensePageSchema = z.object({
  items: z.array(expenseSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalAmount: z.string(),
});

export const sheetSchema = z.object({
  rows: z.array(expenseSchema),
  canChoosePayer: z.boolean(),
});

export const sheetResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  deleted: z.number(),
});

export const eventSchema = z.object({
  id: z.number(),
  occurredAt: z.string(),
  actorName: z.string(),
  kind: z.string(),
  detailsJson: z.string().nullable(),
});
export type GroupEvent = z.infer<typeof eventSchema>;

export const eventPageSchema = z.object({
  items: z.array(eventSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});
