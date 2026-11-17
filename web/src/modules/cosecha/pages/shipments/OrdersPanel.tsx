import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Dialog, Panel, StateView, TextField } from "@/core/ui";
import { useSetShipmentOrders } from "../../api/mutations";
import { usePendingOrders } from "../../api/queries";
import type { ShipmentDetail } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { QueryState } from "../../components/QueryState";
import { fieldMessage } from "../../errors";
import { formatDate, formatKg, parseDecimal, toFieldText } from "../../format";
import { strings } from "../../strings";
import { checkboxClass, inputClass, table, tableScroll, td, tdNumber, th, thNumber } from "../../styles";

const t = strings.shipments.orders;

type Row = {
  orderId: string;
  buyerName: string;
  requiredOn: string;
  orderedKg: number;
  deliveredKg: number | null;
  planned: string;
};

function AddOrdersDialog({
  detail,
  taken,
  onAdd,
  onClose,
}: {
  detail: ShipmentDetail;
  taken: ReadonlySet<string>;
  onAdd: (rows: Row[]) => void;
  onClose: () => void;
}) {
  const pending = usePendingOrders({
    seasonId: detail.summary.seasonId,
    date: detail.summary.shipmentDate,
  });
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  return (
    <Dialog title={t.addTitle} onClose={onClose} maxWidthClassName="max-w-2xl">
      <QueryState query={pending}>
        {(orders) => {
          const available = orders.filter((order) => !taken.has(order.orderId));
          if (available.length === 0) return <StateView status="empty" title={t.addNone} />;
          return (
            <div className="flex flex-col gap-4">
              <ul className="flex flex-col divide-y divide-line">
                {available.map((order) => (
                  <li key={order.orderId} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      aria-label={order.buyerName}
                      checked={chosen.has(order.orderId)}
                      onChange={(event) =>
                        setChosen((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(order.orderId);
                          else next.delete(order.orderId);
                          return next;
                        })
                      }
                    />
                    <span className="flex-1 text-sm text-fg">
                      {order.buyerName} · {formatDate(order.requiredOn)}
                    </span>
                    <span className="text-sm tabular-nums text-muted">{formatKg(order.unplannedKg)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  {strings.common.cancel}
                </Button>
                <Button
                  disabled={chosen.size === 0}
                  onClick={() =>
                    onAdd(
                      available
                        .filter((order) => chosen.has(order.orderId))
                        .map((order) => ({
                          orderId: order.orderId,
                          buyerName: order.buyerName,
                          requiredOn: order.requiredOn,
                          orderedKg: order.orderedKg,
                          deliveredKg: null,
                          planned: toFieldText(order.unplannedKg),
                        })),
                    )
                  }
                >
                  {strings.common.add}
                </Button>
              </div>
            </div>
          );
        }}
      </QueryState>
    </Dialog>
  );
}

/** Pedidos del envío y los kilos planeados de cada uno. Quitar o agregar se guarda de una vez. */
export function OrdersPanel({ detail, canManage }: { detail: ShipmentDetail; canManage: boolean }) {
  const notify = useNotify();
  const save = useSetShipmentOrders();
  const closed = detail.summary.status === "Closed";
  const [rows, setRows] = useState<Row[]>(
    detail.orders.map((order) => ({
      orderId: order.orderId,
      buyerName: order.buyerName,
      requiredOn: order.requiredOn,
      orderedKg: order.orderedKg,
      deliveredKg: order.deliveredKg,
      planned: toFieldText(order.plannedKg),
    })),
  );
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const orders = rows.map((row) => ({ orderId: row.orderId, plannedKg: parseDecimal(row.planned) }));
    if (orders.some((order) => order.plannedKg === null)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    save.mutate(
      {
        id: detail.summary.id,
        orders: orders.map((order) => ({ orderId: order.orderId, plannedKg: order.plannedKg ?? 0 })),
        note: note.trim() || undefined,
        version: detail.summary.version,
      },
      { onSuccess: () => notify(t.saved) },
    );
  };

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={
        canManage ? (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t.add}
          </Button>
        ) : undefined
      }
    >
      <div className={tableScroll}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>{t.buyer}</th>
              <th className={th}>{t.required}</th>
              <th className={thNumber}>{t.ordered}</th>
              <th className={thNumber}>{t.planned}</th>
              <th className={thNumber}>{t.delivered}</th>
              {canManage ? (
                <th className={th}>
                  <span className="sr-only">{strings.common.remove}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.orderId}>
                <td className={td}>{row.buyerName}</td>
                <td className={td}>{formatDate(row.requiredOn)}</td>
                <td className={tdNumber}>{formatKg(row.orderedKg)}</td>
                <td className={tdNumber}>
                  {canManage ? (
                    <input
                      inputMode="decimal"
                      className={`${inputClass} w-28 text-right`}
                      aria-label={`${t.planned}: ${row.buyerName}`}
                      value={row.planned}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, i) => (i === index ? { ...item, planned: event.target.value } : item)),
                        )
                      }
                    />
                  ) : (
                    formatKg(parseDecimal(row.planned))
                  )}
                </td>
                <td className={tdNumber}>{formatKg(row.deliveredKg)}</td>
                {canManage ? (
                  <td className={td}>
                    <Button
                      variant="ghost"
                      disabled={row.deliveredKg !== null}
                      aria-label={t.removeLabel(row.buyerName)}
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    >
                      {strings.common.remove}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage ? (
        <>
          {invalid ? (
            <p role="alert" className="text-sm text-danger">
              {strings.common.invalidNumber}
            </p>
          ) : null}
          {fieldMessage(save.error, "orders") ? (
            <p role="alert" className="text-sm text-danger">
              {fieldMessage(save.error, "orders")}
            </p>
          ) : null}
          <TextField
            label={t.changeNote}
            hint={closed ? strings.shipments.detail.closedHint : strings.common.noteHint}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fieldMessage(save.error, "note")}
            maxLength={500}
          />
          <FormAlert error={save.error} />
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={rows.length === 0}
              loading={save.isPending}
              loadingLabel={strings.common.saving}
            >
              {t.save}
            </Button>
          </div>
        </>
      ) : null}
      {adding ? (
        <AddOrdersDialog
          detail={detail}
          taken={new Set(rows.map((row) => row.orderId))}
          onClose={() => setAdding(false)}
          onAdd={(added) => {
            setRows((current) => [...current, ...added]);
            setAdding(false);
          }}
        />
      ) : null}
    </Panel>
  );
}
