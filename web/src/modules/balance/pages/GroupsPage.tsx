import { useState } from "react";
import { Link } from "react-router";
import { Plus, UserPlus } from "lucide-react";
import { Badge, Button, PageHeader, SelectField, StateView, TextField } from "@/core/ui";
import { primaryButton, secondaryButton } from "@/core/ui/styles";
import { BalanceText, Amount } from "../components/Amount";
import { useGroups } from "../api/queries";
import { messageFor } from "../lib/errors";
import { strings } from "../strings";

/** Mis grupos: lista con búsqueda y filtro por estado, y mi situación en cada uno. */
export function Component() {
  const groups = useGroups();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const items = (groups.data?.items ?? []).filter(
    (g) =>
      g.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (status === "all" || (status === "closed") === g.isClosed),
  );

  return (
    <div data-module="balance" className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title={strings.groups.title}
        description={strings.tagline}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/balance/unirse" className={secondaryButton}>
              <UserPlus aria-hidden="true" className="size-4" />
              {strings.groups.join}
            </Link>
            <Link to="/balance/grupos/nuevo" className={primaryButton}>
              <Plus aria-hidden="true" className="size-4" />
              {strings.groups.create}
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <TextField
          label={strings.groups.search}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectField
          label={strings.groups.status}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "all", label: strings.groups.statusAll },
            { value: "open", label: strings.groups.statusOpen },
            { value: "closed", label: strings.groups.statusClosed },
          ]}
        />
      </div>

      {groups.isPending ? (
        <StateView status="loading" title={strings.common.loading} />
      ) : groups.isError ? (
        <StateView
          status="error"
          title={strings.groups.loadFailed}
          description={messageFor(groups.error)}
          action={<Button onClick={() => void groups.refetch()}>{strings.common.retry}</Button>}
        />
      ) : groups.data.items.length === 0 ? (
        <StateView
          status="empty"
          title={strings.groups.emptyTitle}
          description={strings.groups.emptyHint}
          action={
            <Link to="/balance/grupos/nuevo" className={primaryButton}>
              {strings.groups.create}
            </Link>
          }
        />
      ) : items.length === 0 ? (
        <StateView status="empty" title={strings.groups.noMatches} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.id}>
              <Link
                to={`/balance/grupos/${g.id}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-line-strong hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-fg">{g.name}</h2>
                  <div className="flex gap-1.5">
                    {g.isClosed ? <Badge variant="neutral">{strings.group.closedBadge}</Badge> : null}
                    <Badge variant={g.myRole === "admin" ? "accent" : "neutral"}>
                      {g.myRole === "admin" ? strings.people.admin : strings.people.member}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted">
                  {strings.groups.people(g.participantCount)} · {strings.groups.total}{" "}
                  <Amount value={g.total} code={g.currencyCode} withCode />
                </p>
                <p className="text-base">
                  <BalanceText value={g.myBalance} code={g.currencyCode} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
