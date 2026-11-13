import { Flower2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button, Link, Tooltip, TooltipTrigger } from "react-aria-components";
import type { ModuleManifest } from "@/core/modules/types";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import AppSwitcher from "./AppSwitcher";
import NavList from "./NavList";
import { useShell } from "./ShellContext";
import { barButton } from "./styles";

type Props = {
  module: ModuleManifest | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * Barra lateral (escritorio): marca y botón de plegar arriba, control de app y navegación de la app activa. Nada más:
 * sin tarjetas, estados ni avisos. Plegada queda un riel de iconos: la marca, el botón para expandir justo debajo y los
 * destinos, todos con nombre accesible y descripción emergente.
 */
export default function Sidebar({
  module,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const { moduleCode } = useShell();
  const label = collapsed ? shellStrings.expandNav : shellStrings.collapseNav;
  const toggle = (
    <TooltipTrigger delay={400}>
      <Button
        className={`${barButton} shell-collapse-btn`}
        onPress={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={label}
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden="true" />
        ) : (
          <PanelLeftClose aria-hidden="true" />
        )}
      </Button>
      <Tooltip
        placement={collapsed ? "right" : "bottom"}
        offset={8}
        className="shell-tooltip"
        data-module={moduleCode}
      >
        {label}
      </Tooltip>
    </TooltipTrigger>
  );

  return (
    <div className="shell-sidebar">
      <div className="shell-sidebar-head">
        <Link
          href={module?.basePath ?? routes.home}
          className="shell-brand"
          aria-label={shellStrings.brandHome}
        >
          <Flower2 aria-hidden="true" />
          {collapsed ? null : <span>{shellStrings.brand.toLowerCase()}</span>}
        </Link>
        {collapsed ? null : toggle}
      </div>
      {collapsed ? <div className="shell-rail-toggle">{toggle}</div> : null}
      <div className="shell-sidebar-app">
        <AppSwitcher variant="sidebar" current={module} collapsed={collapsed} />
      </div>
      {module ? (
        <NavList module={module} collapsed={collapsed} />
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
