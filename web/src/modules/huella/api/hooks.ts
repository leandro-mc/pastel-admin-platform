import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import {
  aiModelSchema,
  aiPackageSchema,
  aiSettingsSchema,
  aiTaskOutcomeSchema,
  aiTaskPackageSchema,
  bankSchema,
  contentViewSchema,
  letterSchema,
  letterSummarySchema,
  cvDocumentSchema,
  derivationSchema,
  offerSchema,
  offerSummarySchema,
  previewSchema,
  profileSchema,
  publicationResultSchema,
  publicViewSchema,
  statusSchema,
  versionSchema,
  versionSummarySchema,
} from "./schemas";

const base = "/api/huella";

/** Claves de TanStack Query de Huella. Invalidar `huellaKeys.all` refresca todo el módulo. */
export const huellaKeys = {
  all: ["huella"] as const,
  profile: ["huella", "profile"] as const,
  content: ["huella", "content"] as const,
  bank: ["huella", "bank"] as const,
  offers: ["huella", "offers"] as const,
  offer: (id: string) => ["huella", "offer", id] as const,
  versions: ["huella", "versions"] as const,
  letters: ["huella", "letters"] as const,
  letter: (id: string) => ["huella", "letter", id] as const,
  version: (id: string) => ["huella", "version", id] as const,
  status: ["huella", "publication"] as const,
  preview: ["huella", "preview"] as const,
  ai: ["huella", "ai"] as const,
};

/** Las llamadas a un proveedor de IA pueden tardar; el servidor corta a los 120 s y nginx a los 150 s. */
const AI_TIMEOUT_MS = 150_000;

/** Cambiar el banco o el perfil altera la evidencia de las ofertas y lo que está sin publicar. */
function refreshDerived(client: QueryClient) {
  void client.invalidateQueries({ queryKey: huellaKeys.status });
  void client.invalidateQueries({ queryKey: huellaKeys.preview });
  void client.invalidateQueries({ queryKey: ["huella", "offer"] });
}

// ───────── Lecturas ─────────
export const useProfile = () =>
  useQuery({
    queryKey: huellaKeys.profile,
    queryFn: ({ signal }) =>
      api.get(`${base}/profile`, profileSchema, { signal }),
  });

export const useBank = () =>
  useQuery({
    queryKey: huellaKeys.bank,
    queryFn: ({ signal }) => api.get(`${base}/bank`, bankSchema, { signal }),
  });

export const useOffers = () =>
  useQuery({
    queryKey: huellaKeys.offers,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/offers`, z.array(offerSummarySchema), { signal }),
  });

export const useOffer = (id: string | null) =>
  useQuery({
    queryKey: huellaKeys.offer(id ?? ""),
    enabled: id !== null,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/offers/${id}`, offerSchema, { signal }),
  });

export const useVersions = () =>
  useQuery({
    queryKey: huellaKeys.versions,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/versions`, z.array(versionSummarySchema), {
        signal,
      }),
  });

export const useVersion = (id: string | null) =>
  useQuery({
    queryKey: huellaKeys.version(id ?? ""),
    enabled: id !== null,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/versions/${id}`, versionSchema, { signal }),
  });

export const usePublicationStatus = () =>
  useQuery({
    queryKey: huellaKeys.status,
    queryFn: ({ signal }) =>
      api.get(`${base}/publication`, statusSchema, { signal }),
  });

export const usePreview = () =>
  useQuery({
    queryKey: huellaKeys.preview,
    queryFn: ({ signal }) =>
      api.get(`${base}/publication/preview`, previewSchema, { signal }),
  });

/** CV público del borrador, para la vista previa de la persona dueña. */
export const usePreviewCv = (enabled: boolean) =>
  useQuery({
    queryKey: [...huellaKeys.preview, "cv"],
    enabled,
    retry: false,
    queryFn: ({ signal }) =>
      api.get(`${base}/publication/preview/cv`, cvDocumentSchema, { signal }),
  });

/** Vista pública: el token viaja en una cabecera, nunca en la ruta de la API. */
export const usePublicProfile = (token: string) =>
  useQuery({
    queryKey: ["huella", "public", token],
    retry: false,
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      api.get(`${base}/public/profile`, publicViewSchema, {
        signal,
        headers: { "X-Huella-Token": token },
        retries: 0,
        skipRefresh: true,
      }),
  });

/** CV público: solo se pide cuando la persona lo abre. */
export const usePublicCv = (token: string, enabled: boolean) =>
  useQuery({
    queryKey: ["huella", "public-cv", token],
    enabled,
    retry: false,
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      api.get(`${base}/public/cv`, cvDocumentSchema, {
        signal,
        headers: { "X-Huella-Token": token },
        retries: 0,
        skipRefresh: true,
      }),
  });

// ───────── Escrituras ─────────
export type BankSection =
  | "experiences"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "languages";

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.put(`${base}/profile`, profileSchema, body),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.profile, data);
      refreshDerived(client);
    },
  });
}

export function useSaveNotes() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.put(`${base}/bank/notes`, bankSchema, body),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.bank, data);
      refreshDerived(client);
    },
  });
}

export function useSaveSection(section: BankSection) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (items: unknown[]) =>
      api.put(`${base}/bank/${section}`, bankSchema, { items }),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.bank, data);
      refreshDerived(client);
    },
  });
}

export type ParentKind = "experiences" | "projects";

export function useSaveAchievements(kind: ParentKind, parentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (items: unknown[]) =>
      api.put(`${base}/bank/${kind}/${parentId}/achievements`, bankSchema, {
        items,
      }),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.bank, data);
      refreshDerived(client);
    },
  });
}

export const useDerive = (kind: ParentKind, parentId: string) =>
  useMutation({
    mutationFn: () =>
      api.post(`${base}/bank/${kind}/${parentId}/derive`, derivationSchema),
  });

export const useAchievementAiPackage = (kind: ParentKind, parentId: string) =>
  useMutation({
    mutationFn: () =>
      api.post(`${base}/bank/${kind}/${parentId}/ai-package`, aiPackageSchema),
  });

export const useAchievementAiRun = (kind: ParentKind, parentId: string) =>
  useMutation({
    mutationFn: () =>
      api.post(
        `${base}/bank/${kind}/${parentId}/ai-run`,
        derivationSchema,
        undefined,
        { timeoutMs: AI_TIMEOUT_MS },
      ),
  });

export const useAchievementAiResult = (kind: ParentKind, parentId: string) =>
  useMutation({
    mutationFn: (json: string) =>
      api.post(`${base}/bank/${kind}/${parentId}/ai-result`, derivationSchema, {
        json,
      }),
  });

export function useCreateOffer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.post(`${base}/studio/offers`, offerSchema, body),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: huellaKeys.offers }),
  });
}

export function useDeleteOffer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.send("DELETE", `${base}/studio/offers/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: huellaKeys.offers });
      void client.invalidateQueries({ queryKey: huellaKeys.versions });
    },
  });
}

/** Estado, fecha de postulación, seguimiento y notas de una oferta. */
export function useUpdateTracking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.put(`${base}/studio/offers/${id}/tracking`, offerSummarySchema, body),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: huellaKeys.offers }),
  });
}

export function useGenerateCv() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.post(`${base}/studio/versions`, versionSchema, body),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.version(data.summary.id), data);
      void client.invalidateQueries({ queryKey: huellaKeys.versions });
    },
  });
}

/** Mutaciones que devuelven la versión completa y la dejan en caché. */
function useVersionMutation<TVars>(
  request: (id: string, vars: TVars) => Promise<z.infer<typeof versionSchema>>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vars }: { id: string; vars: TVars }) =>
      request(id, vars),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.version(data.summary.id), data);
      void client.invalidateQueries({ queryKey: huellaKeys.versions });
      // Marcar un envío puede pasar la oferta a «postulada».
      void client.invalidateQueries({ queryKey: huellaKeys.offers });
      refreshDerived(client);
    },
  });
}

export const useEditLine = () =>
  useVersionMutation<unknown>((id, body) =>
    api.put(`${base}/studio/versions/${id}/line`, versionSchema, body),
  );

export const useSetSentVersion = () =>
  useVersionMutation<boolean>((id, sent) =>
    api.put(
      `${base}/studio/versions/${id}/sent?sent=${sent ? "true" : "false"}`,
      versionSchema,
    ),
  );

export const useRenameVersion = () =>
  useVersionMutation<string>((id, name) =>
    api.put(`${base}/studio/versions/${id}/name`, versionSchema, { name }),
  );

export const useSetPublicVersion = () =>
  useVersionMutation<boolean>((id, isPublic) =>
    api.put(
      `${base}/studio/versions/${id}/public?isPublic=${isPublic ? "true" : "false"}`,
      versionSchema,
    ),
  );

export function useDeleteVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.send("DELETE", `${base}/studio/versions/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: huellaKeys.versions });
      refreshDerived(client);
    },
  });
}

// ───────── Tareas de IA ─────────
/** Datos de una tarea de IA (los mismos campos que `AiTaskInput` del servidor); cada tarea usa los suyos. */
export type AiTaskInput = {
  offerId?: string | null;
  focus?: string | null;
  level?: string;
  paper?: string;
  languages?: string[];
  name?: string | null;
  /** Versión del CV (o carta) que se vuelve a redactar. */
  versionId?: string | null;
  sections?: string[];
  /** Tono de la carta: `formal` o `cercano`. */
  tone?: string;
  /** Fecha de hoy en el navegador (`AAAA-MM-DD`): la de la carta, porque el servidor trabaja en UTC. */
  today?: string;
};

/** Tareas: `cv` (redacta el CV desde el banco), `profile` (redacta secciones del perfil) y `profile-translate` (reescribe el inglés). */
export type AiTaskKind = "cv" | "letter" | "profile" | "profile-translate";

const taskPath = (kind: AiTaskKind, action: "ai-package" | "ai-run" | "ai-result") =>
  `${base}/tasks/${kind}/${action}`;

/** El prompt completo de la tarea: el mismo texto que recibe el proveedor configurado. */
export const fetchAiTaskPackage = (kind: AiTaskKind, input: AiTaskInput) =>
  api.post(taskPath(kind, "ai-package"), aiTaskPackageSchema, input);

/** Ejecuta la tarea con el proveedor de IA configurado (tarda: nginx da 150 s). */
export const runAiTask = (kind: AiTaskKind, input: AiTaskInput) =>
  api.post(taskPath(kind, "ai-run"), aiTaskOutcomeSchema, input, {
    timeoutMs: AI_TIMEOUT_MS,
  });

/** Importa la respuesta que devolvió una IA externa. */
export const importAiTask = (
  kind: AiTaskKind,
  input: AiTaskInput,
  json: string,
) => api.post(taskPath(kind, "ai-result"), aiTaskOutcomeSchema, { ...input, json });

/** Tras una tarea de IA se refrescan los CV y el contenido del perfil. */
export function refreshAfterAiTask(client: QueryClient) {
  void client.invalidateQueries({ queryKey: huellaKeys.versions });
  void client.invalidateQueries({ queryKey: huellaKeys.letters });
  void client.invalidateQueries({ queryKey: huellaKeys.offers });
  void client.invalidateQueries({ queryKey: huellaKeys.content });
  void client.invalidateQueries({ queryKey: huellaKeys.profile });
  refreshDerived(client);
}

// ───────── Contenido del perfil público ─────────
export const useProfileContent = () =>
  useQuery({
    queryKey: huellaKeys.content,
    queryFn: ({ signal }) =>
      api.get(`${base}/profile/content`, contentViewSchema, { signal }),
  });

export function useSaveContentSection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ section, body }: { section: string; body: unknown }) =>
      api.put(`${base}/profile/content/${section}`, contentViewSchema, body),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.content, data);
      void client.invalidateQueries({ queryKey: huellaKeys.profile });
      refreshDerived(client);
    },
  });
}

// ───────── Cartas de presentación ─────────
export const useLetters = () =>
  useQuery({
    queryKey: huellaKeys.letters,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/letters`, z.array(letterSummarySchema), { signal }),
  });

export const useLetter = (id: string | null) =>
  useQuery({
    queryKey: huellaKeys.letter(id ?? ""),
    enabled: id !== null,
    queryFn: ({ signal }) =>
      api.get(`${base}/studio/letters/${id}`, letterSchema, { signal }),
  });

/** Mutaciones que devuelven la carta completa y la dejan en caché. */
function useLetterMutation<TVars>(
  request: (id: string, vars: TVars) => Promise<z.infer<typeof letterSchema>>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vars }: { id: string; vars: TVars }) => request(id, vars),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.letter(data.summary.id), data);
      void client.invalidateQueries({ queryKey: huellaKeys.letters });
      // Marcar un envío puede pasar la oferta a «postulada».
      void client.invalidateQueries({ queryKey: huellaKeys.offers });
    },
  });
}

export const useSaveLetter = () =>
  useLetterMutation<unknown>((id, body) =>
    api.put(`${base}/studio/letters/${id}/content`, letterSchema, body),
  );

export const useRenameLetter = () =>
  useLetterMutation<string>((id, name) =>
    api.put(`${base}/studio/letters/${id}/name`, letterSchema, { name }),
  );

export const useSetSentLetter = () =>
  useLetterMutation<boolean>((id, sent) =>
    api.put(
      `${base}/studio/letters/${id}/sent?sent=${sent ? "true" : "false"}`,
      letterSchema,
    ),
  );

export function useDeleteLetter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.send("DELETE", `${base}/studio/letters/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: huellaKeys.letters });
      void client.invalidateQueries({ queryKey: huellaKeys.offers });
    },
  });
}

/** Descarga la carta como PDF o Word (.docx) con la sesión vigente. */
export async function downloadLetter(
  id: string,
  format: "pdf" | "docx",
  fileName: string,
) {
  const blob = await api.blob(`${base}/studio/letters/${id}/${format}`, {
    retries: 0,
  });
  saveFile(blob, fileName);
}

/** Descarga el PDF de una versión con la sesión vigente y lo entrega al navegador como archivo. */
export async function downloadCvPdf(id: string, fileName: string) {
  const blob = await api.blob(`${base}/studio/versions/${id}/pdf`, {
    retries: 0,
  });
  saveFile(blob, fileName);
}

/** Descarga el CV de una versión como archivo Word (.docx), que también abre Google Docs. */
export async function downloadCvDocx(id: string, fileName: string) {
  const blob = await api.blob(`${base}/studio/versions/${id}/docx`, {
    retries: 0,
  });
  saveFile(blob, fileName);
}

/** Entrega un archivo generado en el navegador (PDF, Word o el prompt para una IA externa). */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ───────── IA automática ─────────
export const useAiSettings = () =>
  useQuery({
    queryKey: huellaKeys.ai,
    queryFn: ({ signal }) =>
      api.get(`${base}/ai/settings`, aiSettingsSchema, { signal }),
  });

export function useSaveAiCredential() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      provider,
      ...body
    }: {
      provider: string;
      apiKey: string | null;
      model: string;
      makeActive: boolean;
    }) => api.put(`${base}/ai/settings/${provider}`, aiSettingsSchema, body),
    onSuccess: (data) => client.setQueryData(huellaKeys.ai, data),
  });
}

export function useDeleteAiCredential() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      api.send("DELETE", `${base}/ai/settings/${provider}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: huellaKeys.ai }),
  });
}

export const useAiModels = () =>
  useMutation({
    mutationFn: ({
      provider,
      apiKey,
    }: {
      provider: string;
      apiKey: string | null;
    }) =>
      api.post(
        `${base}/ai/settings/${provider}/models`,
        z.array(aiModelSchema),
        { apiKey },
        { timeoutMs: 60_000 },
      ),
  });

function usePublicationMutation(path: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`${base}/publication/${path}`, publicationResultSchema),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.status, data.status);
      void client.invalidateQueries({ queryKey: huellaKeys.profile });
    },
  });
}

export const usePublish = () => usePublicationMutation("publish");
export const useRegenerateLink = () => usePublicationMutation("link");

export function useUnpublish() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`${base}/publication/unpublish`, statusSchema),
    onSuccess: (data) => {
      client.setQueryData(huellaKeys.status, data);
      void client.invalidateQueries({ queryKey: huellaKeys.profile });
    },
  });
}
