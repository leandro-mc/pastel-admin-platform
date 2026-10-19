import { Link, Navigate } from "react-router";
import { useAuth } from "@/core/auth";
import { soleProductModule, useAccessibleModules } from "../modules";
import { routes } from "../routes";
import { shellStrings } from "../strings";

const { hub } = shellStrings;

/** Hub (`/`): módulos accesibles. Sin cifras ni datos de ejemplo. Con un solo módulo en el paquete, entra directo. */
export default function HubPage() {
  const { status, user } = useAuth();
  const modules = useAccessibleModules();
  if (soleProductModule)
    return <Navigate to={soleProductModule.basePath} replace />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 tabIndex={-1} className="text-2xl font-semibold outline-none">
        {hub.title}
      </h1>
      {user ? (
        <p className="mt-1 text-fg-secondary">{user.displayName}</p>
      ) : null}
      {modules.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-fg-secondary">
          {status === "authenticated" ? hub.empty : hub.anonymous}
          {status === "authenticated" ? null : (
            <>
              {" "}
              <Link to={routes.login} className="font-medium text-fg underline">
                {shellStrings.account.signIn}
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <li key={m.code} data-module={m.code}>
              <Link
                to={m.basePath}
                className="flex h-full min-h-28 items-start gap-4 rounded-2xl border border-line bg-surface p-5 outline-none hover:border-accent focus-visible:ring-3 focus-visible:ring-accent-strong/45"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <m.icon aria-hidden="true" className="size-6" />
                </span>
                <span>
                  <span className="block text-lg font-semibold text-fg">
                    {m.name}
                  </span>
                  <span className="block text-sm text-muted">{m.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { HubPage as Component };
