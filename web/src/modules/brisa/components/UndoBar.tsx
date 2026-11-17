import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/core/ui";
import { strings } from "../strings";

export type BarInput =
  | { kind: "undo"; message: string; undoId: string }
  | { kind: "info" | "error"; message: string };
export type BarMessage = BarInput & { id: number };

/** El aviso con «Deshacer» queda visible 8 s (BR-19); un aviso informativo, 4 s; un error, 9 s. */
const DURATION_MS = { undo: 8000, info: 4000, error: 9000 } as const;

type UndoBarProps = {
  bar: BarMessage | null;
  busy: boolean;
  onUndo: (undoId: string) => void;
  onDismiss: () => void;
};

/**
 * Aviso inferior con acción «Deshacer» tras marcar, reabrir o eliminar. Es una región viva: los avisos se anuncian con
 * `status` y los errores con `alert`. Solo hay uno a la vez; uno nuevo reemplaza al anterior y reinicia el tiempo.
 */
export function UndoBar({ bar, busy, onUndo, onDismiss }: UndoBarProps) {
  const barId = bar?.id;
  const kind = bar?.kind;

  useEffect(() => {
    if (barId === undefined || kind === undefined) return;
    const timer = window.setTimeout(onDismiss, DURATION_MS[kind]);
    return () => window.clearTimeout(timer);
  }, [barId, kind, onDismiss]);

  if (!bar) return null;

  return (
    <div
      role={bar.kind === "error" ? "alert" : "status"}
      className="fixed inset-x-3 bottom-[calc(var(--shell-bottomnav-height)+5rem)] z-40 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-surface-raised p-2 pl-4 text-sm text-fg shadow-lg md:bottom-6 md:left-6 md:mx-0"
    >
      <span className="min-w-0 flex-1">{bar.message}</span>
      {bar.kind === "undo" ? (
        <Button
          variant="link"
          onClick={() => onUndo(bar.undoId)}
          disabled={busy}
        >
          {strings.undo.action}
        </Button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={strings.undo.dismiss}
        className="inline-grid size-11 shrink-0 place-items-center rounded-xl text-fg-secondary hover:bg-accent-soft hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
