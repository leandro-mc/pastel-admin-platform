import { Plus } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { PageHeader, Panel, StateView } from "@/core/ui";
import { useToday } from "../api/queries";
import { QueryState } from "../components/QueryState";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { pageClass, primaryButton, secondaryButton, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.today;

/** «Hoy»: envíos abiertos con lo que les falta y los pagos de los próximos días. */
export function TodayPage() {
  const { hasPermission } = useAuth();
  const canPlan = hasPermission(cosechaPermissions.shipmentsManage);
  const canOrder = hasPermission(cosechaPermissions.ordersManage);
  const data = useToday();

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {canPlan ? (
              <Link to={cosechaPaths.newShipment} className={primaryButton}>
                <Plus aria-hidden="true" className="size-4" />
                {t.planShipment}
              </Link>
            ) : null}
            {canOrder ? (
              <Link to={cosechaPaths.newOrder} className={secondaryButton}>
                {t.newOrder}
              </Link>
            ) : null}
          </div>
        }
      />
      <QueryState query={data}>
        {(today) => (
          <>
            <Panel title={t.shipmentsTitle}>
              {today.shipments.length === 0 ? (
                <StateView status="empty" title={t.shipmentsEmpty} />
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {today.shipments.map((shipment) => (
                    <li key={shipment.id} className="rounded-xl border border-line bg-surface-raised p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to={cosechaPaths.shipment(shipment.id)}
                          className="text-base font-semibold text-accent-strong underline-offset-2 hover:underline"
                        >
                          {formatDate(shipment.shipmentDate)} · {shipment.seasonName}
                        </Link>
                        <StatusBadge kind="shipment" value={shipment.status} />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <dt className="text-muted">{t.target}</dt>
                          <dd className="font-medium tabular-nums text-fg">{formatKg(shipment.targetKg)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">{t.requested}</dt>
                          <dd className="font-medium tabular-nums text-fg">{formatKg(shipment.requestedKg)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">{t.difference}</dt>
                          <dd className={`font-medium tabular-nums ${shipment.differenceKg < 0 ? "text-danger" : "text-fg"}`}>
                            {formatKg(shipment.differenceKg)}
                          </dd>
                        </div>
                      </dl>
                      <ul className="mt-3 flex flex-col gap-1 text-sm text-fg">
                        <li>{t.unconfirmed(shipment.unconfirmedProducers)}</li>
                        <li>{t.receptions(shipment.pendingReceptions)}</li>
                        <li>{t.deliveries(shipment.pendingDeliveries)}</li>
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            {hasPermission(cosechaPermissions.settlementsRead) ? (
              <Panel title={t.paymentsTitle}>
                {today.paymentsDueSoon.length === 0 ? (
                  <p className="text-sm text-muted">{t.paymentsEmpty}</p>
                ) : (
                  <div className={tableScroll}>
                    <table className={table}>
                      <thead>
                        <tr>
                          <th className={th}>{t.producer}</th>
                          <th className={thNumber}>{t.amount}</th>
                          <th className={th}>{t.dueOn}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {today.paymentsDueSoon.map((payment) => (
                          <tr key={payment.producerId}>
                            <td className={td}>
                              <Link
                                to={cosechaPaths.settlement(payment.producerId)}
                                className="font-medium text-accent-strong underline-offset-2 hover:underline"
                              >
                                {payment.producerName}
                              </Link>
                            </td>
                            <td className={tdNumber}>{formatCrc(payment.outstandingCrc)}</td>
                            <td className={td}>{formatDate(payment.dueOn)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            ) : null}
          </>
        )}
      </QueryState>
    </section>
  );
}
