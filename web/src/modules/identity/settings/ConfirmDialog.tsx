import { Button } from "@/core/ui";
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
        <Button
          variant="secondary"
          className={secondaryButton}
          onClick={onClose}
        >
          {settingsStrings.common.cancel}
        </Button>
        <Button
          variant="primary"
          className={primaryButton}
          onClick={onConfirm}
          disabled={pending}
          loading={pending}
          loadingLabel={settingsStrings.common.saving}
        >
          {pending ? settingsStrings.common.saving : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
