import { CircleHelp } from "lucide-react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from "react-aria-components";
import { shellStrings } from "../strings";
import { useShell } from "./ShellContext";
import { barButton, popover } from "./styles";

const { help } = shellStrings;

/** Ayuda: siempre en la misma posición de la barra superior (WCAG 3.2.6). El texto se oculta solo en pantallas estrechas. */
export default function HelpButton() {
  const { moduleCode } = useShell();
  return (
    <DialogTrigger>
      <Button className={barButton} aria-label={help.button}>
        <CircleHelp aria-hidden="true" />
        <span className="hidden sm:inline">{help.button}</span>
      </Button>
      <Popover
        className={`${popover} p-4`}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Dialog className="outline-none" aria-label={help.title}>
          <Heading slot="title" className="text-base font-semibold">
            {help.title}
          </Heading>
          <p className="mt-2 text-sm text-fg-secondary">{help.body}</p>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
