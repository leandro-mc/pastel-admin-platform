import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { StateView } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import type { Home } from "../api/schemas";
import { formatDateOnly } from "../lib/format";
import { agoraPaths, exploreUrl } from "../paths";
import { strings } from "../strings";
import { ArticleCard } from "./ArticleCard";
import { CalmToggle } from "./Feedback";

const chipClass =
  "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none";

/**
 * Inicio finito (AG-INI-01): «Hoy en 5 minutos», lo reciente con tope fijo y un cierre explícito.
 * No hay desplazamiento infinito, ni «cargar más», ni ranking oculto: el orden es decisión editorial y fecha.
 */
export function HomeView({
  data,
  followed,
  calm,
}: {
  data: Home;
  followed: readonly string[];
  calm: boolean;
}) {
  const forYou = data.recent.filter((a) => followed.includes(a.categorySlug));
  const others = data.recent.filter((a) => !followed.includes(a.categorySlug));
  const hasContent = data.dailyPicks.length > 0 || data.recent.length > 0;

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-[0.16em] text-accent-strong uppercase">
            {strings.home.eyebrow}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {strings.home.title}
          </h1>
          <p className="max-w-2xl leading-relaxed text-fg-secondary">
            {strings.home.description}
          </p>
        </div>
        <div className="max-w-md">
          <CalmToggle />
        </div>
      </header>

      {!hasContent ? (
        <StateView
          status="empty"
          title={strings.home.emptyTitle}
          description={strings.home.emptyDescription}
        />
      ) : null}

      {hasContent ? (
        <section aria-labelledby="agora-picks" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="agora-picks" className="text-xl font-bold tracking-tight text-fg">
              {strings.home.eyebrow}
            </h2>
            {data.dailyPicks.length > 0 ? (
              <p className="text-sm text-muted">
                {strings.home.totalTime(data.dailyPicksMinutes)}
              </p>
            ) : null}
          </div>
          {data.dailyPicks.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {data.dailyPicks.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ol>
          ) : (
            <StateView
              status="empty"
              title={strings.home.noPicksTitle}
              description={strings.home.noPicksDescription}
            />
          )}
        </section>
      ) : null}

      {forYou.length > 0 ? (
        <section aria-labelledby="agora-for-you" className="flex flex-col gap-4">
          <h2 id="agora-for-you" className="text-xl font-bold tracking-tight text-fg">
            {strings.home.forYouTitle}
          </h2>
          <ul className="flex flex-col gap-4">
            {forYou.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section aria-labelledby="agora-recent" className="flex flex-col gap-4">
          <h2 id="agora-recent" className="text-xl font-bold tracking-tight text-fg">
            {strings.home.recentTitle}
          </h2>
          <ul className="flex flex-col gap-4">
            {others.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!calm && data.news.length > 0 ? (
        <section aria-labelledby="agora-news" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="agora-news" className="text-xl font-bold tracking-tight text-fg">
              {strings.home.newsTitle}
            </h2>
            <Link
              to={agoraPaths.news}
              className="text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
            >
              {strings.home.newsAll}
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {data.news.map((news) => (
              <li
                key={news.id}
                className="rounded-xl border border-line bg-surface px-4 py-3"
              >
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-semibold text-fg underline-offset-4 hover:underline"
                >
                  {news.headline}
                </a>
                <p className="text-xs text-muted">
                  {news.outlet} · {formatDateOnly(news.publishedOn)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.categories.length > 0 || data.series.length > 0 ? (
        <section aria-labelledby="agora-topics" className="flex flex-col gap-3">
          <h2 id="agora-topics" className="text-xl font-bold tracking-tight text-fg">
            {strings.home.topicsTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.categories.map((category) => (
              <li key={category.slug}>
                <Link to={exploreUrl({ categoria: category.slug })} className={chipClass}>
                  {category.name}
                </Link>
              </li>
            ))}
            {data.series.map((series) => (
              <li key={series.slug}>
                <Link to={exploreUrl({ serie: series.slug })} className={chipClass}>
                  {strings.home.seriesTitle}: {series.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="agora-end"
        className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface-raised p-6"
      >
        <h2 id="agora-end" className="text-xl font-bold tracking-tight text-fg">
          {strings.home.endTitle}
        </h2>
        <p className="max-w-xl leading-relaxed text-fg-secondary">
          {strings.home.endDescription}
        </p>
        <Link to={agoraPaths.explore} className={secondaryButton}>
          {strings.home.exploreCta}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    </>
  );
}
