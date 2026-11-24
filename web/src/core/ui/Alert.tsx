import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { uiStrings } from "./strings";
import { errorAlert } from "./styles";

export type AlertVariant = "error" | "warning" | "success" | "info";
type AlertProps = {
  variant?: AlertVariant;
  message: ReactNode;
  supportCode?: string | null;
  supportCodeLabel?: string;
  className?: string;
};

type AlertPresentation = {
  Icon: LucideIcon;
  className: string;
  iconClass: string;
  role: "alert" | "status";
};

const presentation: Record<AlertVariant, AlertPresentation> = {
  error: {
    Icon: CircleAlert,
    className: errorAlert,
    iconClass: "text-danger",
    role: "alert",
  },
  warning: {
    Icon: TriangleAlert,
    className:
      "rounded-xl border border-warning/40 border-l-4 border-l-warning bg-warning-soft px-4 py-3 text-sm text-fg",
    iconClass: "text-warning",
    role: "status",
  },
  success: {
    Icon: CircleCheck,
    className:
      "rounded-xl border border-success/30 border-l-4 border-l-success bg-success-soft px-4 py-3 text-sm text-fg",
    iconClass: "text-success",
    role: "status",
  },
  info: {
    Icon: Info,
    className:
      "rounded-xl border border-info/30 border-l-4 border-l-info bg-info-soft px-4 py-3 text-sm text-fg",
    iconClass: "text-info",
    role: "status",
  },
};

/** Aviso visual accesible con texto y, opcionalmente, código de soporte. */
export function Alert({
  variant = "info",
  message,
  supportCode,
  supportCodeLabel = uiStrings.common.supportCode,
  className = "",
}: AlertProps) {
  const config = presentation[variant];
  const Icon = config.Icon;
  return (
    <div
      role={config.role}
      aria-live={config.role === "alert" ? "assertive" : "polite"}
      className={`${config.className} flex items-start gap-3 ${className}`.trim()}
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-5 shrink-0 ${config.iconClass}`}
      />
      <div className="min-w-0">
        <p>{message}</p>
        {supportCode ? (
          <p className="mt-1 text-xs text-muted">
            {supportCodeLabel}: <code>{supportCode}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
