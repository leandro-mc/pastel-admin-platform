import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { PageHeader, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { useSeasons, useShipments } from "../api/queries";
import { Pager } from "../components/Pager";
import { QueryState } from "../components/QueryState";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatKg } from "../format";
import { cosechaPaths, cosechaPermissions } from "../paths";
import { strings } from "../strings";
import { pageClass, primaryButton, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.shipments;

/** Lista de envíos con lo que falta registrar de cada uno. */
export function Component() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(cosechaPermissions.shipmentsManage);
  const seasons = useSeasons();
  const [seasonId, setSeasonId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const season = seasonId || seasons.data?.find((item) => item.status === "Active")?.id || "";
  const shipments = useShipments({ page, pageSize: 20, seasonId: season, status, from, to });

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          canManage ? (
            <Link to={cosechaPaths.newShipment} className={primaryButton}>
              <Plus aria-hidden="true" className="size-4" />
              {t.newButton}
            </Link>
          ) : undefined
        }
      />
      <Panel>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label={strings.common.season}
            value={season}
            placeholder={strings.common.noSeason}
            onChange={(event) => {
              setPage(1);
              setSeasonId(event.target.value);
            }}
            options={(seasons.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <SelectField
            label={t.filters.status}
            value={status}
            placeholder={strings.common.all}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            options={Object.entries(strings.status.shipment).map(([value, label]) => ({ value, label }))}
          />
          <TextField
            type="date"
            label={t.filters.from}
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
          />
          <TextField
            type="date"
            label={t.filters.to}
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
          />
        </div>
        <QueryState query={shipments}>
          {(data) =>
            data.items.length === 0 ? (
              <StateView status="empty" title={status || from || to ? t.empty : t.emptyFirst} />
            ) : (
              <>
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        <th className={th}>{t.columns.date}</th>
                        <th className={th}>{t.columns.status}</th>
                        <th className={thNumber}>{t.columns.orders}</th>
                        <th className={thNumber}>{t.columns.target}</th>
                        <th className={thNumber}>{t.columns.requested}</th>
                        <th className={thNumber}>{t.columns.received}</th>
                        <th className={thNumber}>{t.columns.delivered}</th>
                        <th className={th}>{t.columns.pending}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((shipment) => (
                        <tr key={shipment.id}>
                          <td className={td}>
                            <Link
                              to={cosechaPaths.shipment(shipment.id)}
                              className="font-medium text-accent-strong underline-offset-2 hover:underline"
                            >
                              {formatDate(shipment.shipmentDate)}
                            </Link>
                          </td>
                          <td className={td}>
                            <StatusBadge kind="shipment" value={shipment.status} />
                          </td>
                          <td className={tdNumber}>{shipment.orderCount}</td>
                          <td className={tdNumber}>{formatKg(shipment.targetKg)}</td>
                          <td className={tdNumber}>{formatKg(shipment.requestedKg)}</td>
                          <td className={tdNumber}>{formatKg(shipment.receivedKg)}</td>
                          <td className={tdNumber}>{formatKg(shipment.deliveredKg)}</td>
                          <td className={td}>
                            {t.pendingBadge(shipment.pendingReceptions, shipment.pendingDeliveries)}
                          </td>
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
