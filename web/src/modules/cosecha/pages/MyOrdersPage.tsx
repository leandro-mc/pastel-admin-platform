import { useState } from "react";
import { Link } from "react-router";
import { PageHeader, Panel, StateView } from "@/core/ui";
import { useMyOrders } from "../api/queries";
import { Pager } from "../components/Pager";
import { QueryState } from "../components/QueryState";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg } from "../format";
import { cosechaPaths } from "../paths";
import { strings } from "../strings";
import { pageClass, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.orders.mine;

/** Vista del comprador: sus pedidos y su avance. Nunca muestra datos de otros compradores ni de productores. */
export function Component() {
  const [page, setPage] = useState(1);
  const orders = useMyOrders({ page, pageSize: 20 });
  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader title={t.title} description={t.description} />
      <Panel>
        <QueryState query={orders}>
          {(data) =>
            data.items.length === 0 ? (
              <StateView status="empty" title={t.empty} />
            ) : (
              <>
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th className={th}>{t.requiredOn}</th>
                        <th className={th}>{t.status}</th>
                        <th className={thNumber}>{t.ordered}</th>
                        <th className={thNumber}>{t.delivered}</th>
                        <th className={thNumber}>{t.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((order) => (
                        <tr key={order.id}>
                          <td className={td}>
                            <Link
                              to={cosechaPaths.myOrder(order.id)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {formatDate(order.requiredOn)}
                            </Link>
                          </td>
                          <td className={td}>
                            <StatusBadge kind="progress" value={order.progress} />
                          </td>
                          <td className={tdNumber}>{formatKg(order.orderedKg)}</td>
                          <td className={tdNumber}>{formatKg(order.deliveredKg)}</td>
                          <td className={tdNumber}>{formatCrc(order.totalCrc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
              </>
            )
          }
        </QueryState>
      </Panel>
    </section>
  );
}
