import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { iconButton } from "./styles";
import { settingsStrings } from "./strings";

/** Diálogo modal accesible (foco atrapado, Escape cierra, `aria-labelledby` por el título). */
export function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-4"
    >
      <Modal className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface-raised shadow-lg outline-none">
        <AriaDialog className="flex flex-col gap-4 p-6 outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Heading slot="title" className="text-lg font-semibold text-fg">
                {title}
              </Heading>
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={settingsStrings.common.close}
              className={iconButton}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
