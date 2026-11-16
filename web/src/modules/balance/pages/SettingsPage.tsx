import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, ConfirmDialog, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { isApiError } from "@/core/api";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useCanWrite } from "../components/useCanWrite";
import { useChangeCurrency, useDeleteGroup, useSetClosed, useUpdateGroup } from "../api/mutations";
import { useCurrencies, useGroup, useHistory } from "../api/queries";
import type { Group, GroupEvent } from "../api/schemas";
import { fieldError, messageFor } from "../lib/errors";
import { timeZones } from "../lib/timeZones";
import { strings } from "../strings";

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
  if (!group.data) return null;
  if (group.data.myRole !== "admin") {
    return <StateView status="empty" title={strings.settings.adminOnlyTitle} description={strings.settings.adminOnlyHint} />;
  }
  return <AdminSettings groupId={groupId} group={group.data} />;
}

function AdminSettings({ groupId, group }: { groupId: string; group: Group }) {
  const navigate = useNavigate();
  const canWrite = useCanWrite(group);
  const currencies = useCurrencies();
  const update = useUpdateGroup(groupId);
  const changeCurrency = useChangeCurrency(groupId);
  const setClosed = useSetClosed(groupId);
  const remove = useDeleteGroup(groupId);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [timeZone, setTimeZone] = useState(group.timeZone);
  const [currencyCode, setCurrencyCode] = useState(group.currencyCode);
  const [dialog, setDialog] = useState<"currency" | "close" | "reopen" | "delete" | null>(null);
  const [page, setPage] = useState(1);
  const history = useHistory(groupId, page);
  const [saved, setSaved] = useState(false);

  // Cierre y reapertura sí se permiten en un grupo cerrado; el resto de las escrituras no.
  const writable = !group.isClosed;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    update.mutate({ name, description, timeZone, version: group.version }, { onSuccess: () => setSaved(true) });
  }

  const updateGeneral = update.error && !(isApiError(update.error) && update.error.isValidation);

  return (
    <div className="flex flex-col gap-4">
      <Panel title={strings.settings.dataTitle}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {updateGeneral ? <Alert variant="error" message={messageFor(update.error)} /> : null}
          {saved ? <Alert variant="success" message={strings.settings.saved} /> : null}
          <TextField label={strings.newGroup.name} value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} maxLength={200} error={fieldError(update.error, "name")} />
          <TextField label={strings.newGroup.descriptionLabel} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canWrite} maxLength={500} error={fieldError(update.error, "description")} />
          <SelectField
            label={strings.newGroup.timeZone}
            hint={strings.settings.timeZoneHint}
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            disabled={!canWrite}
            error={fieldError(update.error, "timeZone")}
            options={timeZones(group.timeZone).map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }))}
          />
          <p className="text-sm text-muted">{strings.settings.startDate(group.startDate)}</p>
          {canWrite ? (
            <div className="flex justify-end">
              <Button type="submit" loading={update.isPending} loadingLabel={strings.common.saving}>
                {strings.common.save}
              </Button>
            </div>
          ) : null}
        </form>
      </Panel>

      <Panel title={strings.settings.currencyTitle} description={strings.settings.currencyHint}>
        {changeCurrency.error ? <Alert variant="error" message={messageFor(changeCurrency.error)} className="mb-3" /> : null}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <SelectField
              label={strings.newGroup.currency}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              disabled={!canWrite}
              options={(currencies.data ?? []).map((c) => ({ value: c.code, label: `${c.code} · ${c.name} (${c.symbol})` }))}
            />
          </div>
          {canWrite ? (
            <Button variant="secondary" disabled={currencyCode === group.currencyCode} onClick={() => setDialog("currency")}>
              {strings.settings.changeCurrency}
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel title={strings.settings.stateTitle}>
        {setClosed.error ? <Alert variant="error" message={messageFor(setClosed.error)} className="mb-3" /> : null}
        <p className="mb-3 text-sm text-muted">{group.isClosed ? strings.settings.closedText : strings.settings.openText}</p>
        <Button variant="secondary" onClick={() => setDialog(group.isClosed ? "reopen" : "close")}>
          {group.isClosed ? strings.settings.reopen : strings.settings.close}
        </Button>
      </Panel>

      <Panel title={strings.settings.deleteTitle} description={strings.settings.deleteHint}>
        {remove.error ? <Alert variant="error" message={messageFor(remove.error)} className="mb-3" /> : null}
        {group.expenseCount > 0 ? <p className="mb-3 text-sm text-muted">{strings.settings.deleteBlocked}</p> : null}
        <Button variant="danger" disabled={group.expenseCount > 0 || !writable} onClick={() => setDialog("delete")}>
          {strings.settings.delete}
        </Button>
      </Panel>

      <Panel title={strings.settings.historyTitle} description={strings.settings.historyHint}>
        {history.isPending ? (
          <p className="text-sm text-muted">{strings.common.loading}</p>
        ) : history.isError ? (
          <Alert variant="error" message={messageFor(history.error)} />
        ) : history.data.items.length === 0 ? (
          <p className="text-sm text-muted">{strings.settings.historyEmpty}</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {history.data.items.map((event) => (
                <li key={event.id} className="py-2 text-sm">
                  <p className="text-fg">
                    <strong>{event.actorName}</strong> {describeEvent(event)}
                  </p>
                  <p className="text-xs text-muted">{new Date(event.occurredAt).toLocaleString("es-CR")}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{strings.common.previous}</Button>
              <span className="text-sm text-muted">{strings.expenses.page(page, Math.max(1, Math.ceil(history.data.total / history.data.pageSize)))}</span>
              <Button variant="secondary" disabled={page * history.data.pageSize >= history.data.total} onClick={() => setPage(page + 1)}>{strings.common.next}</Button>
            </div>
          </>
        )}
      </Panel>

      {dialog === "currency" ? (
        <ConfirmDialog
          title={strings.settings.currencyConfirmTitle}
          message={strings.settings.currencyConfirm(group.currencyCode, currencyCode)}
          confirmLabel={strings.settings.changeCurrency}
          cancelLabel={strings.common.cancel}
          pending={changeCurrency.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => changeCurrency.mutate(currencyCode, { onSettled: () => setDialog(null) })}
        />
      ) : null}
      {dialog === "close" || dialog === "reopen" ? (
        <ConfirmDialog
          title={dialog === "close" ? strings.settings.closeConfirmTitle : strings.settings.reopenConfirmTitle}
          message={dialog === "close" ? strings.settings.closeConfirm : strings.settings.reopenConfirm}
          confirmLabel={dialog === "close" ? strings.settings.close : strings.settings.reopen}
          cancelLabel={strings.common.cancel}
          pending={setClosed.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => setClosed.mutate(dialog === "close", { onSettled: () => setDialog(null) })}
        />
      ) : null}
      {dialog === "delete" ? (
        <ConfirmDialog
          title={strings.settings.deleteConfirmTitle}
          message={strings.settings.deleteConfirm(group.name)}
          confirmLabel={strings.settings.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => remove.mutate(undefined, { onSuccess: () => void navigate("/balance"), onSettled: () => setDialog(null) })}
        />
      ) : null}
    </div>
  );
}

/** Texto legible de un hecho del historial. Los detalles son datos mínimos; si no se pueden leer, se muestra solo el hecho. */
function describeEvent(event: GroupEvent): string {
  const label = strings.history.kinds[event.kind as keyof typeof strings.history.kinds] ?? event.kind;
  let detail = "";
  try {
    const d = (event.detailsJson ? JSON.parse(event.detailsJson) : {}) as Record<string, unknown>;
    const text = (key: string) => (typeof d[key] === "string" ? (d[key] as string) : "");
    if (event.kind.startsWith("expense.")) {
      const after = (d.after ?? d) as Record<string, unknown>;
      detail = `${String(after.description ?? "")} (${String(after.amount ?? "")})`;
    } else if (event.kind === "participant.role_changed") detail = `${text("name")}: ${text("from")} → ${text("to")}`;
    else if (event.kind.startsWith("participant.")) detail = text("name");
    else if (event.kind === "group.currency_changed") detail = `${text("from")} → ${text("to")}`;
  } catch {
    detail = "";
  }
  return detail.trim() ? `${label}: ${detail}` : label;
}
