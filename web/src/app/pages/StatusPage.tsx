import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import { routes } from "../routes";
import { strings } from "../strings";

type Props = {
  icon: LucideIcon;
  title: string;
  message: string;
  /** Código de soporte (`traceId`) para dar a administración. */
  supportCode?: string;
  onRetry?: () => void;
  /** Oculta la salida al inicio (por ejemplo, cuando ya se está en él). */
  hideHome?: boolean;
};

/** Base de las pantallas 403, 404 y de error: título enfocable, mensaje claro y una salida visible. */
export default function StatusPage({
  icon: Icon,
  title,
  message,
  supportCode,
  onRetry,
  hideHome,
}: Props) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-surface text-muted ring-1 ring-line">
        <Icon aria-hidden="true" className="size-8" />
      </span>
      <h1 tabIndex={-1} className="text-2xl font-semibold text-fg outline-none">
        {title}
      </h1>
      <p className="text-fg-secondary">{message}</p>
      {supportCode ? (
        <p className="text-sm text-muted">
          {strings.supportCode}:{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-fg">
            {supportCode}
          </code>
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-xl bg-accent-strong px-5 font-medium text-on-accent"
          >
            {strings.retry}
          </button>
        ) : null}
        {hideHome ? null : (
          <Link
            to={routes.home}
            className="inline-flex min-h-11 items-center rounded-xl px-5 font-medium text-fg ring-1 ring-line-strong"
          >
            {strings.backHome}
          </Link>
        )}
      </div>
    </section>
  );
}
