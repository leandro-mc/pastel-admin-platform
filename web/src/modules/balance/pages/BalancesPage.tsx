import { Panel, StateView } from "@/core/ui";
import { Amount, BalanceText } from "../components/Amount";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useBalances } from "../api/queries";
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
  const balances = useBalances(groupId);
  if (balances.isPending) return <StateView status="loading" title={strings.common.loading} />;
  if (balances.isError) {
    return <StateView status="error" title={strings.common.loadFailed} description={messageFor(balances.error)} />;
  }
  const b = balances.data;
  const extra = Number(b.extraUnits);

  return (
    <Panel title={strings.balances.title} description={strings.balances.description}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">{strings.balances.caption}</caption>
          <thead>
            <tr className="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">{strings.balances.person}</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">{strings.balances.paid}</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">{strings.balances.share}</th>
              <th scope="col" className="py-2 text-right font-medium">{strings.balances.balance}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.rows.map((row) => (
              <tr key={row.participantId}>
                <th scope="row" className="py-2 pr-3 font-medium text-fg">{row.displayName}</th>
                <td className="py-2 pr-3 text-right"><Amount value={row.paid} code={b.currencyCode} /></td>
                <td className="py-2 pr-3 text-right"><Amount value={row.share} code={b.currencyCode} /></td>
                <td className="py-2 text-right"><BalanceText value={row.balance} code={b.currencyCode} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong font-semibold text-fg">
              <th scope="row" className="py-2 pr-3">{strings.balances.total}</th>
              <td className="py-2 pr-3 text-right"><Amount value={b.total} code={b.currencyCode} withCode /></td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {extra > 0 ? <p className="mt-3 text-sm text-muted">{strings.balances.extraNote(extra)}</p> : null}
    </Panel>
  );
}
