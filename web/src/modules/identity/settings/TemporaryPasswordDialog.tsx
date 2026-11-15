import { KeyRound } from "lucide-react";
import { useNotify } from "@/core/notifications";
import { primaryButton, secondaryButton } from "../styles";
import { Dialog } from "./Dialog";
import { settingsStrings } from "./strings";

const t = settingsStrings.temporaryPassword;

/** Muestra la contraseña temporal una sola vez; el servidor no la vuelve a entregar. */
export function TemporaryPasswordDialog({
  password,
  onClose,
}: {
  password: string;
  onClose: () => void;
}) {
  const notify = useNotify();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      notify(t.copied, "success");
    } catch {
      notify(t.copyError, "error");
    }
  };

  return (
    <Dialog title={t.title} description={t.hint} onClose={onClose}>
      <p
        aria-label={t.title}
        className="rounded-xl border border-line-strong bg-app px-4 py-3 text-center font-mono text-lg text-fg select-all"
      >
        {password}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className={`${secondaryButton} w-full`}
      >
        <KeyRound aria-hidden="true" size={16} />
        {t.copy}
      </button>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={primaryButton}>
          {t.done}
        </button>
      </div>
    </Dialog>
  );
}
