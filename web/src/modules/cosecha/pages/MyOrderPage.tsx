import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { PageHeader, Panel } from "@/core/ui";
import { useMyOrder } from "../api/queries";
import { QueryState } from "../components/QueryState";
import { Stat } from "../components/Stat";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg } from "../format";
import { cosechaPaths } from "../paths";
import { strings } from "../strings";
import { linkButton, pageClass, statGrid, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.orders.mine;
const d = strings.orders.detail;

/** Detalle de un pedido propio: productos y estado de sus envíos. */
export function Component() {
  const { id } = useParams();
  const order = useMyOrder(id);
  return (
    <QueryState query={order}>
      {(detail) => (
        <section data-module="cosecha" className={pageClass}>
          <Link to={cosechaPaths.myOrders} className={`${linkButton} self-start`}>
            <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
            {t.back}
          </Link>
          <PageHeader
            title={`${detail.summary.buyerName} · ${formatDate(detail.summary.requiredOn)}`}
            description={<StatusBadge kind="progress" value={detail.summary.progress} />}
          />
          <div className={statGrid}>
            <Stat label={t.ordered} value={formatKg(detail.summary.orderedKg)} />
            <Stat label={t.delivered} value={formatKg(detail.summary.deliveredKg)} />
            <Stat label={t.total} value={formatCrc(detail.summary.totalCrc)} />
          </div>
          <Panel title={t.lines}>
            <div className={tableScroll}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>{d.product}</th>
                    <th className={thNumber}>{d.kilograms}</th>
                    <th className={thNumber}>{d.price}</th>
                    <th className={thNumber}>{d.subtotal}</th>
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
                      <th className={th}>{d.shipmentDate}</th>
                      <th className={th}>{d.shipmentStatus}</th>
                      <th className={thNumber}>{d.planned}</th>
                      <th className={thNumber}>{d.deliveredKg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.shipments.map((shipment) => (
                      <tr key={shipment.shipmentId}>
                        <td className={td}>{formatDate(shipment.shipmentDate)}</td>
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
        </section>
      )}
    </QueryState>
  );
}
