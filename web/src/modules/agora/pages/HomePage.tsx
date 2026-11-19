import { AgoraPage, LoadError, LoadingState } from "../components/Feedback";
import { HomeView } from "../components/HomeView";
import { useHome } from "../api/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useFollowing } from "../lib/useFollowing";
import { useCalmMode } from "../lib/preferences";
import { strings } from "../strings";

/** Inicio público de Ágora: «Hoy en 5 minutos», lo reciente y un final claro. */
export function Component() {
  useDocumentTitle(strings.nav.home);
  const home = useHome();
  const following = useFollowing();
  const [calm] = useCalmMode();

  return (
    <AgoraPage>
      {home.isPending ? <LoadingState /> : null}
      {home.isError ? (
        <LoadError error={home.error} onRetry={() => void home.refetch()} />
      ) : null}
      {home.data ? (
        <HomeView data={home.data} followed={following.slugs} calm={calm} />
      ) : null}
    </AgoraPage>
  );
}
