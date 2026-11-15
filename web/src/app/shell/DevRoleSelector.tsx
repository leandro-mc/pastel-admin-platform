import { Eye } from "lucide-react";
import {
  Button,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { NO_ROLE, useDevMode } from "@/core/devmode";
import { shellStrings } from "../strings";
import { useShell } from "./ShellContext";
import { barButton, menuHeader, menuItem, popover } from "./styles";

const { dev } = shellStrings;
const REAL = "__real__";

/**
 * Selector del modo desarrollador («Ver como»). Solo aparece para cuentas con el permiso, dentro de una app. Elegir un
 * rol cambia lo que se muestra; no concede permisos ni envía el rol al servidor.
 */
export default function DevRoleSelector() {
  const { enabled, activeApp, roles, selected, simulating, select } =
    useDevMode();
  const { moduleCode } = useShell();
  if (!enabled || !activeApp) return null;

  const current = simulating && selected ? selected : REAL;
  const currentLabel =
    current === REAL ? dev.real : current === NO_ROLE ? dev.noRole : current;

  return (
    <MenuTrigger>
      <Button
        className={`${barButton} shell-dev`}
        data-active={simulating || undefined}
      >
        <Eye aria-hidden="true" />
        {/* Siempre en el contenido: en pantallas estrechas solo se oculta visualmente, y el nombre accesible lo incluye. */}
        <span className="sr-only md:not-sr-only">{dev.menu}</span>{" "}
        <span className="sr-only max-w-40 font-semibold xl:not-sr-only xl:truncate">
          {currentLabel}
        </span>
      </Button>
      <Popover
        className={popover}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Menu
          aria-label={dev.menu}
          className="outline-none"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[current]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            // Las filas de estado («Cargando», «Reintentar») no son roles.
            if (
              typeof next !== "string" ||
              next.startsWith("__r") ||
              next === "__loading__"
            )
              return;
            select(next === REAL ? null : next);
          }}
        >
          <MenuSection>
            <Header className={menuHeader}>{dev.menu}</Header>
            <MenuItem id={REAL} textValue={dev.real} className={menuItem}>
              {dev.real}
            </MenuItem>
          </MenuSection>
          <MenuSection>
            <Header className={menuHeader}>{dev.roles}</Header>
            {roles.status === "loading" ? (
              <MenuItem
                id="__loading__"
                isDisabled
                textValue={dev.loading}
                className={menuItem}
              >
                {dev.loading}
              </MenuItem>
            ) : null}
            {roles.status === "error" ? (
              <MenuItem
                id="__retry__"
                textValue={dev.retry}
                className={menuItem}
                onAction={roles.retry}
              >
                {dev.error} {dev.retry}
              </MenuItem>
            ) : null}
            {roles.items.map((role) => (
              <MenuItem
                key={role.name}
                id={role.name}
                textValue={role.name}
                className={menuItem}
              >
                <span className="grid min-w-0">
                  <span className="truncate">{role.name}</span>
                  {role.description ? (
                    <span className="truncate text-xs font-normal text-fg-secondary">
                      {role.description}
                    </span>
                  ) : null}
                </span>
              </MenuItem>
            ))}
            {roles.status === "ready" ? (
              <MenuItem
                id={NO_ROLE}
                textValue={dev.noRole}
                className={menuItem}
              >
                {dev.noRole}
              </MenuItem>
            ) : null}
          </MenuSection>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
