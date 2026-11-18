import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { Alert, Button, Dialog, PageHeader, Panel } from "@/core/ui";
import { useCancelOrder, useConfirmOrder } from "../api/mutations";
import { useOrder } from "../api/queries";
import type { OrderDetail } from "../api/schemas";
import { ChangesList } from "../components/ChangesList";
import { FormAlert } from "../components/FormAlert";
import { QueryState } from "../components/QueryState";
import { ReasonDialog } from "../components/ReasonDialog";
import { Stat } from "../components/Stat";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass, statGrid, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";
import { OrderForm } from "./orders/OrderForm";

const t = strings.orders.detail;

function OrderView({ detail }: { detail: OrderDetail }) {
  const notify = useNotify();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.ordersManage);
  const confirm = useConfirmOrder();
  const cancel = useCancelOrder();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { summary } = detail;
  const cancelled = summary.status === "Cancelled";

  return (
    <section data-module="cosecha" className={pageClass}>
      <Link to={cosechaPaths.orders} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
        {t.back}
      </Link>
      <PageHeader
        title={`${summary.buyerName} · ${formatDate(summary.requiredOn)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge kind="progress" value={summary.progress} />
            <span>
              {t.season}: {summary.seasonName}
            </span>
          </span>
        }
        actions={
          canManage && !cancelled ? (
            <div className="flex flex-wrap gap-2">
              {summary.status === "Draft" ? (
                <Button
                  loading={confirm.isPending}
                  loadingLabel={strings.common.saving}
                  onClick={() =>
                    confirm.mutate(
                      { id: summary.id, version: summary.version },
                      { onSuccess: () => notify(t.confirmed) },
                    )
                  }
                >
                  {t.confirm}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t.edit}
              </Button>
              <Button variant="danger" onClick={() => setCancelling(true)}>
                {t.cancel}
              </Button>
            </div>
          ) : undefined
        }
      />
      <FormAlert error={confirm.error} />
      {cancelled ? (
        <Alert
          variant="warning"
          message={`${t.cancelReason}: ${detail.cancelReason ?? strings.common.none}`}
        />
      ) : null}
      <div className={statGrid}>
        <Stat label={t.ordered} value={formatKg(summary.orderedKg)} />
        <Stat label={t.delivered} value={formatKg(summary.deliveredKg)} />
        <Stat label={t.pending} value={formatKg(summary.pendingKg)} hint={`${t.unplanned}: ${formatKg(summary.unplannedKg)}`} />
        <Stat label={t.total} value={formatCrc(summary.totalCrc)} />
      </div>
      {detail.notes ? (
        <Panel title={t.notes}>
          <p className="text-sm text-fg">{detail.notes}</p>
        </Panel>
      ) : null}
      <Panel title={t.lines}>
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>{t.product}</th>
                <th className={thNumber}>{t.kilograms}</th>
                <th className={thNumber}>{t.price}</th>
                <th className={thNumber}>{t.subtotal}</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.id}>
                  <td className={td}>{line.productName}</td>
                  <td className={tdNumber}>{formatKg(line.kilograms)}</td>
                  <td className={tdNumber}>{formatCrc(line.pricePerKg)}</td>
                  <td className={tdNumber}>{formatCrc(line.kilograms * line.pricePerKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title={t.shipments}>
        {detail.shipments.length === 0 ? (
          <p className="text-sm text-muted">{t.shipmentsEmpty}</p>
        ) : (
          <div className={tableScroll}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>{t.shipmentDate}</th>
                  <th className={th}>{t.shipmentStatus}</th>
                  <th className={thNumber}>{t.planned}</th>
                  <th className={thNumber}>{t.deliveredKg}</th>
                </tr>
              </thead>
              <tbody>
                {detail.shipments.map((shipment) => (
                  <tr key={shipment.shipmentId}>
                    <td className={td}>
                      <Link
                        to={cosechaPaths.shipment(shipment.shipmentId)}
                        className="font-medium text-accent-strong underline-offset-2 hover:underline"
                      >
                        {formatDate(shipment.shipmentDate)}
                      </Link>
                    </td>
                    <td className={td}>
                      <StatusBadge kind="shipment" value={shipment.shipmentStatus} />
                    </td>
                    <td className={tdNumber}>{formatKg(shipment.plannedKg)}</td>
                    <td className={tdNumber}>{formatKg(shipment.deliveredKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <ChangesList changes={detail.changes} />
      {editing ? (
        <Dialog title={strings.orders.editTitle} onClose={() => setEditing(false)} maxWidthClassName="max-w-3xl">
          <OrderForm
            order={detail}
            onDone={() => {
              notify(strings.orders.form.saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </Dialog>
      ) : null}
      {cancelling ? (
        <ReasonDialog
          title={t.cancelTitle}
          message={t.cancelMessage}
          label={t.cancelReasonLabel}
          confirmLabel={t.cancel}
          pending={cancel.isPending}
          error={cancel.error}
          onClose={() => setCancelling(false)}
          onConfirm={(reason) =>
            cancel.mutate(
              { id: summary.id, reason, version: summary.version },
              {
                onSuccess: () => {
                  notify(t.cancelled);
                  setCancelling(false);
                },
              },
            )
          }
        />
      ) : null}
    </section>
  );
}

/** Detalle de un pedido: resumen, productos, envíos, registro de cambios y acciones. */
export function Component() {
  const { id } = useParams();
  const order = useOrder(id);
  return <QueryState query={order}>{(detail) => <OrderView detail={detail} />}</QueryState>;
}
