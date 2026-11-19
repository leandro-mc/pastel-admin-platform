import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/core/auth";
import { Badge, SelectField, StateView, TextField } from "@/core/ui";
import { primaryButton } from "@/core/ui/styles";
import { useEditorialArticles } from "../../api/queries";
import type { ArticleStatus } from "../../api/schemas";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState, Pager } from "../../components/Feedback";
import { SealBadge } from "../../components/SealBadge";
import { formatDate } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPaths } from "../../paths";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const statusLabel: Record<ArticleStatus, string> = {
  draft: strings.editorial.status.draft,
  published: strings.editorial.status.published,
  archived: strings.editorial.status.archived,
};

/** Piezas del panel editorial. Quien solo revisa (sin gestionar contenido) pasa directo a la cola de revisión. */
export function Component() {
  useDocumentTitle(strings.editorial.title);
  const auth = useAuth();
  if (
    auth.status === "authenticated" &&
    !auth.hasPermission(agoraPermissions.manage) &&
    auth.hasPermission(agoraPermissions.review)
  ) {
    return <Navigate to={agoraPaths.review} replace />;
  }

  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={strings.editorial.nav.pieces}
      description={strings.editorial.description}
      actions={
        <Link to={agoraPaths.editorialNew} className={primaryButton}>
          {strings.editorial.list.newPiece}
        </Link>
      }
    >
      <PieceList />
    </EditorialShell>
  );
}

function PieceList() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const articles = useEditorialArticles({ status, q, page });

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={strings.editorial.list.statusFilter}
          value={status}
          options={[
            { value: "", label: strings.editorial.list.allStatuses },
            { value: "draft", label: strings.editorial.status.draft },
            { value: "published", label: strings.editorial.status.published },
            { value: "archived", label: strings.editorial.status.archived },
          ]}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          label={strings.editorial.list.search}
          type="search"
          value={q}
          maxLength={100}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {articles.isPending ? <LoadingState /> : null}
      {articles.isError ? (
        <LoadError error={articles.error} onRetry={() => void articles.refetch()} />
      ) : null}
      {articles.data && articles.data.items.length === 0 ? (
        <StateView
          status="empty"
          title={status || q ? strings.editorial.list.empty : strings.editorial.list.emptyAll}
        />
      ) : null}
      {articles.data && articles.data.items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {articles.data.items.map((item) => (
            <li
              key={item.card.id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === "published" ? "success" : "neutral"}>
                  {statusLabel[item.status]}
                </Badge>
                {item.status === "published" ? <SealBadge seal={item.card.seal} compact /> : null}
                {item.dailyPickOrder !== null ? (
                  <Badge variant="accent">
                    {strings.editorial.list.pickBadge(item.dailyPickOrder)}
                  </Badge>
                ) : null}
                {item.openErrorReports > 0 ? (
                  <Badge variant="warning">
                    {strings.editorial.list.openReports(item.openErrorReports)}
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-lg font-bold tracking-tight text-fg">
                <Link
                  to={agoraPaths.editorialArticle(item.card.id)}
                  className="hover:underline focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
                >
                  {item.card.title}
                </Link>
              </h2>
              <p className="text-xs text-muted">
                {[item.card.categoryName, strings.editorial.list.updated(formatDate(item.updatedAt))].join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {articles.data ? (
        <Pager page={articles.data.page} totalPages={articles.data.totalPages} onPage={setPage} />
      ) : null}
    </>
  );
}
