import { ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router";
import { isApiError } from "@/core/api";
import { Badge, StateView } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import { useArticle } from "../api/queries";
import type { ArticleDetail } from "../api/schemas";
import { ArticleActions } from "../components/ArticleActions";
import { ContentTypeBadge } from "../components/ContentTypeBadge";
import { AgoraPage, LoadError, LoadingState } from "../components/Feedback";
import { SealBadge, SealExplanation } from "../components/SealBadge";
import { VideoFacade } from "../components/VideoFacade";
import { MarkdownView } from "../lib/MarkdownView";
import { formatDate, formatDateOnly } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { agoraPaths, exploreUrl } from "../paths";
import { strings } from "../strings";

const h2 = "text-xl font-bold tracking-tight text-fg";
const linkClass =
  "font-medium text-accent-strong underline underline-offset-4 hover:no-underline";

/** Pieza completa: «En 20 segundos», qué se sabe y qué no, fuentes, correcciones y cómo se sabe (sello y alcance). */
export function Component() {
  const { slug = "" } = useParams();
  const query = useArticle(slug);
  useDocumentTitle(query.data?.card.title);

  return (
    <AgoraPage>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? (
        isApiError(query.error) && query.error.isNotFound ? (
          <StateView
            status="empty"
            title={strings.article.notFoundTitle}
            description={strings.article.notFoundDescription}
            action={
              <Link to={agoraPaths.explore} className={secondaryButton}>
                {strings.nav.explore}
              </Link>
            }
          />
        ) : (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : null}
      {query.data ? <ArticleView article={query.data} /> : null}
    </AgoraPage>
  );
}

function ArticleView({ article }: { article: ArticleDetail }) {
  const { card } = article;
  const blocks = [
    { id: "known", title: strings.article.known, text: article.knownText },
    { id: "unknown", title: strings.article.unknown, text: article.unknownText },
    { id: "why", title: strings.article.why, text: article.whyItMatters },
  ].filter((block) => block.text);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ContentTypeBadge type={card.contentType} />
          <SealBadge seal={card.seal} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{card.title}</h1>
        <p className="text-sm text-muted">
          {[
            strings.common.by(card.authorName),
            card.publishedAt ? strings.common.published(formatDate(card.publishedAt)) : null,
            strings.common.updated(formatDate(article.updatedAt)),
            strings.common.readingMinutes(card.readingMinutes),
            article.periodLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-sm">
          <Link to={exploreUrl({ categoria: card.categorySlug })} className={linkClass}>
            {card.categoryName}
          </Link>
          {card.seriesName && card.seriesSlug ? (
            <>
              {" · "}
              <Link to={exploreUrl({ serie: card.seriesSlug })} className={linkClass}>
                {strings.article.seriesPart(card.seriesName, card.seriesOrder)}
              </Link>
            </>
          ) : null}
        </p>
      </header>

      <section aria-labelledby="art-summary" className="rounded-2xl border border-line bg-surface-raised p-5">
        <h2 id="art-summary" className="text-sm font-bold tracking-wide text-accent-strong uppercase">
          {strings.article.summary}
        </h2>
        <p className="mt-2 text-lg leading-relaxed text-fg">{card.summary}</p>
      </section>

      {article.corrections.length > 0 ? (
        <section aria-labelledby="art-corrections" className="flex flex-col gap-2 rounded-2xl border border-line-strong bg-surface p-5">
          <h2 id="art-corrections" className={h2}>{strings.article.corrections}</h2>
          <ul className="flex flex-col gap-2">
            {article.corrections.map((correction) => (
              <li key={correction.id} className="leading-relaxed text-fg">
                <span className="font-semibold">
                  {strings.article.correctedOn(formatDate(correction.correctedAt))}.
                </span>{" "}
                {correction.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {blocks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {blocks.map((block) => (
            <section
              key={block.id}
              aria-labelledby={`art-${block.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5"
            >
              <h2 id={`art-${block.id}`} className="text-base font-bold text-fg">
                {block.title}
              </h2>
              <p className="leading-relaxed text-fg-secondary">{block.text}</p>
            </section>
          ))}
        </div>
      ) : null}

      {article.video ? (
        <section aria-labelledby="art-video" className="flex flex-col gap-3">
          <h2 id="art-video" className={h2}>{strings.article.video}</h2>
          <VideoFacade video={article.video} />
        </section>
      ) : null}

      {article.body.trim() !== "" ? (
        <section aria-labelledby="art-body" className="flex flex-col gap-3">
          <h2 id="art-body" className={h2}>{strings.article.body}</h2>
          <MarkdownView source={article.body} />
        </section>
      ) : null}

      <section aria-labelledby="art-sources" className="flex flex-col gap-3">
        <h2 id="art-sources" className={h2}>{strings.article.sources}</h2>
        {article.sources.length === 0 ? (
          <p className="text-fg-secondary">{strings.article.sourcesMissing}</p>
        ) : (
          <ol className="flex list-decimal flex-col gap-3 pl-6">
            {article.sources.map((source) => (
              <li key={`${source.url}-${source.title}`} className="leading-relaxed text-fg">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`${linkClass} inline-flex items-center gap-1`}
                >
                  {source.title}
                  <ExternalLink aria-hidden="true" size={14} />
                  <span className="sr-only">{strings.article.openSource}</span>
                </a>
                <span className="ml-2 align-middle">
                  <Badge>{strings.article.sourceKinds[source.kind]}</Badge>
                </span>
                <p className="text-sm text-muted">
                  {[source.author, formatDateOnly(source.publishedOn)].filter(Boolean).join(" · ")}
                </p>
                {source.contextNote ? (
                  <p className="text-sm text-fg-secondary">{source.contextNote}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="art-how" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 id="art-how" className={h2}>{strings.article.howWeKnow}</h2>
        <SealExplanation seal={card.seal} />
        {article.verifications.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {article.verifications.map((verification) => (
              <li key={verification.id} className="flex flex-col gap-1 border-t border-line pt-3">
                <p className="text-sm font-semibold text-fg">
                  {strings.article.verificationBy(
                    verification.reviewerName,
                    formatDate(verification.verifiedAt),
                  )}
                  {verification.isCurrent ? null : (
                    <span className="ml-2 font-normal text-muted">
                      ({strings.article.previousVersion})
                    </span>
                  )}
                </p>
                <p className="text-sm text-fg-secondary">
                  <span className="font-semibold">{strings.article.scope}:</span>{" "}
                  {verification.scope}
                </p>
                {verification.note ? (
                  <p className="text-sm text-fg-secondary">
                    <span className="font-semibold">{strings.article.note}:</span>{" "}
                    {verification.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm">
          <Link to={agoraPaths.standards} className={linkClass}>
            {strings.article.standardsLink}
          </Link>
        </p>
      </section>

      {article.tags.length > 0 ? (
        <section aria-label={strings.article.tagsLabel} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">{strings.article.tagsLabel}:</span>
          {article.tags.map((tag) => (
            <Link
              key={tag}
              to={exploreUrl({ q: tag })}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-fg hover:bg-accent-soft"
            >
              {tag}
            </Link>
          ))}
        </section>
      ) : null}

      <ArticleActions article={article} />
    </article>
  );
}
