import { useAuth } from "@/core/auth";
import { useSetFollow } from "../api/mutations";
import { useFollowed } from "../api/queries";
import { agoraPermissions } from "../permissions";
import { useLocalFollows } from "./preferences";

/**
 * Categorías que sigue la persona. Con sesión y permiso se guardan en la cuenta; si no, solo en este navegador
 * (una persona anónima puede seguir temas sin registrarse).
 */
export function useFollowing() {
  const auth = useAuth();
  const server =
    auth.status === "authenticated" && auth.hasPermission(agoraPermissions.saved);
  const followed = useFollowed({ enabled: server });
  const [local, toggleLocal] = useLocalFollows();
  const setFollow = useSetFollow();

  const slugs = server ? (followed.data?.categorySlugs ?? []) : local;
  const toggle = (slug: string) => {
    if (server) setFollow.mutate({ slug, following: !slugs.includes(slug) });
    else toggleLocal(slug);
  };
  return { slugs, toggle, pending: setFollow.isPending, server };
}
