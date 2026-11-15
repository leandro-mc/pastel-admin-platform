import { Link } from "react-aria-components";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "@/core/modules/types";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import AccountMenu from "./AccountMenu";
import AppSwitcher from "./AppSwitcher";
import Breadcrumbs from "./Breadcrumbs";
import DevRoleSelector from "./DevRoleSelector";
import HelpButton from "./HelpButton";
import type { Crumb } from "./navigation";
import PreferencesMenu from "./PreferencesMenu";
import SimulationBanner from "./SimulationBanner";

/**
 * Barra superior: solo acciones globales entre aplicaciones (ayuda, preferencias, cuenta y, si corresponde, el selector
 * del modo desarrollador). Nada propio de una app. A la izquierda, el control de app en pantallas sin barra lateral y
 * las migas reales de la ruta en escritorio. Es fija y arrastra consigo el aviso de vista previa.
 */
export default function TopBar({
  trail,
  module,
}: {
  trail: readonly Crumb[];
  module: ModuleManifest | null;
}) {
  const { status } = useAuth();
  return (
    <div className="shell-header">
      <header className="shell-topbar">
        <div className="shell-topbar-start">
          <div className="min-w-0 lg:hidden">
            <AppSwitcher variant="topbar" current={module} />
          </div>
          <div className="hidden min-w-0 lg:block">
            <Breadcrumbs trail={trail} />
          </div>
        </div>
        <div className="shell-topbar-end">
          <DevRoleSelector />
          <HelpButton />
          {status === "authenticated" ? <AccountMenu /> : null}
          {status === "anonymous" ? (
            <>
              <PreferencesMenu />
              <Link href={routes.login} className="shell-btn shell-btn-solid">
                {shellStrings.account.signIn}
              </Link>
            </>
          ) : null}
        </div>
      </header>
      <SimulationBanner />
    </div>
  );
}
