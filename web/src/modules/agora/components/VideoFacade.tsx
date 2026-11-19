import { CirclePlay, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { Video } from "../api/schemas";
import { embedUrl, watchUrl } from "../lib/video";
import { strings } from "../strings";

/**
 * Video de YouTube con fachada (AG-PIE-01): no se carga nada de YouTube hasta que la persona lo pide.
 * Siempre ofrece el enlace directo, que también sirve si el navegador bloquea la incrustación.
 */
export function VideoFacade({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const src = embedUrl(video.youTubeId);
  const link = watchUrl(video.youTubeId);
  if (src === null || link === null) return null;

  return (
    <figure className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-surface-raised">
        {playing ? (
          <iframe
            src={src}
            title={video.title}
            className="size-full"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={strings.video.play(video.title)}
            className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-fg hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none"
          >
            <CirclePlay aria-hidden="true" size={52} strokeWidth={1.4} />
            <span className="max-w-md text-base font-semibold">{video.title}</span>
            <span className="text-xs text-muted">{strings.video.privacy}</span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-secondary">
        {video.note ? <span>{video.note}</span> : <span />}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent-strong underline underline-offset-4 hover:no-underline"
        >
          {strings.video.openOnYouTube}
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      </figcaption>
    </figure>
  );
}
