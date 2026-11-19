import { z } from "zod";

/** Esquemas de las respuestas de `/api/agora` (coinciden con los DTO del servidor; los enums viajan como texto camelCase). */

export const contentTypeSchema = z.enum(["facts", "analysis", "opinion"]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const sealStateSchema = z.enum([
  "pending",
  "verified",
  "modifiedAfterVerification",
]);
export type SealState = z.infer<typeof sealStateSchema>;

export const sourceKindSchema = z.enum([
  "official",
  "press",
  "academic",
  "document",
  "other",
]);
export type SourceKind = z.infer<typeof sourceKindSchema>;

export const articleStatusSchema = z.enum(["draft", "published", "archived"]);
export type ArticleStatus = z.infer<typeof articleStatusSchema>;

export const reactionKindSchema = z.enum(["helped", "moreSources"]);
export type ReactionKind = z.infer<typeof reactionKindSchema>;

export function pageSchema<S extends z.ZodType>(item: S) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  });
}
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export const sealSchema = z.object({
  state: sealStateSchema,
  activeReviews: z.number(),
  requiredReviews: z.number(),
  verifiers: z.array(z.object({ name: z.string(), verifiedAt: z.string() })),
});
export type Seal = z.infer<typeof sealSchema>;

export const articleCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  contentType: contentTypeSchema,
  categorySlug: z.string(),
  categoryName: z.string(),
  seriesSlug: z.string().nullable(),
  seriesName: z.string().nullable(),
  seriesOrder: z.number().nullable(),
  publishedAt: z.string().nullable(),
  authorName: z.string(),
  readingMinutes: z.number(),
  sourceCount: z.number(),
  seal: sealSchema,
});
export type ArticleCard = z.infer<typeof articleCardSchema>;

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  articleCount: z.number(),
});
export type Category = z.infer<typeof categorySchema>;

export const seriesSchema = categorySchema;
export type Series = Category;

export const tagSchema = z.object({
  slug: z.string(),
  name: z.string(),
  articleCount: z.number(),
});
export type Tag = z.infer<typeof tagSchema>;

export const newsSchema = z.object({
  id: z.string(),
  headline: z.string(),
  outlet: z.string(),
  publishedOn: z.string(),
  url: z.string(),
  contextNote: z.string(),
  topic: z.string().nullable(),
  isFeatured: z.boolean(),
});
export type News = z.infer<typeof newsSchema>;

export const homeSchema = z.object({
  dailyPicks: z.array(articleCardSchema),
  dailyPicksMinutes: z.number(),
  recent: z.array(articleCardSchema),
  series: z.array(seriesSchema),
  categories: z.array(categorySchema),
  news: z.array(newsSchema),
});
export type Home = z.infer<typeof homeSchema>;

export const taxonomySchema = z.object({
  categories: z.array(categorySchema),
  series: z.array(seriesSchema),
  tags: z.array(tagSchema),
});
export type Taxonomy = z.infer<typeof taxonomySchema>;

export const sourceSchema = z.object({
  title: z.string(),
  author: z.string().nullable(),
  publishedOn: z.string().nullable(),
  url: z.string(),
  kind: sourceKindSchema,
  contextNote: z.string().nullable(),
});
export type Source = z.infer<typeof sourceSchema>;

export const videoSchema = z.object({
  youTubeId: z.string(),
  title: z.string(),
  note: z.string().nullable(),
});
export type Video = z.infer<typeof videoSchema>;

export const correctionSchema = z.object({
  id: z.string(),
  correctedAt: z.string(),
  text: z.string(),
});
export type Correction = z.infer<typeof correctionSchema>;

export const verificationSchema = z.object({
  id: z.string(),
  reviewerName: z.string(),
  verifiedAt: z.string(),
  scope: z.string(),
  note: z.string().nullable(),
  isCurrent: z.boolean(),
});
export type Verification = z.infer<typeof verificationSchema>;

export const articleDetailSchema = z.object({
  card: articleCardSchema,
  knownText: z.string().nullable(),
  unknownText: z.string().nullable(),
  whyItMatters: z.string().nullable(),
  body: z.string(),
  periodLabel: z.string().nullable(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  sources: z.array(sourceSchema),
  video: videoSchema.nullable(),
  corrections: z.array(correctionSchema),
  verifications: z.array(verificationSchema),
});
export type ArticleDetail = z.infer<typeof articleDetailSchema>;

export const viewerSchema = z.object({
  saved: z.boolean(),
  reactions: z.array(reactionKindSchema),
  followingCategory: z.boolean(),
});
export type Viewer = z.infer<typeof viewerSchema>;

export const followedSchema = z.object({ categorySlugs: z.array(z.string()) });

export const createdSchema = z.object({ id: z.string() });

/* ----- Panel editorial ----- */

export const editorialListItemSchema = z.object({
  card: articleCardSchema,
  status: articleStatusSchema,
  updatedAt: z.string(),
  dailyPickOrder: z.number().nullable(),
  openErrorReports: z.number(),
});
export type EditorialListItem = z.infer<typeof editorialListItemSchema>;

export const editorialArticleSchema = z.object({
  detail: articleDetailSchema,
  status: articleStatusSchema,
  version: z.number(),
  categoryId: z.string(),
  seriesId: z.string().nullable(),
  dailyPickOrder: z.number().nullable(),
  substantiveVersion: z.number(),
});
export type EditorialArticle = z.infer<typeof editorialArticleSchema>;

export const taxonomyItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  articleCount: z.number(),
});
export type TaxonomyItem = z.infer<typeof taxonomyItemSchema>;

export const editorialTaxonomySchema = z.object({
  categories: z.array(taxonomyItemSchema),
  series: z.array(taxonomyItemSchema),
});

export const errorReportSchema = z.object({
  id: z.string(),
  articleSlug: z.string(),
  articleTitle: z.string(),
  text: z.string(),
  status: z.enum(["received", "resolved", "dismissed"]),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
});
export type ErrorReport = z.infer<typeof errorReportSchema>;

export const reviewVerificationSchema = z.object({
  id: z.string(),
  articleSlug: z.string(),
  articleTitle: z.string(),
  reviewerName: z.string(),
  verifiedAt: z.string(),
  scope: z.string(),
  note: z.string().nullable(),
  isCurrent: z.boolean(),
});
export type ReviewVerification = z.infer<typeof reviewVerificationSchema>;
