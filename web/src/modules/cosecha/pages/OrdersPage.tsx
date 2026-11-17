import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/core/auth";
import { Button, PageHeader, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { useBuyers, useOrders, useSeasons } from "../api/queries";
import { Pager } from "../components/Pager";
import { QueryState } from "../components/QueryState";
import { StatusBadge } from "../components/StatusBadge";
import { formatCrc, formatDate, formatKg } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { pageClass, primaryButton, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.orders;

/** Lista de pedidos de todos los compradores, con filtros. El estado «Parcial» o «Entregado» se deriva de lo entregado. */
export function Component() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.ordersManage);
  const [params] = useSearchParams();
  const seasons = useSeasons();
  const buyers = useBuyers({ page: 1, pageSize: 100, includeArchived: true });
  const [seasonId, setSeasonId] = useState("");
  const [buyerId, setBuyerId] = useState(params.get("buyerId") ?? "");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const season = seasonId || seasons.data?.find((item) => item.status === "Active")?.id || "";
  const orders = useOrders({
    page,
    pageSize: 20,
    seasonId: season,
    buyerId,
    status,
    from,
    to,
    search,
  });
  const reset = () => setPage(1);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    reset();
    setSearch(text);
  };

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          canManage ? (
            <Link to={cosechaPaths.newOrder} className={primaryButton}>
              <Plus aria-hidden="true" className="size-4" />
              {t.newButton}
            </Link>
          ) : undefined
        }
      />
      <Panel>
        <form onSubmit={submit} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label={strings.common.season}
            value={season}
            placeholder={strings.common.noSeason}
            onChange={(event) => {
              reset();
              setSeasonId(event.target.value);
            }}
            options={(seasons.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label={t.filters.buyer}
            value={buyerId}
            placeholder={strings.common.all}
            onChange={(event) => {
              reset();
              setBuyerId(event.target.value);
            }}
            options={(buyers.data?.items ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label={t.filters.status}
            value={status}
            placeholder={strings.common.all}
            onChange={(event) => {
              reset();
              setStatus(event.target.value);
            }}
            options={Object.entries(strings.status.progress).map(([value, label]) => ({ value, label }))}
          />
          <TextField
            label={t.filters.search}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <TextField
            type="date"
            label={t.filters.from}
            value={from}
            onChange={(event) => {
              reset();
              setFrom(event.target.value);
            }}
          />
          <TextField
            type="date"
            label={t.filters.to}
            value={to}
            onChange={(event) => {
              reset();
              setTo(event.target.value);
            }}
          />
          <Button type="submit" variant="secondary" className="sm:self-end">
            {strings.common.search}
          </Button>
        </form>
        <QueryState query={orders}>
          {(data) =>
            data.items.length === 0 ? (
              <StateView status="empty" title={status || buyerId || search || from || to ? t.empty : t.emptyFirst} />
            ) : (
              <>
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th className={th}>{t.columns.requiredOn}</th>
                        <th className={th}>{t.columns.buyer}</th>
                        <th className={th}>{t.columns.status}</th>
                        <th className={thNumber}>{t.columns.ordered}</th>
                        <th className={thNumber}>{t.columns.delivered}</th>
                        <th className={thNumber}>{t.columns.pending}</th>
                        <th className={thNumber}>{t.columns.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((order) => (
                        <tr key={order.id}>
                          <td className={td}>
                            <Link
                              to={cosechaPaths.order(order.id)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {formatDate(order.requiredOn)}
                            </Link>
                          </td>
                          <td className={td}>{order.buyerName}</td>
                          <td className={td}>
                            <StatusBadge kind="progress" value={order.progress} />
                          </td>
                          <td className={tdNumber}>{formatKg(order.orderedKg)}</td>
                          <td className={tdNumber}>{formatKg(order.deliveredKg)}</td>
                          <td className={tdNumber}>{formatKg(order.pendingKg)}</td>
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
