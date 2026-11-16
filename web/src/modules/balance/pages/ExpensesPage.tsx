import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, Button, ConfirmDialog, Panel, SelectField, StateView, TextField } from "@/core/ui";
import { Amount } from "../components/Amount";
import { ExpenseDialog } from "../components/ExpenseDialog";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useCanWrite } from "../components/useCanWrite";
import { useDeleteExpense } from "../api/mutations";
import { useExpenses, useGroup, useParticipants } from "../api/queries";
import type { ExpenseFilters } from "../api/keys";
import type { Expense } from "../api/schemas";
import { messageFor } from "../lib/errors";
import { strings } from "../strings";

const emptyFilters: ExpenseFilters = { page: 1, q: "", payerId: "", from: "", to: "", order: "date_desc" };

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
  const participants = useParticipants(groupId);
  const canWrite = useCanWrite(group.data);
  const [filters, setFilters] = useState(emptyFilters);
  const expenses = useExpenses(groupId, filters);
  const remove = useDeleteExpense(groupId);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  if (!group.data) return null;
  const g = group.data;
  const set = (patch: Partial<ExpenseFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const filtered = filters.q !== "" || filters.payerId !== "" || filters.from !== "" || filters.to !== "";

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={strings.expenses.title}
        actions={
          canWrite ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" className="size-4" />
              {strings.expenses.add}
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <TextField label={strings.expenses.search} type="search" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
          <SelectField
            label={strings.expenses.payer}
            value={filters.payerId}
            onChange={(e) => set({ payerId: e.target.value })}
            placeholder={strings.expenses.anyone}
            options={(participants.data ?? []).map((p) => ({ value: p.id, label: p.displayName }))}
          />
          <TextField label={strings.expenses.from} type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
          <TextField label={strings.expenses.to} type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
          <SelectField
            label={strings.expenses.order}
            value={filters.order}
            onChange={(e) => set({ order: e.target.value })}
            options={[
              { value: "date_desc", label: strings.expenses.orderNewest },
              { value: "date_asc", label: strings.expenses.orderOldest },
              { value: "amount_desc", label: strings.expenses.orderHighest },
              { value: "amount_asc", label: strings.expenses.orderLowest },
            ]}
          />
        </div>
        {filtered ? (
          <Button variant="ghost" className="mt-2" onClick={() => setFilters(emptyFilters)}>
            {strings.expenses.clearFilters}
          </Button>
        ) : null}
      </Panel>

      {remove.error ? <Alert variant="error" message={messageFor(remove.error)} /> : null}

      {expenses.isPending ? (
        <StateView status="loading" title={strings.common.loading} />
      ) : expenses.isError ? (
        <StateView
          status="error"
          title={strings.common.loadFailed}
          description={messageFor(expenses.error)}
          action={<Button onClick={() => void expenses.refetch()}>{strings.common.retry}</Button>}
        />
      ) : expenses.data.items.length === 0 ? (
        <StateView status="empty" title={filtered ? strings.expenses.noMatches : strings.expenses.empty} description={filtered ? undefined : strings.expenses.emptyHint} />
      ) : (
        <>
          <p className="text-sm text-muted">
            {strings.expenses.count(expenses.data.total)} · {strings.expenses.sum}{" "}
            <strong className="text-fg">
              <Amount value={expenses.data.totalAmount} code={g.currencyCode} withCode />
            </strong>
          </p>
          <ul className="flex flex-col gap-2">
            {expenses.data.items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="min-w-0">
                  <p className="font-medium break-words text-fg">{e.description}</p>
                  <p className="text-sm text-muted">
                    {strings.expenses.paidBy(e.payerName)} · {e.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-fg">
                    <Amount value={e.amount} code={g.currencyCode} />
                  </span>
                  {e.canEdit && canWrite ? (
                    <>
                      <Button variant="ghost" aria-label={strings.expenses.editAria(e.description)} onClick={() => setEditing(e)}>
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button variant="ghost" aria-label={strings.expenses.deleteAria(e.description)} onClick={() => setDeleting(e)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" disabled={filters.page <= 1} onClick={() => set({ page: filters.page - 1 })}>
              {strings.common.previous}
            </Button>
            <span className="text-sm text-muted">{strings.expenses.page(expenses.data.page, Math.max(1, Math.ceil(expenses.data.total / expenses.data.pageSize)))}</span>
            <Button variant="secondary" disabled={filters.page * expenses.data.pageSize >= expenses.data.total} onClick={() => set({ page: filters.page + 1 })}>
              {strings.common.next}
            </Button>
          </div>
        </>
      )}

      {editing && participants.data ? (
        <ExpenseDialog
          groupId={groupId}
          group={g}
          participants={participants.data}
          expense={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={strings.expenses.deleteTitle}
          message={strings.expenses.deleteMessage(deleting.description)}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          pendingLabel={strings.common.deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate({ id: deleting.id, version: deleting.version }, { onSettled: () => setDeleting(null) })}
        />
      ) : null}
    </div>
  );
}
