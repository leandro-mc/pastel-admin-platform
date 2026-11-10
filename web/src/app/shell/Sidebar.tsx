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
 * Barra lateral (escritorio): marca, control de app, navegación de la app activa y plegado. Nada más: sin tarjetas,
 * estados ni avisos. Contraída queda un riel de iconos con nombre accesible y descripción emergente.
 */
export default function Sidebar({
  module,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const { moduleCode } = useShell();
  const label = collapsed ? shellStrings.expandNav : shellStrings.collapseNav;
  const toggle = (
    <Button
      className={barButton}
      onPress={onToggleCollapsed}
      aria-expanded={!collapsed}
      aria-label={collapsed ? label : undefined}
    >
      {collapsed ? (
        <PanelLeftOpen aria-hidden="true" />
      ) : (
        <PanelLeftClose aria-hidden="true" />
      )}
      {collapsed ? null : <span>{label}</span>}
    </Button>
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
      </div>
      <div className="shell-sidebar-app">
        <AppSwitcher variant="sidebar" current={module} collapsed={collapsed} />
      </div>
      {module ? (
        <NavList module={module} collapsed={collapsed} />
      ) : (
        <div className="flex-1" />
      )}
      <div className="shell-sidebar-foot">
        {collapsed ? (
          <TooltipTrigger delay={300}>
            {toggle}
            <Tooltip
              placement="right"
              offset={8}
              className="shell-tooltip"
              data-module={moduleCode}
            >
              {label}
            </Tooltip>
          </TooltipTrigger>
        ) : (
          toggle
        )}
      </div>
    </div>
  );
}
