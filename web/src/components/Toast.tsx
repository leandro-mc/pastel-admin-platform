import { Check, CircleHelp } from "lucide-react";
import type { Notice } from "../types";

type ToastProps = {
  notice: Notice | null;
  onDismiss: () => void;
};

export default function Toast({ notice, onDismiss }: ToastProps) {
  if (!notice) {
    return null;
  }

  return (
    <div role="status" className={`toast ${notice.tone}`}>
      <span className="toast-symbol">
        {notice.tone === "success" ? (
          <Check size={17} />
        ) : (
          <CircleHelp size={17} />
        )}
      </span>
      <span>{notice.message}</span>
      <button
        className="toast-close"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>
  );
}
