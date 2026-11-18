import { useState, type FormEvent } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Dialog, Panel, StateView, TextField } from "@/core/ui";
import { useRecordOrderDelivery } from "../../api/mutations";
import type { ShipmentDetail, ShipmentOrder } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { fieldMessage } from "../../errors";
import { formatDate, formatKg, parseDecimal, toFieldText } from "../../format";
import { strings } from "../../strings";
import { table, tableScroll, td, tdNumber, th, thNumber } from "../../styles";

const t = strings.shipments.delivery;

function DeliveryDialog({
  shipmentId,
  order,
  closed,
  onClose,
}: {
  shipmentId: string;
  order: ShipmentOrder;
  closed: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const record = useRecordOrderDelivery();
  const registered = order.deliveredKg !== null;
  const [delivered, setDelivered] = useState(toFieldText(order.deliveredKg ?? order.plannedKg));
  const [deliveryNote, setDeliveryNote] = useState(order.deliveryNote ?? "");
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseDecimal(delivered);
    if (value === null) {
      setInvalid(strings.common.invalidNumber);
      return;
    }
    setInvalid(undefined);
    record.mutate(
      {
        shipmentId,
        shipmentOrderId: order.id,
        deliveredKg: value,
        deliveryNote: deliveryNote.trim() || undefined,
        note: note.trim() || undefined,
        version: order.version,
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
    <Dialog title={t.dialogTitle(order.buyerName)} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t.deliveredKg}
          inputMode="decimal"
          value={delivered}
          onChange={(event) => setDelivered(event.target.value)}
          error={invalid ?? fieldMessage(record.error, "deliveredKg")}
          required
        />
        <TextField
          label={t.deliveryNote}
          value={deliveryNote}
          onChange={(event) => setDeliveryNote(event.target.value)}
          error={fieldMessage(record.error, "deliveryNote")}
          maxLength={500}
        />
        {registered || closed ? (
          <TextField
            label={t.changeNote}
            hint={closed ? strings.shipments.detail.closedHint : strings.common.noteHint}
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

/** Entrega a compradores: los kilos que realmente recibió cada uno. */
export function DeliveryPanel({ detail, canManage }: { detail: ShipmentDetail; canManage: boolean }) {
  const [editing, setEditing] = useState<ShipmentOrder | null>(null);
  const closed = detail.summary.status === "Closed";

  return (
    <Panel title={t.title} description={t.description}>
      {detail.orders.length === 0 ? (
        <StateView status="empty" title={t.empty} />
      ) : (
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>{t.buyer}</th>
                <th className={th}>{strings.shipments.orders.required}</th>
                <th className={thNumber}>{t.planned}</th>
                <th className={thNumber}>{t.delivered}</th>
                <th className={th}>{t.note}</th>
                {canManage ? <th className={th}>{t.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {detail.orders.map((order) => (
                <tr key={order.id}>
                  <td className={td}>{order.buyerName}</td>
                  <td className={td}>{formatDate(order.requiredOn)}</td>
                  <td className={tdNumber}>{formatKg(order.plannedKg)}</td>
                  <td className={tdNumber}>{formatKg(order.deliveredKg)}</td>
                  <td className={td}>{order.deliveryNote ?? strings.common.none}</td>
                  {canManage ? (
                    <td className={td}>
                      <Button variant="link" onClick={() => setEditing(order)}>
                        {order.deliveredKg === null ? t.register : t.correct}
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
        <DeliveryDialog
          key={`${editing.id}-${editing.version}`}
          shipmentId={detail.summary.id}
          order={editing}
          closed={closed}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Panel>
  );
}
