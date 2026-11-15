import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import {
  aiApplySchema,
  aiPackageSchema,
  bankSchema,
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
  bank: ["huella", "bank"] as const,
  offers: ["huella", "offers"] as const,
  offer: (id: string) => ["huella", "offer", id] as const,
  versions: ["huella", "versions"] as const,
  version: (id: string) => ["huella", "version", id] as const,
  status: ["huella", "publication"] as const,
  preview: ["huella", "preview"] as const,
};

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
      refreshDerived(client);
    },
  });
}

export const useEditLine = () =>
  useVersionMutation<unknown>((id, body) =>
    api.put(`${base}/studio/versions/${id}/line`, versionSchema, body),
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

export const useCvAiPackage = () =>
  useMutation({
    mutationFn: (id: string) =>
      api.post(`${base}/studio/versions/${id}/ai-package`, aiPackageSchema),
  });

export function useCvAiResult() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, json }: { id: string; json: string }) =>
      api.post(`${base}/studio/versions/${id}/ai-result`, aiApplySchema, {
        json,
      }),
    onSuccess: (data) => {
      client.setQueryData(
        huellaKeys.version(data.version.summary.id),
        data.version,
      );
      void client.invalidateQueries({ queryKey: huellaKeys.versions });
      refreshDerived(client);
    },
  });
}

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
