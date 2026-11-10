import { SlidersHorizontal } from "lucide-react";
import { Button, Menu, MenuTrigger, Popover } from "react-aria-components";
import { shellStrings } from "../strings";
import PreferenceSections from "./PreferenceSections";
import { useShell } from "./ShellContext";
import { barButton, popover } from "./styles";

/** Preferencias para quien no ha iniciado sesión (Ágora es pública): tema y tamaño de texto no se pierden. */
export default function PreferencesMenu() {
  const { moduleCode } = useShell();
  return (
    <MenuTrigger>
      <Button className={barButton} aria-label={shellStrings.preferences.menu}>
        <SlidersHorizontal aria-hidden="true" />
      </Button>
      <Popover
        className={popover}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Menu
          aria-label={shellStrings.preferences.menu}
          className="outline-none"
        >
          <PreferenceSections />
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
