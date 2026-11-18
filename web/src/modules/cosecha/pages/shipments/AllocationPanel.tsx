import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Alert, Button, Panel, StateView, TextField } from "@/core/ui";
import { useApplyAllocation, useSetDeliveryStatus, useSuggestAllocation } from "../../api/mutations";
import { useCandidates, useSeasons } from "../../api/queries";
import type { Candidates, ShipmentDetail } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { QueryState } from "../../components/QueryState";
import { StatusBadge } from "../../components/StatusBadge";
import { fieldMessage } from "../../errors";
import { formatDate, formatKg, formatPhone, parseDecimal, toFieldText, whatsAppLink } from "../../format";
import { strings } from "../../strings";
import { checkboxClass, inputClass, secondaryButton, table, tableScroll, td, tdNumber, th, thNumber } from "../../styles";

const t = strings.shipments.allocation;
const d = strings.shipments.deliveries;

type RowState = { included: boolean; cap: string; requested: string };
const EMPTY: RowState = { included: false, cap: "", requested: "" };

function AllocationEditor({ detail, candidates }: { detail: ShipmentDetail; candidates: Candidates }) {
  const notify = useNotify();
  const suggest = useSuggestAllocation();
  const apply = useApplyAllocation();
  const closed = detail.summary.status === "Closed";
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      candidates.producers.map((producer) => [
        producer.producerId,
        {
          included: producer.requestedKg !== null || producer.capacityKg > 0,
          cap: toFieldText(producer.availableKg),
          requested: toFieldText(producer.requestedKg),
        },
      ]),
    ),
  );
  const [shortfall, setShortfall] = useState(0);
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState(false);

  const patch = (id: string, change: Partial<RowState>) =>
    setRows((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY), ...change } }));

  const requestedTotal = candidates.producers.reduce(
    (sum, producer) => sum + (parseDecimal(rows[producer.producerId]?.requested ?? "") ?? 0),
    0,
  );
  const difference = requestedTotal - candidates.targetKg;

  const calculate = () => {
    const participants = candidates.producers
      .filter((producer) => rows[producer.producerId]?.included)
      .map((producer) => ({
        producerId: producer.producerId,
        included: true,
        availableKg: parseDecimal(rows[producer.producerId]?.cap ?? ""),
      }));
    suggest.mutate(
      { id: detail.summary.id, participants },
      {
        onSuccess: (suggestion) => {
          setShortfall(suggestion.shortfallKg);
          setRows((current) => {
            const next = { ...current };
            for (const producer of candidates.producers) {
              const share = suggestion.rows.find((row) => row.producerId === producer.producerId);
              next[producer.producerId] = {
                ...(current[producer.producerId] ?? EMPTY),
                requested: share ? toFieldText(share.suggestedKg) : "",
              };
            }
            return next;
          });
          notify(t.suggested);
        },
      },
    );
  };

  const save = () => {
    const deliveries: { producerId: string; requestedKg: number; availableKg: number | null }[] = [];
    let bad = false;
    for (const producer of candidates.producers) {
      const row = rows[producer.producerId] ?? EMPTY;
      if (row.requested.trim() === "") continue;
      const requested = parseDecimal(row.requested);
      if (requested === null) {
        bad = true;
        continue;
      }
      if (requested > 0) {
        deliveries.push({ producerId: producer.producerId, requestedKg: requested, availableKg: parseDecimal(row.cap) });
      }
    }
    setInvalid(bad);
    if (bad) return;
    apply.mutate(
      { id: detail.summary.id, deliveries, note: note.trim() || undefined, version: detail.summary.version },
      { onSuccess: () => notify(t.saved) },
    );
  };

  if (candidates.producers.length === 0) return <StateView status="empty" title={t.empty} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-fg">
        {t.target}: {formatKg(candidates.targetKg)}
      </p>
      {shortfall > 0 ? (
        <Alert variant="warning" message={`${t.shortfallTitle}. ${t.shortfallBody(formatKg(shortfall))}`} />
      ) : null}
      <div className={tableScroll}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>{t.include}</th>
              <th className={th}>{t.producer}</th>
              <th className={thNumber}>{t.capacity}</th>
              <th className={thNumber}>{t.cap}</th>
              <th className={thNumber}>{t.requested}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.producers.map((producer) => {
              const row = rows[producer.producerId] ?? EMPTY;
              return (
                <tr key={producer.producerId}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      aria-label={`${t.include}: ${producer.name}`}
                      checked={row.included}
                      onChange={(event) => patch(producer.producerId, { included: event.target.checked })}
                    />
                  </td>
                  <td className={td}>{producer.name}</td>
                  <td className={tdNumber}>{formatKg(producer.capacityKg)}</td>
                  <td className={tdNumber}>
                    <input
                      inputMode="decimal"
                      className={`${inputClass} w-28 text-right`}
                      aria-label={`${t.cap}: ${producer.name}`}
                      value={row.cap}
                      onChange={(event) => patch(producer.producerId, { cap: event.target.value })}
                    />
                  </td>
                  <td className={tdNumber}>
                    <input
                      inputMode="decimal"
                      className={`${inputClass} w-28 text-right`}
                      aria-label={`${t.requested}: ${producer.name}`}
                      value={row.requested}
                      onChange={(event) => patch(producer.producerId, { requested: event.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-fg">
        {t.totalRequested}: <strong className="tabular-nums">{formatKg(requestedTotal)}</strong> · {t.difference}:{" "}
        <strong className="tabular-nums">{formatKg(difference)}</strong>
      </p>
      {invalid ? (
        <p role="alert" className="text-sm text-danger">
          {strings.common.invalidNumber}
        </p>
      ) : null}
      {closed ? (
        <TextField
          label={t.changeNote}
          hint={strings.shipments.detail.closedHint}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldMessage(apply.error, "note")}
          maxLength={500}
        />
      ) : null}
      <FormAlert error={suggest.error} />
      <FormAlert error={apply.error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={calculate}
          loading={suggest.isPending}
          loadingLabel={t.calculating}
        >
          {t.calculate}
        </Button>
        <Button onClick={save} loading={apply.isPending} loadingLabel={strings.common.saving}>
          {t.save}
        </Button>
      </div>
    </div>
  );
}

function DeliveriesTable({ detail, canManage }: { detail: ShipmentDetail; canManage: boolean }) {
  const notify = useNotify();
  const setStatus = useSetDeliveryStatus();
  const seasons = useSeasons();
  const product = seasons.data?.find((season) => season.id === detail.summary.seasonId)?.productName ?? "fruta";
  const closed = detail.summary.status === "Closed";
  const change = (deliveryId: string, status: string, version: number) =>
    setStatus.mutate(
      { shipmentId: detail.summary.id, deliveryId, status, version },
      { onSuccess: () => notify(d.statusChanged) },
    );

  return (
    <Panel title={d.title}>
      {detail.deliveries.length === 0 ? (
        <StateView status="empty" title={d.empty} />
      ) : (
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>{d.producer}</th>
                <th className={thNumber}>{d.requested}</th>
                <th className={th}>{d.status}</th>
                <th className={th}>{d.contact}</th>
                {canManage && !closed ? <th className={th}>{d.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {detail.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className={td}>{delivery.producerName}</td>
                  <td className={tdNumber}>{formatKg(delivery.requestedKg)}</td>
                  <td className={td}>
                    <StatusBadge kind="delivery" value={delivery.status} />
                  </td>
                  <td className={td}>
                    {delivery.primaryPhone ? (
                      <div className="flex flex-wrap gap-2">
                        <a
                          className={secondaryButton}
                          href={whatsAppLink(
                            delivery.primaryPhone,
                            (delivery.status === "Confirmed" ? d.reminder : d.request)(
                              delivery.producerName,
                              formatDate(detail.summary.shipmentDate),
                              formatKg(delivery.requestedKg),
                              product,
                            ),
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={d.whatsappLabel(delivery.producerName)}
                        >
                          <MessageCircle aria-hidden="true" className="mr-1 size-4" />
                          {delivery.status === "Confirmed" ? d.remind : d.whatsapp}
                        </a>
                        <a
                          className={secondaryButton}
                          href={`tel:+506${delivery.primaryPhone}`}
                          aria-label={d.callLabel(delivery.producerName)}
                        >
                          <Phone aria-hidden="true" className="mr-1 size-4" />
                          {formatPhone(delivery.primaryPhone)}
                        </a>
                      </div>
                    ) : (
                      strings.common.none
                    )}
                  </td>
                  {canManage && !closed ? (
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {delivery.status === "Requested" ? (
                          <Button variant="link" onClick={() => change(delivery.id, "Confirmed", delivery.version)}>
                            {d.confirm}
                          </Button>
                        ) : null}
                        {delivery.status === "Requested" || delivery.status === "Confirmed" ? (
                          <Button variant="link" onClick={() => change(delivery.id, "NoDelivery", delivery.version)}>
                            {d.noDelivery}
                          </Button>
                        ) : null}
                        {delivery.status === "NoDelivery" || delivery.status === "Confirmed" ? (
                          <Button variant="link" onClick={() => change(delivery.id, "Requested", delivery.version)}>
                            {d.reopen}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormAlert error={setStatus.error} />
    </Panel>
  );
}

/** Reparto entre productores (sugerir, ajustar y guardar) y seguimiento de lo solicitado a cada uno. */
export function AllocationPanel({ detail, canManage }: { detail: ShipmentDetail; canManage: boolean }) {
  const candidates = useCandidates(detail.summary.id, { enabled: canManage });
  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <Panel title={t.title} description={t.description}>
          <QueryState query={candidates}>
            {(data) => <AllocationEditor detail={detail} candidates={data} />}
          </QueryState>
        </Panel>
      ) : null}
      <DeliveriesTable detail={detail} canManage={canManage} />
    </div>
  );
}
