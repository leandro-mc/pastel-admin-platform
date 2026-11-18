import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Alert, Badge, Button, Dialog, Panel } from "@/core/ui";
import {
  usePublishClaimsPolicy,
  usePublishPaymentPolicy,
} from "../../api/mutations";
import { usePolicy } from "../../api/queries";
import type { ClaimsPolicy, PaymentPolicy } from "../../api/schemas";
import { QueryState } from "../../components/QueryState";
import { formatCrc, formatDate, formatDateTime, formatNumber } from "../../format";
import { strings } from "../../strings";
import { table, tableScroll, td, th } from "../../styles";
import { PolicyForm, type PolicyField } from "./PolicyForm";

const t = strings.settings.policy;

const paymentFields: readonly PolicyField[] = [
  { key: "advancePct", label: t.payment.advancePct, kind: "number" },
  { key: "referencePricePerKg", label: t.payment.referencePricePerKg, kind: "number" },
  { key: "gradeBWeightPct", label: t.payment.gradeBWeightPct, kind: "number" },
  { key: "fundPct", label: t.payment.fundPct, kind: "number" },
  { key: "managementPct", label: t.payment.managementPct, kind: "number" },
  { key: "maxAdvancePct", label: t.payment.maxAdvancePct, kind: "number" },
  {
    key: "paymentWeekday",
    label: t.payment.paymentWeekday,
    kind: "weekday",
    hint: t.payment.weekdayHint,
  },
];

const claimsFields: readonly PolicyField[] = [
  { key: "claimWindowHours", label: t.claims.claimWindowHours, kind: "number" },
  { key: "requiredPhotos", label: t.claims.requiredPhotos, kind: "number" },
  { key: "tolerancePct", label: t.claims.tolerancePct, kind: "number" },
  { key: "majorClaimPct", label: t.claims.majorClaimPct, kind: "number" },
  { key: "creditPctRot", label: t.claims.creditPctRot, kind: "number" },
  { key: "creditPctDiscoloration", label: t.claims.creditPctDiscoloration, kind: "number" },
  { key: "ackHours", label: t.claims.ackHours, kind: "number" },
  { key: "resolutionDays", label: t.claims.resolutionDays, kind: "number" },
  { key: "majorResolutionDays", label: t.claims.majorResolutionDays, kind: "number" },
];

const pct = (value: number | null) =>
  value === null ? t.notSet : `${formatNumber(value)} %`;
const plain = (value: number | null) =>
  value === null ? t.notSet : formatNumber(value);

function describePayment(p: PaymentPolicy): [string, string][] {
  return [
    [t.payment.advancePct, pct(p.advancePct)],
    [
      t.payment.referencePricePerKg,
      p.referencePricePerKg === null ? t.notSet : formatCrc(p.referencePricePerKg),
    ],
    [t.payment.gradeBWeightPct, pct(p.gradeBWeightPct)],
    [t.payment.fundPct, pct(p.fundPct)],
    [t.payment.managementPct, pct(p.managementPct)],
    [t.payment.maxAdvancePct, pct(p.maxAdvancePct)],
    [
      t.payment.paymentWeekday,
      p.paymentWeekday === null
        ? t.notSet
        : (t.weekdays[p.paymentWeekday - 1] ?? t.notSet),
    ],
  ];
}

function describeClaims(p: ClaimsPolicy): [string, string][] {
  return [
    [t.claims.claimWindowHours, plain(p.claimWindowHours)],
    [t.claims.requiredPhotos, plain(p.requiredPhotos)],
    [t.claims.tolerancePct, pct(p.tolerancePct)],
    [t.claims.majorClaimPct, pct(p.majorClaimPct)],
    [t.claims.creditPctRot, pct(p.creditPctRot)],
    [t.claims.creditPctDiscoloration, pct(p.creditPctDiscoloration)],
    [t.claims.ackHours, plain(p.ackHours)],
    [t.claims.resolutionDays, plain(p.resolutionDays)],
    [t.claims.majorResolutionDays, plain(p.majorResolutionDays)],
  ];
}

type Version = {
  id: string;
  effectiveFrom: string;
  ratified: boolean;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
};

function Current({ rows }: { rows: [string, string][] | null }) {
  if (!rows) return <p className="text-sm text-muted">{t.noneCurrent}</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-line py-1.5">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function History({ versions }: { versions: readonly Version[] }) {
  if (versions.length === 0) return <p className="text-sm text-muted">{t.historyEmpty}</p>;
  return (
    <div className={tableScroll}>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>{t.effectiveFrom}</th>
            <th className={th}>{t.ratified}</th>
            <th className={th}>{t.note}</th>
            <th className={th}>{t.registeredBy}</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr key={version.id}>
              <td className={td}>{formatDate(version.effectiveFrom)}</td>
              <td className={td}>
                <Badge variant={version.ratified ? "success" : "warning"}>
                  {version.ratified ? t.ratifiedBadge : t.unratifiedBadge}
                </Badge>
              </td>
              <td className={td}>{version.note ?? strings.common.none}</td>
              <td className={td}>
                {strings.common.changeBy(version.createdByName, formatDateTime(version.createdAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PolicyPanel({ canManage }: { canManage: boolean }) {
  const notify = useNotify();
  const policy = usePolicy();
  const publishPayment = usePublishPaymentPolicy();
  const publishClaims = usePublishClaimsPolicy();
  const [publishing, setPublishing] = useState<"payment" | "claims" | null>(null);

  const close = () => setPublishing(null);
  const done = () => {
    notify(t.published);
    close();
  };

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="warning" message={`${t.pendingTitle}. ${t.pendingBody}`} />
      <QueryState query={policy}>
        {(data) => (
          <>
            <Panel
              title={t.payment.title}
              description={t.payment.description}
              actions={
                canManage ? (
                  <Button onClick={() => setPublishing("payment")}>{t.publish}</Button>
                ) : undefined
              }
            >
              <h3 className="text-sm font-semibold text-fg">{t.current}</h3>
              <Current rows={data.payment ? describePayment(data.payment) : null} />
              <h3 className="text-sm font-semibold text-fg">{t.history}</h3>
              <History versions={data.paymentHistory} />
            </Panel>
            <Panel
              title={t.claims.title}
              description={t.claims.description}
              actions={
                canManage ? (
                  <Button onClick={() => setPublishing("claims")}>{t.publish}</Button>
                ) : undefined
              }
            >
              <h3 className="text-sm font-semibold text-fg">{t.current}</h3>
              <Current rows={data.claims ? describeClaims(data.claims) : null} />
              <h3 className="text-sm font-semibold text-fg">{t.history}</h3>
              <History versions={data.claimsHistory} />
            </Panel>
          </>
        )}
      </QueryState>
      {publishing === "payment" ? (
        <Dialog title={t.payment.title} onClose={close}>
          <PolicyForm
            fields={paymentFields}
            pending={publishPayment.isPending}
            error={publishPayment.error}
            onCancel={close}
            onSubmit={({ numbers, ...common }) =>
              publishPayment.mutate(
                {
                  ...common,
                  advancePct: numbers.advancePct ?? null,
                  referencePricePerKg: numbers.referencePricePerKg ?? null,
                  gradeBWeightPct: numbers.gradeBWeightPct ?? null,
                  fundPct: numbers.fundPct ?? null,
                  managementPct: numbers.managementPct ?? null,
                  maxAdvancePct: numbers.maxAdvancePct ?? null,
                  paymentWeekday: numbers.paymentWeekday ?? null,
                },
                { onSuccess: done },
              )
            }
          />
        </Dialog>
      ) : null}
      {publishing === "claims" ? (
        <Dialog title={t.claims.title} onClose={close}>
          <PolicyForm
            fields={claimsFields}
            pending={publishClaims.isPending}
            error={publishClaims.error}
            onCancel={close}
            onSubmit={({ numbers, ...common }) =>
              publishClaims.mutate(
                {
                  ...common,
                  claimWindowHours: numbers.claimWindowHours ?? null,
                  requiredPhotos: numbers.requiredPhotos ?? null,
                  tolerancePct: numbers.tolerancePct ?? null,
                  majorClaimPct: numbers.majorClaimPct ?? null,
                  creditPctRot: numbers.creditPctRot ?? null,
                  creditPctDiscoloration: numbers.creditPctDiscoloration ?? null,
                  ackHours: numbers.ackHours ?? null,
                  resolutionDays: numbers.resolutionDays ?? null,
                  majorResolutionDays: numbers.majorResolutionDays ?? null,
                },
                { onSuccess: done },
              )
            }
          />
        </Dialog>
      ) : null}
    </div>
  );
}
