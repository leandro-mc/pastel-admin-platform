import { Link, useLocation } from "react-router";
import { Flower2 } from "lucide-react";
import { useAuth } from "@/core/auth";
import { productModules } from "../modules";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import AccountMenu from "./AccountMenu";
import HelpButton from "./HelpButton";
import ModuleSwitcher from "./ModuleSwitcher";
import { barButton } from "./styles";

/** Marca y contexto dinámico: la flor permanece; el nombre y el destino corresponden a la app actual. */
export default function TopBar() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  const current = productModules.find(
    (module) =>
      pathname === module.basePath || pathname.startsWith(module.basePath + "/"),
  );
  const isWorkspace = pathname.startsWith(routes.settings);
  const agora = productModules.find((module) => module.code === "agora");
  const appName = current?.name ?? (isWorkspace ? "Pastel Workspace" : agora?.name ?? shellStrings.brand);
  const home = current?.basePath ?? (isWorkspace ? routes.settings : agora?.basePath ?? routes.home);

  return (
    <header
      data-module={current?.code}
      className="sticky top-0 z-40 border-b border-line bg-surface"
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 sm:px-5">
        <Link
          to={home}
          className={`${barButton} gap-2 pl-1 text-left`}
          aria-label={`Ir al inicio de ${appName}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl rounded-bl-sm border border-line-strong bg-accent-soft text-accent-strong">
            <Flower2 aria-hidden="true" className="size-6" strokeWidth={1.7} />
          </span>
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <strong className="truncate text-base font-bold tracking-tight text-fg sm:text-lg">{appName}</strong>
            <small className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">
              {isWorkspace ? "Workspace" : "App"}
            </small>
          </span>
        </Link>
        <ModuleSwitcher />
        <div className="ml-auto flex items-center gap-1">
          <HelpButton />
          {status === "authenticated" ? (
            <AccountMenu />
          ) : pathname !== routes.login ? (
            <Link to={routes.login} className={barButton}>
              {shellStrings.account.signIn}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
