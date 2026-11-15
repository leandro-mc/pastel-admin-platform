import { ArrowRight, BookOpenText, Landmark } from "lucide-react";
import { Link } from "react-router";
import { useAuth, useAuthOptions } from "@/core/auth";
import { routes } from "@/core/routes";
import { strings } from "../strings";

/**
 * Portada pública de Ágora.
 * No representa publicaciones ficticias: el feed real es una funcionalidad pendiente.
 */
export function Component() {
  const auth = useAuth();
  const options = useAuthOptions();
  const authenticated = auth.status === "authenticated";

  return (
    <div
      data-module="agora"
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-9"
    >
      <section className="agora-hero" aria-labelledby="agora-title">
        <div className="agora-hero-copy">
          <span className="agora-eyebrow">
            Divulgación · Humanidades · Actualidad
          </span>
          <h1 id="agora-title" className="agora-hero-title">
            Ideas para comprender el mundo.
          </h1>
          <p className="agora-hero-description">
            {strings.tagline}. Un espacio para encontrarse con nuevas
            perspectivas, explorar ideas y mirar la actualidad con curiosidad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={authenticated ? routes.account : routes.login}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
            >
              {authenticated ? "Mi cuenta" : "Ingresar"}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            {!authenticated && options.data?.localRegistration ? (
              <Link
                to={`${routes.login}?modo=registro`}
                className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
              >
                Crear una cuenta
              </Link>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            La portada pública se puede consultar sin iniciar sesión.
          </p>
        </div>
        <div className="agora-hero-art" aria-hidden="true">
          <span className="agora-art-orbit" />
          <span className="agora-art-orbit agora-art-orbit-two" />
          <span className="agora-art-disc" />
          <span className="agora-art-icon">
            <Landmark size={55} strokeWidth={1.35} />
          </span>
          <span className="agora-art-dot agora-art-dot-one" />
          <span className="agora-art-dot agora-art-dot-two" />
        </div>
      </section>

      <section
        className="flex flex-col gap-4"
        aria-labelledby="agora-feed-title"
      >
        <header className="agora-feed-heading">
          <div>
            <p className="mb-1 text-xs font-bold tracking-[0.16em] text-accent-strong uppercase">
              El espacio público
            </p>
            <h2
              id="agora-feed-title"
              className="text-xl font-bold tracking-tight text-fg sm:text-2xl"
            >
              Publicaciones recientes
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Aquí se mostrará el contenido público de Ágora.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <BookOpenText aria-hidden="true" size={15} />
            Feed público
          </span>
        </header>

        <div className="agora-feed-empty">
          <div className="flex max-w-xl flex-col items-center gap-3">
            <span className="agora-feed-empty-icon">
              <BookOpenText aria-hidden="true" size={25} />
            </span>
            <h3 className="text-lg font-bold tracking-tight text-fg">
              El feed está en preparación
            </h3>
            <p className="max-w-lg text-sm leading-relaxed text-muted">
              La portada pública y su identidad visual están preparadas, pero
              todavía no hay publicaciones conectadas a esta versión. No
              mostramos contenido de ejemplo como si fuera real.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
