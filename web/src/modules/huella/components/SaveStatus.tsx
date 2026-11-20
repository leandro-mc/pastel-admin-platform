import { strings } from "../strings";
import type { SaveState } from "./useAutosaveRows";

/** Estado discreto del autoguardado (se anuncia con cortesía a lectores de pantalla). */
export function SaveStatus({ state }: { state: SaveState }) {
  const text =
    state === "saving" || state === "pending"
      ? strings.autosave.saving
      : state === "saved"
        ? strings.autosave.saved
        : "";
  return (
    <span role="status" aria-live="polite" className="text-sm text-muted">
      {text}
    </span>
  );
}
