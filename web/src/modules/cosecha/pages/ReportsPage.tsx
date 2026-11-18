import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { Button, PageHeader, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { toQuery } from "../api/keys";
import { useReport, useSeasons } from "../api/queries";
import type { Report } from "../api/schemas";
import { QueryState } from "../components/QueryState";
import { statusLabel } from "../components/StatusBadge";
import { formatCrc, formatDate, formatNumber } from "../format";
import { API } from "../paths";
import { strings } from "../strings";
import { pageClass, secondaryButton, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.reports;

type Column = Report["columns"][number];
type Cell = Report["rows"][number][number];

function cellText(column: Column, value: Cell): string {
  if (value === null) return strings.common.none;
  if (typeof value === "boolean") return value ? strings.common.yes : strings.common.no;
  if (typeof value === "number") return column.kind === "money" ? formatCrc(value) : formatNumber(value);
  if (column.kind === "date") return formatDate(value);
  if (column.key === "status") return statusLabel("shipment", value);
  return value;
}

/** Reportes del gestor: tabla en pantalla, CSV para Excel e impresión. Solo con permiso de reportes. */
export function Component() {
  const seasons = useSeasons();
  const [kind, setKind] = useState("shipments");
  const [seasonId, setSeasonId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { seasonId, from, to };
  const report = useReport(kind, params);
  const csv = `${API}/reports/${kind}/csv${toQuery(params)}`;
  const seasonName = seasons.data?.find((item) => item.id === seasonId)?.name ?? t.allSeasons;

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={csv} download className={secondaryButton}>
              <Download aria-hidden="true" className="mr-1 size-4" />
              {t.downloadCsv}
            </a>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="mr-1 size-4" />
              {t.print}
            </Button>
          </div>
        }
      />
      <Panel>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <SelectField
            label={t.kind}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            options={Object.entries(t.kinds).map(([value, label]) => ({ value, label }))}
          />
          <SelectField
            label={strings.common.season}
            value={seasonId}
            placeholder={t.allSeasons}
            onChange={(event) => setSeasonId(event.target.value)}
            options={(seasons.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <TextField type="date" label={t.from} value={from} onChange={(event) => setFrom(event.target.value)} />
          <TextField type="date" label={t.to} value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <p className="text-xs text-muted print:hidden">{t.csvHint}</p>
        <QueryState query={report}>
          {(data) => (
            <>
              <div>
                <h2 className="text-lg font-semibold text-fg">{data.title}</h2>
                <p className="text-sm text-muted">{t.generatedFor(seasonName)}</p>
              </div>
              {data.rows.length === 0 ? (
                <StateView status="empty" title={t.empty} />
              ) : (
                <div className={tableScroll}>
                  <table className={table}>
                    <thead>
                      <tr>
                        {data.columns.map((column) => (
                          <th
                            key={column.key}
                            className={column.kind === "number" || column.kind === "money" ? thNumber : th}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {data.columns.map((column, index) => (
                            <td
                              key={column.key}
                              className={column.kind === "number" || column.kind === "money" ? tdNumber : td}
                            >
                              {cellText(column, row[index] ?? null)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </QueryState>
      </Panel>
    </section>
  );
}
