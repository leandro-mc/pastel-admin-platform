import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

/** Diálogo de confirmación con acciones explícitas y estado pendiente. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  pendingLabel = confirmLabel,
  pending = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} description={message} onClose={onClose}>
      {children}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={pending}
          loading={pending}
          loadingLabel={pendingLabel}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
