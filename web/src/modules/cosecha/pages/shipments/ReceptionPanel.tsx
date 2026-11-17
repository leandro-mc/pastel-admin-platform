import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Dialog, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { useRecordReception } from "../../api/mutations";
import type { Delivery, ShipmentDetail } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { StatusBadge } from "../../components/StatusBadge";
import { fieldMessage } from "../../errors";
import { formatCrc, formatDate, formatKg, parseDecimal, toFieldText } from "../../format";
import { strings } from "../../strings";
import { tableScroll, td, tdNumber, th, thNumber } from "../../styles";

const t = strings.shipments.reception;

function ReceptionDialog({
  shipmentId,
  delivery,
  closed,
  onClose,
}: {
  shipmentId: string;
  delivery: Delivery;
  closed: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const record = useRecordReception();
  const registered = delivery.receivedKg !== null;
  const [received, setReceived] = useState(toFieldText(delivery.receivedKg ?? delivery.requestedKg));
  const [rejected, setRejected] = useState(toFieldText(delivery.rejectedKg));
  const [quality, setQuality] = useState(delivery.quality ?? "Good");
  const [price, setPrice] = useState(toFieldText(delivery.pricePerKg));
  const [notes, setNotes] = useState(delivery.notes ?? "");
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<Record<string, string>>({});

  const receivedValue = parseDecimal(received);
  const rejectedValue = parseDecimal(rejected) ?? 0;
  const accepted = receivedValue === null ? null : receivedValue - rejectedValue;
  const gap = receivedValue === null ? null : receivedValue - delivery.requestedKg;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: Record<string, string> = {};
    const priceValue = parseDecimal(price);
    if (receivedValue === null) problems.receivedKg = strings.common.invalidNumber;
    if (rejected.trim() !== "" && parseDecimal(rejected) === null) problems.rejectedKg = strings.common.invalidNumber;
    if (priceValue === null) problems.pricePerKg = strings.common.invalidNumber;
    setInvalid(problems);
    if (Object.keys(problems).length > 0 || receivedValue === null || priceValue === null) return;
    record.mutate(
      {
        shipmentId,
        deliveryId: delivery.id,
        body: {
          receivedKg: receivedValue,
          rejectedKg: rejectedValue,
          quality,
          notes: notes.trim() || undefined,
          pricePerKg: priceValue,
          note: note.trim() || undefined,
          version: delivery.version,
        },
      },
      {
        onSuccess: () => {
          notify(t.saved);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog title={t.dialogTitle(delivery.producerName)} onClose={onClose} maxWidthClassName="max-w-2xl">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t.receivedKg}
            inputMode="decimal"
            value={received}
            onChange={(event) => setReceived(event.target.value)}
            error={invalid.receivedKg ?? fieldMessage(record.error, "receivedKg")}
            required
          />
          <TextField
            label={t.rejectedKg}
            hint={t.rejectedHint}
            inputMode="decimal"
            value={rejected}
            onChange={(event) => setRejected(event.target.value)}
            error={invalid.rejectedKg ?? fieldMessage(record.error, "rejectedKg")}
          />
        </div>
        <p className="text-sm text-fg" aria-live="polite">
          {t.preview(formatKg(accepted), formatKg(gap))}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t.qualityLabel}
            value={quality}
            onChange={(event) => setQuality(event.target.value)}
            options={Object.entries(strings.status.quality).map(([value, label]) => ({ value, label }))}
            error={fieldMessage(record.error, "quality")}
          />
          <TextField
            label={t.priceLabel}
            hint={t.priceHint}
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            error={invalid.pricePerKg ?? fieldMessage(record.error, "pricePerKg")}
          />
        </div>
        <TextField
          label={t.notes}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={fieldMessage(record.error, "notes")}
          maxLength={1000}
        />
        {registered || closed ? (
          <TextField
            label={t.changeNote}
            hint={closed ? strings.shipments.detail.closedHint : t.changeNoteHint}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fieldMessage(record.error, "note")}
            maxLength={500}
          />
        ) : null}
        <FormAlert error={record.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button type="submit" loading={record.isPending} loadingLabel={strings.common.saving}>
            {strings.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Recepción en el punto de acopio: lo recibido y rechazado de cada productor, con su monto y fecha prevista de pago. */
export function ReceptionPanel({ detail, canManage }: { detail: ShipmentDetail; canManage: boolean }) {
  const [editing, setEditing] = useState<Delivery | null>(null);
  const closed = detail.summary.status === "Closed";
  const deliveries = detail.deliveries.filter((delivery) => delivery.status !== "NoDelivery");

  return (
    <Panel title={t.title} description={t.description}>
      {deliveries.length === 0 ? (
        <StateView status="empty" title={t.empty} />
      ) : (
        <div className={tableScroll}>
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={th}>{t.producer}</th>
                <th className={thNumber}>{t.requested}</th>
                <th className={thNumber}>{t.received}</th>
                <th className={thNumber}>{t.rejected}</th>
                <th className={thNumber}>{t.accepted}</th>
                <th className={thNumber}>{t.price}</th>
                <th className={thNumber}>{t.amount}</th>
                <th className={th}>{t.status}</th>
                <th className={th}>{t.expectedPayment}</th>
                {canManage ? <th className={th}>{t.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className={td}>{delivery.producerName}</td>
                  <td className={tdNumber}>{formatKg(delivery.requestedKg)}</td>
                  <td className={tdNumber}>{formatKg(delivery.receivedKg)}</td>
                  <td className={tdNumber}>{formatKg(delivery.receivedKg === null ? null : delivery.rejectedKg)}</td>
                  <td className={tdNumber}>{formatKg(delivery.acceptedKg)}</td>
                  <td className={tdNumber}>{formatCrc(delivery.pricePerKg)}</td>
                  <td className={tdNumber}>{formatCrc(delivery.amountCrc)}</td>
                  <td className={td}>
                    <StatusBadge kind="delivery" value={delivery.status} />
                  </td>
                  <td className={td}>{formatDate(delivery.expectedPaymentDate)}</td>
                  {canManage ? (
                    <td className={td}>
                      <Button variant="link" onClick={() => setEditing(delivery)}>
                        {delivery.receivedKg === null ? t.register : t.correct}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? (
        <ReceptionDialog
          key={`${editing.id}-${editing.version}`}
          shipmentId={detail.summary.id}
          delivery={editing}
          closed={closed}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}
