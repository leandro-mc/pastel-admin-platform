import { CircleAlert, CircleCheck, Inbox, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StateViewStatus = "loading" | "empty" | "error" | "success";
type StateViewProps = {
  status: StateViewStatus;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: LucideIcon;
};

const icons: Record<StateViewStatus, LucideIcon> = {
  loading: LoaderCircle,
  empty: Inbox,
  error: CircleAlert,
  success: CircleCheck,
};

/** Estado de carga, vacío, error o éxito con semántica y jerarquía uniformes. */
export function StateView({ status, title, description, action, className = "", icon }: StateViewProps) {
  const Icon = icon ?? icons[status];
  const isError = status === "error";
  return (
    <section
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center ${className}`.trim()}
    >
      <Icon aria-hidden="true" className={`size-7 shrink-0 ${isError ? "text-danger" : "text-accent-strong"} ${status === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`.trim()} />
      <div className="max-w-xl">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </section>
  );
}
