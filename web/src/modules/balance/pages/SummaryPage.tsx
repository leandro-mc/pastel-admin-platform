import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button, Panel, StateView } from "@/core/ui";
import { Amount, BalanceText } from "../components/Amount";
import { ExpenseDialog } from "../components/ExpenseDialog";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useCanWrite } from "../components/useCanWrite";
import { useBalances, useGroup, useParticipants, useSettlement } from "../api/queries";
import { messageFor } from "../lib/errors";
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
  const settlement = useSettlement(groupId);
  const balances = useBalances(groupId);
  const participants = useParticipants(groupId);
  const canWrite = useCanWrite(group.data);
  const [adding, setAdding] = useState(false);
  if (!group.data) return null;
  const g = group.data;
  const base = `/balance/grupos/${groupId}`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title={strings.summary.whoOwes}
        actions={
          canWrite ? (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" className="size-4" />
              {strings.expenses.add}
            </Button>
          ) : undefined
        }
      >
        {settlement.isPending ? (
          <StateView status="loading" title={strings.common.loading} />
        ) : settlement.isError ? (
          <StateView status="error" title={strings.common.loadFailed} description={messageFor(settlement.error)} />
        ) : settlement.data.isSettled ? (
          <p className="text-sm text-muted">{g.expenseCount === 0 ? strings.summary.noExpenses : strings.summary.settled}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {settlement.data.transfers.slice(0, 5).map((t) => (
              <li key={`${t.fromId}-${t.toId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm text-fg">
                <span>
                  <strong>{t.fromName}</strong> {strings.summary.pays} <strong>{t.toName}</strong>
                </span>
                <Amount value={t.amount} code={g.currencyCode} />
              </li>
            ))}
          </ul>
        )}
        <Link to={`${base}/liquidar`} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-strong underline-offset-4 hover:underline">
          {strings.summary.seeSettlement}
        </Link>
      </Panel>

      <Panel title={strings.summary.balances}>
        {balances.isPending ? (
          <StateView status="loading" title={strings.common.loading} />
        ) : balances.isError ? (
          <StateView status="error" title={strings.common.loadFailed} description={messageFor(balances.error)} />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {balances.data.rows.map((row) => (
              <li key={row.participantId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-fg">{row.displayName}</span>
                <BalanceText value={row.balance} code={g.currencyCode} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {adding && participants.data ? (
        <ExpenseDialog groupId={groupId} group={g} participants={participants.data} onClose={() => setAdding(false)} />
      ) : null}
    </div>
  );
}
