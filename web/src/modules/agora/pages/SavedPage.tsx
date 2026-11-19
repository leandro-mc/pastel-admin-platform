import { useState } from "react";
import { Link } from "react-router";
import { Alert, PageHeader, StateView } from "@/core/ui";
import { primaryButton } from "@/core/ui/styles";
import { useAuth } from "@/core/auth";
import { loginPath } from "@/core/routes";
import { useSaved } from "../api/queries";
import { ArticleCard } from "../components/ArticleCard";
import { AgoraPage, LoadError, LoadingState, Pager } from "../components/Feedback";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { agoraPaths } from "../paths";
import { agoraPermissions } from "../permissions";
import { strings } from "../strings";

/** Guardados de la persona con sesión. Una persona anónima ve cómo iniciar sesión; el contenido público no lo exige. */
export function Component() {
  useDocumentTitle(strings.saved.title);
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const allowed =
    auth.status === "authenticated" && auth.hasPermission(agoraPermissions.saved);
  const saved = useSaved(page, { enabled: allowed });

  return (
    <AgoraPage>
      <PageHeader title={strings.saved.title} description={strings.saved.description} />

      {auth.status === "loading" ? <LoadingState /> : null}

      {auth.status === "anonymous" ? (
        <StateView
          status="empty"
          title={strings.saved.loginTitle}
          description={strings.saved.loginDescription}
          action={
            <Link to={loginPath(agoraPaths.saved)} className={primaryButton}>
              {strings.common.signIn}
            </Link>
          }
        />
      ) : null}

      {auth.status === "authenticated" && !allowed ? (
        <Alert variant="info" message={strings.common.noPermission} />
      ) : null}

      {allowed && saved.isPending ? <LoadingState /> : null}
      {allowed && saved.isError ? (
        <LoadError error={saved.error} onRetry={() => void saved.refetch()} />
      ) : null}
      {saved.data && saved.data.items.length === 0 ? (
        <StateView
          status="empty"
          title={strings.saved.emptyTitle}
          description={strings.saved.emptyDescription}
        />
      ) : null}
      {saved.data && saved.data.items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {saved.data.items.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      ) : null}
      {saved.data ? (
        <Pager page={saved.data.page} totalPages={saved.data.totalPages} onPage={setPage} />
      ) : null}
    </AgoraPage>
  );
}
