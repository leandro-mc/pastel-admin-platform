import { Panel } from "@/core/ui";
import type { Change } from "../api/schemas";
import { formatDateTime } from "../format";
import { strings } from "../strings";
import { table, tableScroll, td, th } from "../styles";

const t = strings.common;

/** Registro de cambios de cantidades y precios: qué cambió, antes y después, nota y quién. */
export function ChangesList({ changes }: { changes: readonly Change[] }) {
  return (
    <Panel title={t.changesTitle}>
      {changes.length === 0 ? (
        <p className="text-sm text-muted">{t.changesEmpty}</p>
      ) : (
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>{t.changeWhen}</th>
                <th className={th}>{t.changeWhat}</th>
                <th className={th}>{t.changeValues}</th>
                <th className={th}>{t.changeNote}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change, index) => (
                <tr key={`${change.entityId}-${change.changedAt}-${index}`}>
                  <td className={td}>
                    {t.changeBy(change.changedByName, formatDateTime(change.changedAt))}
                  </td>
                  <td className={td}>{change.field}</td>
                  <td className={td}>{t.changeFrom(change.oldValue, change.newValue)}</td>
                  <td className={td}>{change.note ?? t.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
