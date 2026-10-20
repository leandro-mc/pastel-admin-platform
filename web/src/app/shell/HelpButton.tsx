import { CircleHelp } from "lucide-react";
import { Button, Dialog, DialogTrigger, Heading, Popover } from "react-aria-components";
import { shellStrings } from "../strings";
import { popover } from "./styles";

const { help } = shellStrings;

export default function HelpButton({ compact = false }: { compact?: boolean }) {
  return (
    <DialogTrigger>
      <Button className={`workspace-help-button ${compact ? "is-compact" : ""}`} aria-label={help.button}>
        <CircleHelp aria-hidden="true" className="workspace-help-icon" />{!compact ? <span>{help.button}</span> : null}
      </Button>
      <Popover className={`${popover} max-w-72 p-4`} placement="top start">
        <Dialog className="outline-none" aria-label={help.title}>
          <Heading slot="title" className="text-base font-semibold">{help.title}</Heading>
          <p className="mt-2 text-sm text-fg-secondary">{help.body}</p>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
