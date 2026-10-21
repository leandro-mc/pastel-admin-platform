import { Link, Navigate } from "react-router";
import { productModules } from "../modules";
import { routes } from "../routes";

/** La ruta raíz abre Ágora; el catálogo de apps no sustituye el inicio público. */
export default function HubPage() {
  const agora = productModules.find((module) => module.code === "agora");

  if (agora) return <Navigate to={agora.basePath} replace />;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-12 sm:px-6">
      <h1 tabIndex={-1} className="text-2xl font-semibold text-fg">
        Ágora no está disponible en esta compilación
      </h1>
      <p className="text-fg-secondary">
        Esta instancia no incluye la aplicación predeterminada. Vuelva a
        intentarlo más tarde o ingrese a su cuenta.
      </p>
      <Link
        to={routes.login}
        className="self-start rounded-xl px-3 py-2 font-medium text-accent-strong underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      >
        Ingresar
      </Link>
    </section>
  );
}

export { HubPage as Component };
