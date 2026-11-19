import { Link } from "react-router";
import type { ArticleCard as ArticleCardData } from "../api/schemas";
import { formatDate } from "../lib/format";
import { agoraPaths } from "../paths";
import { strings } from "../strings";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { SealBadge } from "./SealBadge";

/** Tarjeta de una pieza: tipo, sello, titular y «En 20 segundos». Todo el contenido útil está en la propia tarjeta. */
export function ArticleCard({
  article,
  headingLevel = "h3",
}: {
  article: ArticleCardData;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <ContentTypeBadge type={article.contentType} />
        <SealBadge seal={article.seal} compact />
      </div>
      <Heading className="text-lg font-bold tracking-tight text-fg">
        <Link
          to={agoraPaths.article(article.slug)}
          className="rounded-md hover:underline focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
        >
          {article.title}
        </Link>
      </Heading>
      <p className="leading-relaxed text-fg-secondary">{article.summary}</p>
      <p className="text-xs text-muted">
        {[
          article.categoryName,
          strings.common.readingMinutes(article.readingMinutes),
          article.publishedAt ? formatDate(article.publishedAt) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </article>
  );
}
