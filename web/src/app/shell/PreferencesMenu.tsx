import { SlidersHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from "react-aria-components";
import { shellStrings } from "../strings";
import PreferenceControls from "./PreferenceControls";
import { useShell } from "./ShellContext";
import { barButton, popover } from "./styles";

/** Preferencias para quien no ha iniciado sesión (Ágora es pública): tema y tamaño de texto no se pierden. */
export default function PreferencesMenu() {
  const { moduleCode } = useShell();
  return (
    <DialogTrigger>
      <Button className={barButton} aria-label={shellStrings.preferences.menu}>
        <SlidersHorizontal aria-hidden="true" />
      </Button>
      <Popover
        className={`${popover} shell-account`}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Dialog
          className="outline-none"
          aria-label={shellStrings.preferences.menu}
        >
          <Heading slot="title" className="shell-account-title">
            {shellStrings.preferences.menu}
          </Heading>
          <PreferenceControls />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
