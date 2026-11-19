import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Flag,
  ListChecks,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { loginPath } from "@/core/routes";
import { Alert, Button } from "@/core/ui";
import { useSetReaction, useSetSaved } from "../api/mutations";
import { useViewer } from "../api/queries";
import type { ArticleDetail, ReactionKind } from "../api/schemas";
import { describeError } from "../lib/format";
import { useFollowing } from "../lib/useFollowing";
import { agoraPaths, shareUrl } from "../paths";
import { agoraPermissions } from "../permissions";
import { strings } from "../strings";
import { ReportErrorDialog } from "./ReportErrorDialog";
import { sealLabel } from "./SealBadge";

type PendingAction = "guardar" | "ayudo" | "fuentes";

const linkButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none";

/**
 * Acciones sobre una pieza. Compartir y copiar el enlace son para todas las personas; guardar, reaccionar y señalar un
 * error piden sesión (sin sesión, se lleva a iniciar sesión y la acción se retoma al volver) y el permiso del servidor.
 */
export function ArticleActions({ article }: { article: ArticleDetail }) {
  const { card } = article;
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const [reporting, setReporting] = useState(false);
  const following = useFollowing();

  const signedIn = auth.status === "authenticated";
  const canInteract = signedIn && auth.hasPermission(agoraPermissions.saved);
  const viewer = useViewer(card.slug, { enabled: canInteract });
  const setSaved = useSetSaved();
  const setReaction = useSetReaction();

  const saved = viewer.data?.saved ?? false;
  const reactions = viewer.data?.reactions ?? [];
  const followsTopic = following.slugs.includes(card.categorySlug);

  const requireSession = (action: string): boolean => {
    if (auth.status === "loading") return false;
    if (signedIn) return true;
    void navigate(loginPath(`${agoraPaths.article(card.slug)}?accion=${action}`));
    return false;
  };

  const onFail = (error: unknown) => notify(describeError(error), "error");

  const toggleSaved = () => {
    if (!requireSession("guardar") || !canInteract) return;
    setSaved.mutate({ slug: card.slug, saved: !saved }, { onError: onFail });
  };

  const toggleReaction = (kind: ReactionKind, action: string) => {
    if (!requireSession(action) || !canInteract) return;
    setReaction.mutate(
      { slug: card.slug, kind, on: !reactions.includes(kind) },
      { onError: onFail },
    );
  };

  // Retoma la acción que la persona pidió antes de iniciar sesión (una sola vez) y limpia la dirección.
  const applied = useRef(false);
  const pending = params.get("accion") as PendingAction | null;
  useEffect(() => {
    if (!pending || applied.current || !canInteract || !viewer.data) return;
    applied.current = true;
    if (pending === "guardar" && !viewer.data.saved)
      setSaved.mutate({ slug: card.slug, saved: true });
    if (pending === "ayudo" && !viewer.data.reactions.includes("helped"))
      setReaction.mutate({ slug: card.slug, kind: "helped", on: true });
    if (pending === "fuentes" && !viewer.data.reactions.includes("moreSources"))
      setReaction.mutate({ slug: card.slug, kind: "moreSources", on: true });
    const next = new URLSearchParams(params);
    next.delete("accion");
    setParams(next, { replace: true });
  }, [pending, canInteract, viewer.data, card.slug, params, setParams, setSaved, setReaction]);

  const url = shareUrl(card.slug, window.location.origin);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `${card.title}\n${sealLabel(card.seal)}\n${url}`,
  )}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify(strings.article.linkCopied);
    } catch {
      notify(strings.article.linkCopyFailed, "error");
    }
  };

  const toggle = (
    pressed: boolean,
    onClick: () => void,
    icon: ReactNode,
    label: string,
    busy = false,
  ) => (
    <Button variant="secondary" aria-pressed={pressed} onClick={onClick} disabled={busy}>
      {icon}
      {label}
    </Button>
  );

  return (
    <section aria-label="Acciones" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {signedIn && !canInteract ? null : (
          <>
            {toggle(
              saved,
              toggleSaved,
              saved ? (
                <BookmarkCheck aria-hidden="true" size={18} />
              ) : (
                <Bookmark aria-hidden="true" size={18} />
              ),
              saved ? strings.article.saved : strings.article.save,
              setSaved.isPending,
            )}
            {toggle(
              reactions.includes("helped"),
              () => toggleReaction("helped", "ayudo"),
              <ThumbsUp aria-hidden="true" size={18} />,
              strings.article.helped,
              setReaction.isPending,
            )}
            {toggle(
              reactions.includes("moreSources"),
              () => toggleReaction("moreSources", "fuentes"),
              <ListChecks aria-hidden="true" size={18} />,
              strings.article.moreSources,
              setReaction.isPending,
            )}
          </>
        )}
        {toggle(
          followsTopic,
          () => following.toggle(card.categorySlug),
          null,
          followsTopic
            ? strings.article.following(card.categoryName)
            : strings.article.follow(card.categoryName),
          following.pending,
        )}
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkButton}>
          <Share2 aria-hidden="true" size={18} />
          {strings.article.share}
        </a>
        <Button variant="secondary" onClick={() => void copyLink()}>
          <Copy aria-hidden="true" size={18} />
          {strings.article.copyLink}
        </Button>
        {signedIn && !canInteract ? null : (
          <Button
            variant="ghost"
            onClick={() => {
              if (requireSession("error") && canInteract) setReporting(true);
            }}
          >
            <Flag aria-hidden="true" size={18} />
            {strings.article.reportError}
          </Button>
        )}
      </div>

      {auth.status === "anonymous" ? (
        <p className="text-sm text-muted">{strings.article.loginToAct}</p>
      ) : null}
      {signedIn && !canInteract ? (
        <Alert variant="info" message={strings.common.noPermission} />
      ) : null}
      {reporting ? (
        <ReportErrorDialog slug={card.slug} onClose={() => setReporting(false)} />
      ) : null}
    </section>
  );
}
