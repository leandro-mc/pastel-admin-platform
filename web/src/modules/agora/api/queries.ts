import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import { agoraKeys, toQuery, type ArticleFilters, type EditorialFilters } from "./keys";
import {
  articleCardSchema,
  articleDetailSchema,
  editorialArticleSchema,
  editorialListItemSchema,
  editorialTaxonomySchema,
  errorReportSchema,
  followedSchema,
  homeSchema,
  newsSchema,
  pageSchema,
  reviewVerificationSchema,
  taxonomySchema,
  viewerSchema,
} from "./schemas";

type Gate = { enabled?: boolean };

const PAGE_SIZE = 12;
const articlePage = pageSchema(articleCardSchema);

/* ----- Lectura pública ----- */

export function useHome() {
  return useQuery({
    queryKey: agoraKeys.home,
    queryFn: ({ signal }) => api.get("/api/agora/home", homeSchema, { signal }),
  });
}

export function useTaxonomy() {
  return useQuery({
    queryKey: agoraKeys.taxonomy,
    queryFn: ({ signal }) =>
      api.get("/api/agora/taxonomy", taxonomySchema, { signal }),
  });
}

export function useArticles(filters: ArticleFilters) {
  return useQuery({
    queryKey: agoraKeys.articles(filters),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/articles${toQuery({
          category: filters.category,
          series: filters.series,
          tag: filters.tag,
          q: filters.q,
          page: filters.page,
          pageSize: PAGE_SIZE,
        })}`,
        articlePage,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: agoraKeys.article(slug),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/articles/${encodeURIComponent(slug)}`,
        articleDetailSchema,
        { signal },
      ),
    retry: false,
  });
}

export function useNews(topic: string, page: number) {
  return useQuery({
    queryKey: agoraKeys.news(topic, page),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/news${toQuery({ topic, page, pageSize: PAGE_SIZE })}`,
        pageSchema(newsSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

/* ----- Persona registrada (agora.saved.manage) ----- */

export function useViewer(slug: string, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: agoraKeys.viewer(slug),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/articles/${encodeURIComponent(slug)}/viewer`,
        viewerSchema,
        { signal },
      ),
    enabled,
  });
}

export function useSaved(page: number, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: agoraKeys.saved(page),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/me/saved${toQuery({ page, pageSize: PAGE_SIZE })}`,
        articlePage,
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useFollowed({ enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: agoraKeys.followed,
    queryFn: ({ signal }) =>
      api.get("/api/agora/me/followed", followedSchema, { signal }),
    enabled,
  });
}

/* ----- Panel editorial ----- */

export function useEditorialArticles(filters: EditorialFilters) {
  return useQuery({
    queryKey: agoraKeys.editorialArticles(filters),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/editorial/articles${toQuery({
          status: filters.status,
          q: filters.q,
          page: filters.page,
          pageSize: 20,
        })}`,
        pageSchema(editorialListItemSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useEditorialArticle(id: string | undefined) {
  return useQuery({
    queryKey: agoraKeys.editorialArticle(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/editorial/articles/${id}`,
        editorialArticleSchema,
        { signal },
      ),
    enabled: id !== undefined,
    retry: false,
  });
}

export function useEditorialTaxonomy() {
  return useQuery({
    queryKey: agoraKeys.editorialTaxonomy,
    queryFn: ({ signal }) =>
      api.get(
        "/api/agora/editorial/taxonomy",
        editorialTaxonomySchema,
        { signal },
      ),
  });
}

export function useDailyPicks() {
  return useQuery({
    queryKey: agoraKeys.dailyPicks,
    queryFn: ({ signal }) =>
      api.get(
        "/api/agora/editorial/daily-picks",
        z.array(articleCardSchema),
        { signal },
      ),
  });
}

export function useReviewQueue(page: number) {
  return useQuery({
    queryKey: agoraKeys.reviewQueue(page),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/editorial/review${toQuery({ page, pageSize: 10 })}`,
        articlePage,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useReviewVerifications(page: number) {
  return useQuery({
    queryKey: agoraKeys.reviewVerifications(page),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/editorial/review/verifications${toQuery({ page, pageSize: 10 })}`,
        pageSchema(reviewVerificationSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useErrorReports(status: string, page: number) {
  return useQuery({
    queryKey: agoraKeys.errorReports(status, page),
    queryFn: ({ signal }) =>
      api.get(
        `/api/agora/editorial/error-reports${toQuery({ status, page, pageSize: 10 })}`,
        pageSchema(errorReportSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}
