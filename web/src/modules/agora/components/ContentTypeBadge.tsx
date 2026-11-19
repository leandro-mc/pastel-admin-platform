import { Badge } from "@/core/ui";
import type { ContentType } from "../api/schemas";
import { strings } from "../strings";

export const contentTypeLabels: Record<ContentType, string> = {
  facts: strings.contentType.facts,
  analysis: strings.contentType.analysis,
  opinion: strings.contentType.opinion,
};

export const contentTypeHints: Record<ContentType, string> = {
  facts: strings.contentType.factsHint,
  analysis: strings.contentType.analysisHint,
  opinion: strings.contentType.opinionHint,
};

/** Tipo de contenido (hechos, análisis u opinión), siempre visible para no confundir hechos con opinión. */
export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span title={contentTypeHints[type]}>
      <Badge variant="accent">{contentTypeLabels[type]}</Badge>
    </span>
  );
}
