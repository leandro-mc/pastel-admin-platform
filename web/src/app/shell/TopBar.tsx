import { Link, useLocation } from "react-router";
import { Flower2 } from "lucide-react";
import { useAuth } from "@/core/auth";
import { soleProductModule } from "../modules";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import AccountMenu from "./AccountMenu";
import HelpButton from "./HelpButton";
import ModuleSwitcher from "./ModuleSwitcher";
import { barButton } from "./styles";

/** Barra superior. Neutra: el color pertenece a cada módulo. Con un solo módulo en el paquete adopta su marca. */
export default function TopBar() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  const brand = soleProductModule;
  const BrandIcon = brand?.icon ?? Flower2;

  return (
    <header
      data-module={brand?.code}
      className="sticky top-0 z-40 border-b border-line bg-surface"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-4">
        <Link
          to={routes.home}
          className={`${barButton} gap-2 pl-0 text-base font-semibold`}
        >
          <BrandIcon aria-hidden="true" className="size-6 text-accent" />
          <span>{brand?.name ?? shellStrings.brand}</span>
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
