import { useState } from "react";
import { Link } from "react-router";
import { CheckboxField, PageHeader, Panel, SelectField, StateView } from "@/core/ui";
import { useBalances, useSeasons } from "../api/queries";
import { QueryState } from "../components/QueryState";
import { formatCrc, formatDate, formatPhone } from "../format";
import { cosechaPaths } from "../paths";
import { strings } from "../strings";
import { pageClass, table, tableScroll, td, tdNumber, th, thNumber } from "../styles";

const t = strings.settlements;

/** Saldos por productor de una temporada (o de todas). */
export function Component() {
  const seasons = useSeasons();
  const [seasonId, setSeasonId] = useState("");
  const [onlyBalance, setOnlyBalance] = useState(true);
  const balances = useBalances(seasonId);

  return (
    <section data-module="cosecha" className={pageClass}>
      <PageHeader title={t.title} description={t.description} />
      <Panel>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(12rem,18rem)_auto]">
          <SelectField
            label={strings.common.season}
            value={seasonId}
            placeholder={strings.common.all}
            onChange={(event) => setSeasonId(event.target.value)}
            options={(seasons.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <CheckboxField
            label={t.onlyWithBalance}
            checked={onlyBalance}
            onChange={(event) => setOnlyBalance(event.target.checked)}
          />
        </div>
        <QueryState query={balances}>
          {(items) => {
            const shown = onlyBalance ? items.filter((item) => item.balanceCrc > 0) : items;
            if (shown.length === 0) {
              return <StateView status="empty" title={items.length === 0 ? t.empty : t.emptyBalance} />;
            }
            return (
              <div className={tableScroll}>
                <table className={table}>
                  <thead>
                    <tr>
                      <th className={th}>{t.columns.producer}</th>
                      <th className={thNumber}>{t.columns.total}</th>
                      <th className={thNumber}>{t.columns.paid}</th>
                      <th className={thNumber}>{t.columns.balance}</th>
                      <th className={thNumber}>{t.columns.pending}</th>
                      <th className={th}>{t.columns.next}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((item) => (
                      <tr key={item.producerId}>
                        <td className={td}>
                          <Link
                            to={cosechaPaths.settlement(item.producerId)}
                            className="font-medium text-accent-strong underline-offset-2 hover:underline"
                          >
                            {item.producerName}
                          </Link>
                          {item.primaryPhone ? (
                            <span className="ml-2 text-muted">{formatPhone(item.primaryPhone)}</span>
                          ) : null}
                        </td>
                        <td className={tdNumber}>{formatCrc(item.totalCrc)}</td>
                        <td className={tdNumber}>{formatCrc(item.paidCrc)}</td>
                        <td className={`${tdNumber} font-semibold`}>{formatCrc(item.balanceCrc)}</td>
                        <td className={tdNumber}>{item.pendingDeliveries}</td>
                        <td className={td}>{formatDate(item.nextExpectedPaymentDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </QueryState>
      </Panel>
    </section>
  );
}
