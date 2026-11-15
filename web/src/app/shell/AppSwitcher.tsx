import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react";
import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
} from "react-aria-components";
import type { ModuleManifest } from "@/core/modules/types";
import { useAccessibleModules } from "../modules";
import { shellStrings } from "../strings";
import { appName } from "./navigation";
import { useShell } from "./ShellContext";
import { menuItem, menuSeparator, popover } from "./styles";

type Props = {
  /** `sidebar`: nombre y descripción, ancho completo. `topbar`: compacto, para pantallas sin barra lateral. */
  variant: "sidebar" | "topbar";
  current: ModuleManifest | null;
  collapsed?: boolean;
};

/**
 * Un solo control para saber en qué app se está y para cambiar de app (sustituye al selector con icono de actualizar
 * y a la tarjeta de la app activa). Con una sola app disponible es un bloque informativo, sin menú.
 */
export default function AppSwitcher({
  variant,
  current,
  collapsed = false,
}: Props) {
  const available = useAccessibleModules();
  const { moduleCode } = useShell();
  const Icon = current?.icon ?? LayoutGrid;
  const name = current ? appName(current) : shellStrings.chooseApp;
  const showCopy = !collapsed;

  // El nombre siempre está en el contenido (oculto solo visualmente al plegar) para que el nombre accesible lo incluya.
  const identity = (
    <>
      <span className="shell-app-tile" aria-hidden="true">
        <Icon />
      </span>
      <span className={showCopy ? "shell-app-copy" : "sr-only"}>
        <span className="shell-app-name">{name}</span>
        {showCopy && variant === "sidebar" && current?.tagline ? (
          <span className="shell-app-tagline">{current.tagline}</span>
        ) : null}
      </span>
    </>
  );
  const classes = `shell-app shell-app-${variant}`;

  if (available.length < 2) {
    if (!current) return null;
    return <div className={classes}>{identity}</div>;
  }

  const products = available.filter((module) => module.code !== "identity");
  const platform = available.filter((module) => module.code === "identity");

  const renderItem = (module: ModuleManifest) => {
    const selected = module.code === current?.code;
    const label = appName(module);
    return (
      <MenuItem
        key={module.code}
        id={module.code}
        href={module.basePath}
        textValue={label}
        aria-current={selected ? "page" : undefined}
        className={menuItem}
      >
        <span
          className="shell-app-tile"
          data-module={module.code}
          aria-hidden="true"
        >
          <module.icon />
        </span>
        <span className="shell-app-copy">
          <span className="shell-app-name">{label}</span>
          <span className="shell-app-tagline">{module.tagline}</span>
        </span>
        {selected ? (
          <Check
            aria-hidden="true"
            className="size-4 shrink-0 text-accent-strong"
          />
        ) : null}
      </MenuItem>
    );
  };

  return (
    <MenuTrigger>
      <Button className={classes}>
        <span className="sr-only">{shellStrings.switchAppPrefix}</span>
        {identity}
        {showCopy ? (
          <ChevronsUpDown aria-hidden="true" className="shell-app-chevron" />
        ) : null}
      </Button>
      <Popover
        className={popover}
        placement="bottom start"
        data-module={moduleCode}
      >
        <Menu aria-label={shellStrings.modules} className="outline-none">
          {products.length > 0 ? (
            <MenuSection>{products.map(renderItem)}</MenuSection>
          ) : null}
          {products.length > 0 && platform.length > 0 ? (
            <Separator className={menuSeparator} />
          ) : null}
          {platform.length > 0 ? (
            <MenuSection>{platform.map(renderItem)}</MenuSection>
          ) : null}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
