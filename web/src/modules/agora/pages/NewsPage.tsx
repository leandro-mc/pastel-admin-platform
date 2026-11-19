import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge, PageHeader, StateView, TextField } from "@/core/ui";
import { useNews } from "../api/queries";
import { AgoraPage, CalmToggle, LoadError, LoadingState, Pager } from "../components/Feedback";
import { formatDateOnly } from "../lib/format";
import { useCalmMode } from "../lib/preferences";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { strings } from "../strings";

/** Actualidad: enlaces a noticias de otros medios con contexto propio. Con el modo calma activo no se muestran. */
export function Component() {
  useDocumentTitle(strings.news.title);
  const [calm] = useCalmMode();
  const [topic, setTopic] = useState("");
  const [page, setPage] = useState(1);
  const news = useNews(calm ? "" : topic, page);

  return (
    <AgoraPage>
      <PageHeader title={strings.news.title} description={strings.news.description} />

      {calm ? (
        <>
          <StateView
            status="empty"
            title={strings.news.calmTitle}
            description={strings.news.calmDescription}
          />
          <div className="max-w-md">
            <CalmToggle />
          </div>
        </>
      ) : (
        <>
          <div className="max-w-sm">
            <TextField
              label={strings.news.topicLabel}
              value={topic}
              maxLength={80}
              onChange={(event) => {
                setTopic(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {news.isPending ? <LoadingState /> : null}
          {news.isError ? (
            <LoadError error={news.error} onRetry={() => void news.refetch()} />
          ) : null}
          {news.data && news.data.items.length === 0 ? (
            <StateView status="empty" title={strings.news.empty} />
          ) : null}
          {news.data && news.data.items.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {news.data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isFeatured ? (
                      <Badge variant="accent">{strings.news.featured}</Badge>
                    ) : null}
                    {item.topic ? <Badge>{item.topic}</Badge> : null}
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-fg">{item.headline}</h2>
                  <p className="leading-relaxed text-fg-secondary">{item.contextNote}</p>
                  <p className="text-xs text-muted">
                    {item.outlet} · {formatDateOnly(item.publishedOn)}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
                  >
                    {strings.news.readAt(item.outlet)}
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {news.data ? (
            <Pager page={news.data.page} totalPages={news.data.totalPages} onPage={setPage} />
          ) : null}
        </>
      )}
    </AgoraPage>
  );
}
