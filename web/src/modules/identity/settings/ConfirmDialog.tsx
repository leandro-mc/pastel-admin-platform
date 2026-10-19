import { primaryButton, secondaryButton } from "../styles";
import { Dialog } from "./Dialog";
import { settingsStrings } from "./strings";

/** Confirmación de una acción que cambia el acceso de una cuenta. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} description={message} onClose={onClose}>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className={secondaryButton}>
          {settingsStrings.common.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={primaryButton}
        >
          {pending ? settingsStrings.common.saving : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
