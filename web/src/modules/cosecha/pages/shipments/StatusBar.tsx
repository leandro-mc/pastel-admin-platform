import { useState } from "react";
import { useNavigate } from "react-router";
import { useNotify } from "@/core/notifications";
import { Button, ConfirmDialog } from "@/core/ui";
import { useCloseShipment, useDeleteShipment, useSetShipmentStatus } from "../../api/mutations";
import type { ShipmentDetail } from "../../api/schemas";
import { FormAlert } from "../../components/FormAlert";
import { ReasonDialog } from "../../components/ReasonDialog";
import { statusLabel } from "../../components/StatusBadge";
import { cosechaPaths } from "../../paths";
import { strings } from "../../strings";

const t = strings.shipments.detail.status;
const FLOW = ["Planned", "Collecting", "Collected", "Delivered"] as const;

/** Acciones sobre el ciclo del envío: avanzar un paso, retroceder (con motivo), cerrar y, si aún está limpio, eliminar. */
export function StatusBar({ detail }: { detail: ShipmentDetail }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const setStatus = useSetShipmentStatus();
  const close = useCloseShipment();
  const remove = useDeleteShipment();
  const [dialog, setDialog] = useState<"back" | "close" | "delete" | null>(null);

  const { summary } = detail;
  const index = FLOW.findIndex((value) => value === summary.status);
  const next = index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : undefined;
  const previous = summary.status === "Closed" ? "Delivered" : index > 0 ? FLOW[index - 1] : undefined;
  const deletable =
    summary.status === "Planned" &&
    detail.deliveries.every((delivery) => delivery.status !== "Received") &&
    detail.orders.every((order) => order.deliveredKg === null);
  const pendingRecords = detail.totals.pendingReceptions + detail.totals.pendingDeliveries > 0;

  const shut = () => setDialog(null);

  return (
    <div className="flex flex-wrap gap-2">
      {next ? (
        <Button
          loading={setStatus.isPending}
          loadingLabel={strings.common.saving}
          onClick={() =>
            setStatus.mutate(
              { id: summary.id, status: next, version: summary.version },
              { onSuccess: () => notify(t.changed) },
            )
          }
        >
          {t.advanceTo(statusLabel("shipment", next))}
        </Button>
      ) : null}
      {previous ? (
        <Button variant="secondary" onClick={() => setDialog("back")}>
          {t.back}
        </Button>
      ) : null}
      {summary.status !== "Closed" ? (
        <Button variant="secondary" onClick={() => setDialog("close")}>
          {t.close}
        </Button>
      ) : null}
      {deletable ? (
        <Button variant="danger" onClick={() => setDialog("delete")}>
          {t.delete}
        </Button>
      ) : null}
      <FormAlert error={setStatus.error} />
      {dialog === "back" && previous ? (
        <ReasonDialog
          title={t.backTitle}
          message={t.backMessage}
          confirmLabel={t.back}
          pending={setStatus.isPending}
          error={setStatus.error}
          onClose={shut}
          onConfirm={(reason) =>
            setStatus.mutate(
              { id: summary.id, status: previous, reason, version: summary.version },
              {
                onSuccess: () => {
                  notify(t.changed);
                  shut();
                },
              },
            )
          }
        />
      ) : null}
      {dialog === "close" ? (
        <ReasonDialog
          title={t.closeTitle}
          message={t.closeMessage(detail.totals.pendingReceptions, detail.totals.pendingDeliveries)}
          label={t.closeReason}
          required={pendingRecords}
          confirmLabel={t.close}
          pending={close.isPending}
          error={close.error}
          onClose={shut}
          onConfirm={(reason) =>
            close.mutate(
              { id: summary.id, reason: reason || undefined, version: summary.version },
              {
                onSuccess: () => {
                  notify(t.closed);
                  shut();
                },
              },
            )
          }
        />
      ) : null}
      {dialog === "delete" ? (
        <ConfirmDialog
          title={t.deleteTitle}
          message={t.deleteMessage}
          confirmLabel={t.delete}
          cancelLabel={strings.common.cancel}
          pendingLabel={strings.common.saving}
          pending={remove.isPending}
          onClose={shut}
          onConfirm={() =>
            remove.mutate(
              { id: summary.id, version: summary.version },
              {
                onSuccess: () => {
                  notify(t.deleted);
                  void navigate(cosechaPaths.shipments);
                },
              },
            )
          }
        >
          <FormAlert error={remove.error} />
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
