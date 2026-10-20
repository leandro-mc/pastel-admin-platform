import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { uiStrings } from "./strings";
import { iconButton } from "./styles";

export type DialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  closeButtonClassName?: string;
  maxWidthClassName?: string;
  className?: string;
};

/** Diálogo modal con foco administrado, Escape y título accesible. */
export function Dialog({
  title,
  description,
  onClose,
  children,
  closeLabel = uiStrings.common.close,
  closeButtonClassName = iconButton,
  maxWidthClassName = "max-w-lg",
  className = "",
}: DialogProps) {
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => { if (!open) onClose(); }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-4"
    >
      <Modal className={`max-h-full w-full ${maxWidthClassName} overflow-y-auto rounded-2xl border border-line bg-surface-raised shadow-lg outline-none`.trim()}>
        <AriaDialog className={`flex flex-col gap-4 p-6 outline-none ${className}`.trim()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Heading slot="title" className="text-lg font-semibold text-fg">{title}</Heading>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label={closeLabel} className={closeButtonClassName}>
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
