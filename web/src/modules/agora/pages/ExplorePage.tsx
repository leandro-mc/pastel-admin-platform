import { Link, useSearchParams } from "react-router";
import { Button, PageHeader, StateView, TextField } from "@/core/ui";
import { useArticles, useTaxonomy } from "../api/queries";
import { ArticleCard } from "../components/ArticleCard";
import { AgoraPage, LoadError, LoadingState, Pager } from "../components/Feedback";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { exploreUrl, type ExploreFilters } from "../paths";
import { strings } from "../strings";

const chip =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none";

function FilterLink({
  active,
  to,
  children,
}: {
  active: boolean;
  to: string;
  children: string;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "true" : undefined}
      className={`${chip} ${
        active
          ? "border-accent-strong bg-accent-soft text-accent-strong"
          : "border-line bg-surface text-fg hover:bg-accent-soft"
      }`}
    >
      {children}
    </Link>
  );
}

/** Explorar: por tema, serie o etiqueta, y búsqueda por título o etiqueta. Los filtros viven en la dirección. */
export function Component() {
  useDocumentTitle(strings.explore.title);
  const [params] = useSearchParams();
  const filters: ExploreFilters = {
    categoria: params.get("categoria") ?? undefined,
    serie: params.get("serie") ?? undefined,
    etiqueta: params.get("etiqueta") ?? undefined,
    q: params.get("q") ?? undefined,
    pagina: Number.parseInt(params.get("pagina") ?? "1", 10) || 1,
  };
  const taxonomy = useTaxonomy();
  const articles = useArticles({
    category: filters.categoria ?? "",
    series: filters.serie ?? "",
    tag: filters.etiqueta ?? "",
    q: filters.q ?? "",
    page: filters.pagina ?? 1,
  });
  const hasFilters = Boolean(
    filters.categoria || filters.serie || filters.etiqueta || filters.q,
  );

  return (
    <AgoraPage>
      <PageHeader
        title={strings.explore.title}
        description={strings.explore.description}
      />

      <SearchForm key={filters.q ?? ""} filters={filters} />

      {taxonomy.data ? (
        <div className="flex flex-col gap-5">
          <FilterGroup label={strings.explore.topics}>
            <FilterLink
              to={exploreUrl({ ...filters, categoria: undefined, pagina: 1 })}
              active={!filters.categoria}
            >
              {strings.explore.all}
            </FilterLink>
            {taxonomy.data.categories.map((category) => (
              <FilterLink
                key={category.slug}
                to={exploreUrl({ ...filters, categoria: category.slug, pagina: 1 })}
                active={filters.categoria === category.slug}
              >
                {`${category.name} (${category.articleCount})`}
              </FilterLink>
            ))}
          </FilterGroup>
          {taxonomy.data.series.length > 0 ? (
            <FilterGroup label={strings.explore.series}>
              {taxonomy.data.series.map((series) => (
                <FilterLink
                  key={series.slug}
                  to={exploreUrl({ ...filters, serie: series.slug, pagina: 1 })}
                  active={filters.serie === series.slug}
                >
                  {`${series.name} (${series.articleCount})`}
                </FilterLink>
              ))}
            </FilterGroup>
          ) : null}
          {taxonomy.data.tags.length > 0 ? (
            <FilterGroup label={strings.explore.tags}>
              {taxonomy.data.tags.map((tag) => (
                <FilterLink
                  key={tag.slug}
                  to={exploreUrl({ ...filters, etiqueta: tag.slug, pagina: 1 })}
                  active={filters.etiqueta === tag.slug}
                >
                  {tag.name}
                </FilterLink>
              ))}
            </FilterGroup>
          ) : null}
        </div>
      ) : null}

      {hasFilters ? (
        <div>
          <Link
            to={exploreUrl()}
            className="text-sm font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
          >
            {strings.explore.clear}
          </Link>
        </div>
      ) : null}

      <section aria-live="polite" className="flex flex-col gap-4">
        {articles.isPending ? <LoadingState /> : null}
        {articles.isError ? (
          <LoadError error={articles.error} onRetry={() => void articles.refetch()} />
        ) : null}
        {articles.data ? (
          <>
            <p className="text-sm text-muted">
              {strings.explore.resultsFor(articles.data.totalCount)}
            </p>
            {articles.data.items.length === 0 ? (
              <StateView
                status="empty"
                title={strings.explore.empty}
                description={strings.explore.emptyHint}
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {articles.data.items.map((article) => (
                  <li key={article.id}>
                    <ArticleCard article={article} />
                  </li>
                ))}
              </ul>
            )}
            <PagerLinks
              page={articles.data.page}
              totalPages={articles.data.totalPages}
              filters={filters}
            />
          </>
        ) : null}
      </section>
    </AgoraPage>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">{label}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function SearchForm({ filters }: { filters: ExploreFilters }) {
  const [, setParams] = useSearchParams();
  return (
    <form
      role="search"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        const target = exploreUrl({ ...filters, q: q || undefined, pagina: 1 });
        setParams(new URL(target, window.location.origin).searchParams);
      }}
    >
      <div className="flex-1">
        <TextField
          label={strings.explore.search}
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={strings.explore.searchPlaceholder}
          maxLength={100}
        />
      </div>
      <Button type="submit">{strings.explore.search}</Button>
    </form>
  );
}

function PagerLinks({
  page,
  totalPages,
  filters,
}: {
  page: number;
  totalPages: number;
  filters: ExploreFilters;
}) {
  const [, setParams] = useSearchParams();
  return (
    <Pager
      page={page}
      totalPages={totalPages}
      onPage={(next) =>
        setParams(
          new URL(exploreUrl({ ...filters, pagina: next }), window.location.origin)
            .searchParams,
        )
      }
    />
  );
}
