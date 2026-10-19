import { CircleHelp } from "lucide-react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from "react-aria-components";
import { shellStrings } from "../strings";
import { barButton, popover } from "./styles";

const { help } = shellStrings;

export default function HelpButton() {
  return (
    <DialogTrigger>
      <Button className={barButton}>
        <CircleHelp aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">{help.button}</span>
      </Button>
      <Popover className={`${popover} max-w-72 p-4`} placement="bottom end">
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
