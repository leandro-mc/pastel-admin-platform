import type { ReactNode } from "react";
import { Link, NavLink, useParams } from "react-router";
import { Alert, Badge, PageHeader, StateView } from "@/core/ui";
import { useGroup } from "../api/queries";
import { messageFor } from "../lib/errors";
import { strings } from "../strings";
import { Amount, BalanceText } from "./Amount";

export function useGroupId(): string {
  const { groupId } = useParams();
  return groupId ?? "";
}

const tabLink =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-medium text-fg-secondary hover:bg-accent-soft hover:text-fg aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Marco común de un grupo: cabecera, «su situación» y navegación. Quien no es miembro recibe 404 y ve «no encontrado». */
export function GroupFrame({ groupId, children }: { groupId: string; children: ReactNode }) {
  const group = useGroup(groupId);

  if (group.isPending) {
    return <StateView status="loading" title={strings.common.loading} />;
  }
  if (group.isError) {
    return (
      <StateView
        status="error"
        title={strings.group.loadFailed}
        description={messageFor(group.error)}
        action={
          <Link to="/balance" className="text-sm font-medium text-accent-strong underline">
            {strings.group.backToGroups}
          </Link>
        }
      />
    );
  }

  const g = group.data;
  const base = `/balance/grupos/${groupId}`;
  const tabs = [
    { to: base, label: strings.tabs.summary, end: true },
    { to: `${base}/gastos`, label: strings.tabs.expenses },
    { to: `${base}/saldos`, label: strings.tabs.balances },
    { to: `${base}/liquidar`, label: strings.tabs.settle },
    { to: `${base}/personas`, label: strings.tabs.people },
    { to: `${base}/gestion`, label: strings.tabs.sheet },
    ...(g.myRole === "admin" ? [{ to: `${base}/ajustes`, label: strings.tabs.settings }] : []),
  ];

  return (
    <div data-module="balance" className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        eyebrow={strings.group.eyebrow}
        title={g.name}
        description={g.description ?? undefined}
        actions={
          g.isClosed ? <Badge variant="neutral">{strings.group.closedBadge}</Badge> : undefined
        }
      />

      {g.isClosed ? (
        <Alert variant="info" message={strings.group.closedNotice(g.closedDate ?? "")} />
      ) : null}

      <section aria-label={strings.group.situation} className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
        <Stat label={strings.group.paid}>
          <Amount value={g.myPaid} code={g.currencyCode} />
        </Stat>
        <Stat label={strings.group.share}>
          <Amount value={g.myShare} code={g.currencyCode} />
        </Stat>
        <Stat label={strings.group.balance}>
          <BalanceText value={g.myBalance} code={g.currencyCode} />
        </Stat>
        <Stat label={strings.group.total}>
          <Amount value={g.total} code={g.currencyCode} withCode />
        </Stat>
      </section>

      <nav aria-label={strings.group.navLabel} className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 px-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={tabLink}>
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className="text-lg text-fg">{children}</span>
    </div>
  );
}
