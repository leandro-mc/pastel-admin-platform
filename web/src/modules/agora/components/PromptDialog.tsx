import { useState } from "react";
import { isApiError } from "@/core/api";
import { Alert, Button, Dialog } from "@/core/ui";
import { describeError } from "../lib/format";
import { strings } from "../strings";
import { TextAreaField } from "./TextAreaField";

export type PromptField = {
  name: string;
  label: string;
  hint?: string;
  /** 0 = opcional. */
  minLength: number;
  maxLength: number;
  /** Nombre del campo en los errores del servidor, si difiere de `name`. */
  serverField?: string;
};

/**
 * Diálogo con uno o más campos de texto largo (verificar, retirar, resolver un aviso). El botón de confirmar se habilita
 * cuando los campos obligatorios llegan al mínimo; el servidor valida igual y su mensaje se muestra junto al campo.
 */
export function PromptDialog({
  title,
  description,
  fields,
  confirmLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  fields: PromptField[];
  confirmLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const valid = fields.every(
    (field) => (values[field.name] ?? "").trim().length >= field.minLength,
  );
  const serverErrors = isApiError(error) ? error.errors : {};
  const shownOnField = fields.some(
    (field) => serverErrors[field.serverField ?? field.name]?.[0],
  );

  return (
    <Dialog title={title} description={description} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(
            Object.fromEntries(
              fields.map((field) => [field.name, (values[field.name] ?? "").trim()]),
            ),
          );
        }}
      >
        {fields.map((field) => (
          <TextAreaField
            key={field.name}
            label={field.label}
            hint={field.hint}
            value={values[field.name] ?? ""}
            maxLength={field.maxLength}
            required={field.minLength > 0}
            rows={4}
            error={serverErrors[field.serverField ?? field.name]?.[0]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }
          />
        ))}
        {error && !shownOnField ? (
          <Alert variant="error" message={describeError(error)} />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {strings.editorial.common.cancel}
          </Button>
          <Button
            type="submit"
            loading={pending}
            loadingLabel={strings.editorial.common.saving}
            disabled={!valid}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
