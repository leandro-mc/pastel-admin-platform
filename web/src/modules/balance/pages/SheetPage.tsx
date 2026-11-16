import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Alert, Button, Panel, StateView } from "@/core/ui";
import { inputClass, selectClass } from "@/core/ui/styles";
import { isApiError } from "@/core/api";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useCurrencyInfo } from "../components/Amount";
import { useCanWrite } from "../components/useCanWrite";
import { useSaveSheet, type SheetRowInput } from "../api/mutations";
import { useGroup, useParticipants, useSheet } from "../api/queries";
import type { Expense } from "../api/schemas";
import { messageFor } from "../lib/errors";
import { parseAmount } from "../lib/money";
import { strings } from "../strings";

type Field = "payerId" | "description" | "amount" | "date";
type Row = {
  key: string;
  id: string | null;
  version: number;
  payerId: string;
  description: string;
  amount: string;
  date: string;
  deleted: boolean;
  original: Pick<Row, Field> | null;
};

let counter = 0;
const nextKey = () => `row-${++counter}`;

function fromExpense(e: Expense): Row {
  const values = { payerId: e.payerId, description: e.description, amount: e.amount.replace(".", ","), date: e.date };
  return { key: e.id, id: e.id, version: e.version, ...values, deleted: false, original: values };
}

const isBlank = (r: Row) => r.description.trim() === "" && r.amount.trim() === "";
const isChanged = (r: Row) =>
  r.id === null ? !isBlank(r) : r.original !== null && (["payerId", "description", "amount", "date"] as const).some((f) => r[f] !== r.original?.[f]);

/** «dd/mm/aaaa» o «aaaa-mm-dd» → «aaaa-mm-dd»; si no se entiende, usa el valor de respaldo. */
function normalizeDate(text: string, fallback: string): string {
  const t = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  return m ? `${m[3]}-${(m[2] ?? "").padStart(2, "0")}-${(m[1] ?? "").padStart(2, "0")}` : fallback;
}

export function Component() {
  const groupId = useGroupId();
  return (
    <GroupFrame groupId={groupId}>
      <Content groupId={groupId} />
    </GroupFrame>
  );
}

function Content({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const people = useParticipants(groupId);
  const sheet = useSheet(groupId);
  const save = useSaveSheet(groupId);
  const canWrite = useCanWrite(group.data);
  const currency = useCurrencyInfo(group.data?.currencyCode ?? "CRC");
  const [draft, setDraft] = useState<Row[]>([]);
  const [paste, setPaste] = useState("");
  const [errors, setErrors] = useState<Record<string, Partial<Record<Field, string>>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  // El borrador se reinicia con lo que hay guardado (al cargar, tras guardar o al descartar).
  useEffect(() => {
    if (sheet.data) setDraft(sheet.data.rows.map(fromExpense));
  }, [sheet.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sheet.isPending || group.isPending || people.isPending) return <StateView status="loading" title={strings.common.loading} />;
  if (sheet.isError || group.isError || people.isError) {
    return <StateView status="error" title={strings.common.loadFailed} description={messageFor(sheet.error ?? group.error ?? people.error)} />;
  }

  const g = group.data;
  const dirty = draft.some((r) => (r.deleted && r.id !== null) || (!r.deleted && isChanged(r)));
  const update = (key: string, patch: Partial<Row>) => setDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const blank = (): Row => ({ key: nextKey(), id: null, version: 0, payerId: g.myParticipantId, description: "", amount: "", date: g.today, deleted: false, original: null });

  function addPasted() {
    const lines = paste.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 200);
    const rows = lines.map((line) => {
      const [description = "", amount = "", date = "", payer = ""] = line.split("\t");
      const match = people.data?.find((p) => p.displayName.toLowerCase() === payer.trim().toLowerCase());
      return { ...blank(), description: description.trim(), amount: amount.trim(), date: normalizeDate(date, g.today), payerId: g.myRole === "admin" && match ? match.id : g.myParticipantId };
    });
    setDraft((current) => [...rows, ...current]);
    setPaste("");
  }

  function submit() {
    const local: Record<string, Partial<Record<Field, string>>> = {};
    const toSend = draft.filter((r) => !r.deleted && isChanged(r));
    const payload: SheetRowInput[] = [];
    for (const r of toSend) {
      const parsed = parseAmount(r.amount, currency.decimals);
      const rowErrors: Partial<Record<Field, string>> = {};
      const text = r.description.trim();
      if (text.length < 4 || text.length > 500) rowErrors.description = strings.expense.descriptionRule;
      if (!parsed.ok) rowErrors.amount = strings.amount[parsed.code](currency.decimals);
      if (!r.date) rowErrors.date = strings.expense.dateRule;
      if (Object.keys(rowErrors).length > 0 || !parsed.ok) local[r.key] = rowErrors;
      else payload.push({ id: r.id, payerId: r.payerId, description: text, amount: parsed.value, date: r.date, version: r.version });
    }
    setErrors(local);
    setSaved(null);
    if (Object.keys(local).length > 0) return;
    const deletedIds = draft.filter((r) => r.deleted && r.id !== null).map((r) => r.id as string);
    save.mutate(
      { rows: payload, deletedIds },
      {
        onSuccess: (result) => setSaved(strings.sheet.saved(result.created, result.updated, result.deleted)),
        onError: (error) => {
          if (!isApiError(error)) return;
          const mapped: Record<string, Partial<Record<Field, string>>> = {};
          for (const [path, messages] of Object.entries(error.errors)) {
            const m = /^rows\.(\d+)\.(\w+)$/.exec(path);
            const row = m ? toSend[Number(m[1])] : undefined;
            if (m && row) mapped[row.key] = { ...mapped[row.key], [m[2] as Field]: messages[0] };
          }
          setErrors(mapped);
        },
      },
    );
  }

  const cell = "p-1 align-top";

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info" message={sheet.data.canChoosePayer ? strings.sheet.noticeAdmin : strings.sheet.noticeMember} />
      {!canWrite ? <Alert variant="warning" message={g.isClosed ? strings.sheet.readOnlyClosed : strings.sheet.readOnly} /> : null}
      {save.error && !(isApiError(save.error) && save.error.isValidation) ? <Alert variant="error" message={messageFor(save.error)} /> : null}
      {save.error && isApiError(save.error) && save.error.isValidation ? <Alert variant="error" message={strings.sheet.fixErrors} /> : null}
      {saved ? <Alert variant="success" message={saved} /> : null}

      <Panel
        title={strings.sheet.title}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDraft((rows) => [blank(), ...rows])}>
                <Plus aria-hidden="true" className="size-4" />
                {strings.sheet.addRow}
              </Button>
              <Button variant="ghost" disabled={!dirty} onClick={() => { setDraft(sheet.data.rows.map(fromExpense)); setErrors({}); setSaved(null); }}>
                <RotateCcw aria-hidden="true" className="size-4" />
                {strings.sheet.discard}
              </Button>
              <Button disabled={!dirty} loading={save.isPending} loadingLabel={strings.common.saving} onClick={submit}>
                {strings.sheet.saveAll}
              </Button>
            </div>
          ) : undefined
        }
      >
        {draft.length === 0 ? (
          <p className="text-sm text-muted">{strings.sheet.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">{strings.sheet.caption}</caption>
              <thead>
                <tr className="text-xs tracking-wide text-muted uppercase">
                  <th scope="col" className="p-1 font-medium">{strings.expense.payer}</th>
                  <th scope="col" className="p-1 font-medium">{strings.expense.description}</th>
                  <th scope="col" className="p-1 font-medium">{strings.expense.amount(currency.symbol)}</th>
                  <th scope="col" className="p-1 font-medium">{strings.expense.date}</th>
                  <th scope="col" className="p-1"><span className="sr-only">{strings.sheet.actions}</span></th>
                </tr>
              </thead>
              <tbody>
                {draft.map((r, index) => {
                  const e = errors[r.key] ?? {};
                  const disabled = !canWrite || r.deleted || (r.id !== null && !(sheet.data.rows.find((x) => x.id === r.id)?.canEdit ?? false));
                  const describe = (f: Field) => (e[f] ? `${r.key}-${f}-error` : undefined);
                  return (
                    <tr key={r.key} className={r.deleted ? "opacity-50" : undefined}>
                      <td className={cell}>
                        <select className={selectClass} aria-label={strings.sheet.rowLabel(index + 1, strings.expense.payer)} value={r.payerId} disabled={disabled || !sheet.data.canChoosePayer} onChange={(ev) => update(r.key, { payerId: ev.target.value })}>
                          {people.data.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                        </select>
                      </td>
                      <td className={cell}>
                        <input className={inputClass} aria-label={strings.sheet.rowLabel(index + 1, strings.expense.description)} aria-invalid={Boolean(e.description)} aria-describedby={describe("description")} value={r.description} maxLength={500} disabled={disabled} onChange={(ev) => update(r.key, { description: ev.target.value })} />
                        {e.description ? <p id={`${r.key}-description-error`} className="mt-1 text-xs text-danger">{e.description}</p> : null}
                      </td>
                      <td className={cell}>
                        <input className={inputClass} inputMode="decimal" aria-label={strings.sheet.rowLabel(index + 1, strings.expense.amount(currency.symbol))} aria-invalid={Boolean(e.amount)} aria-describedby={describe("amount")} value={r.amount} disabled={disabled} onChange={(ev) => update(r.key, { amount: ev.target.value })} />
                        {e.amount ? <p id={`${r.key}-amount-error`} className="mt-1 text-xs text-danger">{e.amount}</p> : null}
                      </td>
                      <td className={cell}>
                        <input className={inputClass} type="date" aria-label={strings.sheet.rowLabel(index + 1, strings.expense.date)} aria-invalid={Boolean(e.date)} aria-describedby={describe("date")} value={r.date} disabled={disabled} onChange={(ev) => update(r.key, { date: ev.target.value })} />
                        {e.date ? <p id={`${r.key}-date-error`} className="mt-1 text-xs text-danger">{e.date}</p> : null}
                      </td>
                      <td className={cell}>
                        {canWrite && (r.id === null || !disabled || r.deleted) ? (
                          <Button
                            variant="ghost"
                            aria-label={r.deleted ? strings.sheet.undoRemove(index + 1) : strings.sheet.removeRow(index + 1)}
                            onClick={() => (r.id === null ? setDraft((rows) => rows.filter((x) => x.key !== r.key)) : update(r.key, { deleted: !r.deleted }))}
                          >
                            {r.deleted ? <RotateCcw aria-hidden="true" className="size-4" /> : <Trash2 aria-hidden="true" className="size-4" />}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {canWrite ? (
        <Panel title={strings.sheet.pasteTitle} description={strings.sheet.pasteHint} headingLevel="h3">
          <label htmlFor="sheet-paste" className="sr-only">{strings.sheet.pasteTitle}</label>
          <textarea id="sheet-paste" rows={4} className={`${inputClass} py-2`} value={paste} onChange={(ev) => setPaste(ev.target.value)} />
          <Button variant="secondary" className="mt-2" disabled={paste.trim() === ""} onClick={addPasted}>
            {strings.sheet.pasteAdd}
          </Button>
        </Panel>
      ) : null}
    </div>
  );
}
