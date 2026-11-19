import { Alert, PageHeader } from "@/core/ui";
import { ContentTypeBadge, contentTypeHints } from "../components/ContentTypeBadge";
import { AgoraPage } from "../components/Feedback";
import { SealBadge } from "../components/SealBadge";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { strings } from "../strings";
import type { Seal } from "../api/schemas";

const example = (state: Seal["state"]): Seal => ({
  state,
  activeReviews: state === "verified" ? 1 : 0,
  requiredReviews: 1,
  verifiers: [],
});

/**
 * Estándares editoriales (AG-COR-01). Describe cómo funciona la plataforma; la política completa de correcciones
 * la redacta y aprueba el propietario antes del lanzamiento (condición de lanzamiento, no de desarrollo).
 */
export function Component() {
  useDocumentTitle(strings.standards.title);
  const sealRows: { state: Seal["state"]; text: string }[] = [
    { state: "verified", text: strings.seal.explainVerified },
    { state: "pending", text: strings.seal.explainPending },
    { state: "modifiedAfterVerification", text: strings.seal.explainModified },
  ];
  const types = ["facts", "analysis", "opinion"] as const;

  return (
    <AgoraPage>
      <PageHeader
        title={strings.standards.title}
        description={strings.standards.description}
      />
      <Alert variant="info" message={strings.standards.provisional} />

      <section aria-labelledby="std-seal" className="flex flex-col gap-3">
        <h2 id="std-seal" className="text-xl font-bold tracking-tight text-fg">
          {strings.standards.sealTitle}
        </h2>
        <p className="text-fg-secondary">{strings.standards.sealIntro}</p>
        <ul className="flex flex-col gap-3">
          {sealRows.map((row) => (
            <li key={row.state} className="flex flex-col items-start gap-1.5">
              <SealBadge seal={example(row.state)} compact />
              <p className="leading-relaxed text-fg-secondary">{row.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="std-types" className="flex flex-col gap-3">
        <h2 id="std-types" className="text-xl font-bold tracking-tight text-fg">
          {strings.standards.typesTitle}
        </h2>
        <p className="text-fg-secondary">{strings.standards.typesIntro}</p>
        <ul className="flex flex-col gap-3">
          {types.map((type) => (
            <li key={type} className="flex flex-col items-start gap-1.5">
              <ContentTypeBadge type={type} />
              <p className="text-fg-secondary">{contentTypeHints[type]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="std-separation" className="flex flex-col gap-2">
        <h2 id="std-separation" className="text-xl font-bold tracking-tight text-fg">
          {strings.standards.separationTitle}
        </h2>
        <p className="max-w-prose leading-relaxed text-fg-secondary">
          {strings.standards.separationBody}
        </p>
      </section>

      <section aria-labelledby="std-corrections" className="flex flex-col gap-2">
        <h2 id="std-corrections" className="text-xl font-bold tracking-tight text-fg">
          {strings.standards.correctionsTitle}
        </h2>
        <p className="max-w-prose leading-relaxed text-fg-secondary">
          {strings.standards.correctionsBody}
        </p>
      </section>

      <section aria-labelledby="std-report" className="flex flex-col gap-2">
        <h2 id="std-report" className="text-xl font-bold tracking-tight text-fg">
          {strings.standards.reportTitle}
        </h2>
        <p className="max-w-prose leading-relaxed text-fg-secondary">
          {strings.standards.reportBody}
        </p>
      </section>
    </AgoraPage>
  );
}
