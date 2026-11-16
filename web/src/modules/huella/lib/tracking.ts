import type {
  LetterSummary,
  OfferStatus,
  OfferSummary,
  VersionSummary,
} from "../api/schemas";

/** Estados con los que el proceso terminó; el resto sigue abierto. */
export const closedStatuses: readonly OfferStatus[] = [
  "rejected",
  "no_response",
  "discarded",
];

export type StatusFilter =
  | "all"
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "closed";

export const statusFilters: readonly StatusFilter[] = [
  "all",
  "saved",
  "applied",
  "interview",
  "offer",
  "closed",
];

export const matchesStatus = (status: OfferStatus, filter: StatusFilter) =>
  filter === "all" ||
  (filter === "closed" ? closedStatuses.includes(status) : status === filter);

export type FollowUp =
  | { kind: "overdue"; days: number }
  | { kind: "today"; days: 0 }
  | { kind: "soon"; days: number };

/** Cuánto falta (o cuánto pasó) para el día de seguimiento, en días de calendario locales. */
export function followUpState(
  followUpAt: string | null,
  now: Date = new Date(),
): FollowUp | null {
  if (!followUpAt) return null;
  const [y, m, d] = followUpAt.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days === 0) return { kind: "today", days: 0 };
  return { kind: "soon", days };
}

/** Seguimiento pendiente: ya llegó el día en una postulación que sigue abierta. */
export const needsFollowUp = (offer: OfferSummary) =>
  (offer.status === "applied" || offer.status === "interview") &&
  followUpState(offer.followUpAt)?.kind !== undefined &&
  followUpState(offer.followUpAt)?.kind !== "soon";

/** Un documento de una oferta, sea CV o carta. */
export type OfferDoc = {
  kind: "cv" | "letter";
  id: string;
  name: string;
  language: string;
  sentAt: string | null;
  createdAt: string;
};

/** Documentos (CV y cartas) de una oferta y cuántos se enviaron. */
export function documentsOf(
  offerId: string,
  versions: readonly VersionSummary[],
  letters: readonly LetterSummary[] = [],
) {
  const docs: OfferDoc[] = [
    ...versions
      .filter((v) => v.offerId === offerId)
      .map((v) => ({ kind: "cv" as const, id: v.id, name: v.name, language: v.language, sentAt: v.sentAt, createdAt: v.createdAt })),
    ...letters
      .filter((l) => l.offerId === offerId)
      .map((l) => ({ kind: "letter" as const, id: l.id, name: l.name, language: l.language, sentAt: l.sentAt, createdAt: l.createdAt })),
  ];
  return { docs, sent: docs.filter((d) => d.sentAt !== null).length };
}

/** Fecha local `AAAA-MM-DD` de un instante (para los campos de fecha). */
export function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Hoy más `days` días, como `AAAA-MM-DD` local. */
export function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInput(d.toISOString());
}
