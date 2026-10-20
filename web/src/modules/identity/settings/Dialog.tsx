import type { ReactNode } from "react";
import { Dialog as CoreDialog } from "@/core/ui";
import { iconButton } from "./styles";
import { settingsStrings } from "./strings";

type DialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Wrapper de Identity que conserva sus textos y clases y utiliza el modal compartido. */
export function Dialog({ title, description, onClose, children }: DialogProps) {
  return (
    <CoreDialog
      title={title}
      description={description}
      onClose={onClose}
      closeLabel={settingsStrings.common.close}
      closeButtonClassName={iconButton}
    >
      {children}
    </CoreDialog>
  );
}
