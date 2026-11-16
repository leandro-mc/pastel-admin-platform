import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Alert, Button, Panel, StateView } from "@/core/ui";
import { Amount } from "../components/Amount";
import { GroupFrame, useGroupId } from "../components/GroupFrame";
import { useSettlement } from "../api/queries";
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
  const settlement = useSettlement(groupId);
  const [copied, setCopied] = useState<string | null>(null);
  if (settlement.isPending) return <StateView status="loading" title={strings.common.loading} />;
  if (settlement.isError) {
    return <StateView status="error" title={strings.common.loadFailed} description={messageFor(settlement.error)} />;
  }
  const s = settlement.data;

  async function copy(key: string, amount: string) {
    try {
      await navigator.clipboard.writeText(amount);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info" message={strings.settle.notice} />
      <Panel title={strings.settle.title} description={strings.settle.description}>
        {s.isSettled ? (
          <StateView status="success" title={strings.settle.settledTitle} description={strings.settle.settledHint} />
        ) : (
          <ol className="flex flex-col gap-2">
            {s.transfers.map((t) => {
              const key = `${t.fromId}-${t.toId}`;
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <span className="text-fg">
                    <strong>{t.fromName}</strong> {strings.settle.paysTo} <strong>{t.toName}</strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base font-semibold text-fg">
                      <Amount value={t.amount} code={s.currencyCode} withCode />
                    </span>
                    <Button variant="secondary" aria-label={strings.settle.copyAria(t.fromName, t.toName)} onClick={() => void copy(key, t.amount.replace(".", ","))}>
                      {copied === key ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                      {copied === key ? strings.common.copied : strings.settle.copy}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
      <Panel title={strings.settle.whyTitle} headingLevel="h3">
        <p className="text-sm leading-relaxed text-muted">{strings.settle.whyText}</p>
      </Panel>
    </div>
  );
}
