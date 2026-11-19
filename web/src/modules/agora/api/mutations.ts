import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import { agoraKeys } from "./keys";
import {
  articleCardSchema,
  correctionSchema,
  createdSchema,
  editorialArticleSchema,
  errorReportSchema,
  newsSchema,
  taxonomyItemSchema,
  verificationSchema,
  type ContentType,
  type ReactionKind,
  type SourceKind,
} from "./schemas";

/** Cada mutación invalida lo que cambia; las pantallas no guardan copias propias de los datos. */
function useInvalidate() {
  const client = useQueryClient();
  return (...keys: (readonly unknown[])[]) =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

const slugPath = (slug: string) => encodeURIComponent(slug);

/* ----- Persona registrada ----- */

export function useSetSaved() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ slug, saved }: { slug: string; saved: boolean }) =>
      api.send(
        saved ? "PUT" : "DELETE",
        `/api/agora/articles/${slugPath(slug)}/saved`,
      ),
    onSuccess: (_data, { slug }) =>
      invalidate(agoraKeys.viewer(slug), ["agora", "saved"]),
  });
}

export function useSetFollow() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ slug, following }: { slug: string; following: boolean }) =>
      api.send(
        following ? "PUT" : "DELETE",
        `/api/agora/categories/${slugPath(slug)}/follow`,
      ),
    onSuccess: () => invalidate(agoraKeys.followed, ["agora", "viewer"]),
  });
}

export function useSetReaction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      slug,
      kind,
      on,
    }: {
      slug: string;
      kind: ReactionKind;
      on: boolean;
    }) =>
      api.send(
        on ? "PUT" : "DELETE",
        `/api/agora/articles/${slugPath(slug)}/reactions/${kind}`,
      ),
    onSuccess: (_data, { slug }) => invalidate(agoraKeys.viewer(slug)),
  });
}

export function useReportError() {
  return useMutation({
    mutationFn: ({ slug, text }: { slug: string; text: string }) =>
      api.post(
        `/api/agora/articles/${slugPath(slug)}/error-reports`,
        createdSchema,
        { text },
      ),
  });
}

/* ----- Panel editorial ----- */

export type SourceInput = {
  title: string;
  author: string;
  publishedOn: string;
  url: string;
  kind: SourceKind;
  contextNote: string;
};

export type ArticleInput = {
  title: string;
  summary: string;
  contentType: ContentType | "";
  knownText: string;
  unknownText: string;
  whyItMatters: string;
  body: string;
  categoryId: string;
  seriesId: string;
  seriesOrder: string;
  periodLabel: string;
  tags: string[];
  sources: SourceInput[];
  video: { url: string; title: string; note: string };
};

/** Cuerpo que espera el servidor: textos vacíos pasan a `null` y se envía la versión para detectar choques de edición. */
export function toArticleBody(input: ArticleInput, version?: number) {
  const orNull = (value: string) => (value.trim() === "" ? null : value);
  const seriesOrder = Number.parseInt(input.seriesOrder, 10);
  return {
    title: input.title,
    summary: input.summary,
    contentType: input.contentType === "" ? null : input.contentType,
    knownText: orNull(input.knownText),
    unknownText: orNull(input.unknownText),
    whyItMatters: orNull(input.whyItMatters),
    body: input.body,
    categoryId: input.categoryId === "" ? null : input.categoryId,
    seriesId: input.seriesId === "" ? null : input.seriesId,
    seriesOrder:
      input.seriesId !== "" && Number.isFinite(seriesOrder) ? seriesOrder : null,
    periodLabel: orNull(input.periodLabel),
    tags: input.tags,
    sources: input.sources.map((source) => ({
      title: source.title,
      author: orNull(source.author),
      publishedOn: orNull(source.publishedOn),
      url: source.url,
      kind: source.kind,
      contextNote: orNull(source.contextNote),
    })),
    video:
      input.video.url.trim() === ""
        ? null
        : {
            url: input.video.url,
            title: input.video.title,
            note: orNull(input.video.note),
          },
    version: version ?? null,
  };
}

export function useSaveArticle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      input,
      version,
    }: {
      id?: string;
      input: ArticleInput;
      version?: number;
    }) =>
      id === undefined
        ? api.post(
            "/api/agora/editorial/articles",
            editorialArticleSchema,
            toArticleBody(input),
          )
        : api.put(
            `/api/agora/editorial/articles/${id}`,
            editorialArticleSchema,
            toArticleBody(input, version),
          ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useArticleTransition() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "publish" | "unpublish" | "archive";
    }) =>
      api.post(
        `/api/agora/editorial/articles/${id}/${action}`,
        editorialArticleSchema,
      ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useAddCorrection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post(
        `/api/agora/editorial/articles/${id}/corrections`,
        correctionSchema,
        { text },
      ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useReplaceDailyPicks() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (articleIds: string[]) =>
      api.put(
        "/api/agora/editorial/daily-picks",
        z.array(articleCardSchema),
        { articleIds },
      ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export type TaxonomyInput = {
  name: string;
  description: string;
  sortOrder: string;
};

export function useSaveTaxonomy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      input,
    }: {
      kind: "categories" | "series";
      id?: string;
      input: TaxonomyInput;
    }) => {
      const sortOrder = Number.parseInt(input.sortOrder, 10);
      const body = {
        name: input.name,
        description: input.description.trim() === "" ? null : input.description,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
      };
      return id === undefined
        ? api.post(`/api/agora/editorial/${kind}`, taxonomyItemSchema, body)
        : api.put(`/api/agora/editorial/${kind}/${id}`, taxonomyItemSchema, body);
    },
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export type NewsInput = {
  headline: string;
  outlet: string;
  publishedOn: string;
  url: string;
  contextNote: string;
  topic: string;
  isFeatured: boolean;
};

export function useSaveNews() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: NewsInput }) => {
      const body = {
        ...input,
        publishedOn: input.publishedOn === "" ? null : input.publishedOn,
        topic: input.topic.trim() === "" ? null : input.topic,
      };
      return id === undefined
        ? api.post("/api/agora/editorial/news", newsSchema, body)
        : api.put(`/api/agora/editorial/news/${id}`, newsSchema, body);
    },
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useDeleteNews() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api.send("DELETE", `/api/agora/editorial/news/${id}`),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useResolveReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      outcome,
      note,
    }: {
      id: string;
      outcome: "resolved" | "dismissed";
      note: string;
    }) =>
      api.post(
        `/api/agora/editorial/error-reports/${id}/resolve`,
        errorReportSchema,
        { outcome, note: note.trim() === "" ? null : note },
      ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useVerify() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      scope,
      note,
    }: {
      id: string;
      scope: string;
      note: string;
    }) =>
      api.post(
        `/api/agora/editorial/articles/${id}/verify`,
        verificationSchema,
        { scope, note: note.trim() === "" ? null : note },
      ),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}

export function useWithdrawVerification() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.send("POST", `/api/agora/editorial/verifications/${id}/withdraw`, {
        note,
      }),
    onSuccess: () => invalidate(agoraKeys.all),
  });
}
