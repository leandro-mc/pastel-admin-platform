import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { Button, CheckboxField, StateView } from "@/core/ui";
import { describeError } from "../lib/format";
import { useCalmMode } from "../lib/preferences";
import { strings } from "../strings";

export function LoadingState() {
  return <StateView status="loading" title={strings.common.loading} />;
}

export function LoadError({
  error,
  onRetry,
  title = strings.common.errorTitle,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <StateView
      status="error"
      title={title}
      description={describeError(error)}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {strings.common.retry}
          </Button>
        ) : undefined
      }
    />
  );
}

/** Interruptor del modo calma (AG-CAL-01). */
export function CalmToggle() {
  const [calm, setCalm] = useCalmMode();
  return (
    <div className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2">
      <Leaf aria-hidden="true" size={18} className="mt-3 shrink-0 text-accent-strong" />
      <CheckboxField
        label={strings.calm.label}
        description={strings.calm.hint}
        checked={calm}
        onChange={(event) => setCalm(event.target.checked)}
      />
    </div>
  );
}

/** Paginación simple (anterior / siguiente) para listados. */
export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {strings.common.previous}
      </Button>
      <span className="text-sm text-fg-secondary">
        {strings.common.pageOf(page, totalPages)}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {strings.common.next}
      </Button>
    </nav>
  );
}

/** Contenedor de página del módulo: ancho de lectura y `data-module` para el tema. */
export function AgoraPage({ children }: { children: ReactNode }) {
  return (
    <div
      data-module="agora"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-9"
    >
      {children}
    </div>
  );
}
