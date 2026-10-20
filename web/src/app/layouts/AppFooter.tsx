import { Link, useLocation } from "react-router";
import { productModules } from "../modules";
import { routes } from "../routes";

/** Pie persistente: conserva el cierre visual sin mezclar la navegación de diferentes apps. */
export default function AppFooter() {
  const { pathname } = useLocation();
  const current = productModules.find(
    (module) =>
      pathname === module.basePath || pathname.startsWith(module.basePath + "/"),
  );
  const isWorkspace = pathname.startsWith(routes.settings);
  const agora = productModules.find((module) => module.code === "agora");
  const contextName = current?.name ?? (isWorkspace ? "Pastel Workspace" : agora?.name ?? "Pastel");
  const home = current?.basePath ?? (isWorkspace ? routes.settings : agora?.basePath ?? routes.home);

  return (
    <footer
      data-module={current?.code}
      className="border-t border-line bg-surface/80"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-muted sm:px-6">
        <span>© {new Date().getFullYear()} Pastel</span>
        <span>Todo en su lugar. Todo fluye mejor.</span>
        <Link
          to={home}
          className="rounded-lg font-medium text-accent-strong underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          Inicio de {contextName}
        </Link>
      </div>
    </footer>
  );
}
