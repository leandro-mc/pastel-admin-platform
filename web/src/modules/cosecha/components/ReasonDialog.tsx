import { useState } from "react";
import { ConfirmDialog, TextField } from "@/core/ui";
import { strings } from "../strings";
import { FormAlert } from "./FormAlert";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  error: unknown;
  /** Etiqueta del campo; por defecto «Motivo». */
  label?: string;
  /** Si es falso, el motivo se puede dejar vacío. */
  required?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

/** Confirmación que pide un motivo (cancelar, anular, retroceder, cerrar con pendientes). */
export function ReasonDialog({
  title,
  message,
  confirmLabel,
  pending,
  error,
  label = strings.common.reasonLabel,
  required = true,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);

  const submit = () => {
    if (required && reason.trim() === "") {
      setMissing(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <ConfirmDialog
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={strings.common.cancel}
      pendingLabel={strings.common.saving}
      pending={pending}
      onConfirm={submit}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <TextField
          label={label}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setMissing(false);
          }}
          error={missing ? strings.common.reasonRequired : undefined}
          maxLength={500}
        />
        <FormAlert error={error} />
      </div>
    </ConfirmDialog>
  );
}
