import { useState, type FormEvent } from "react";
import { Button, CheckboxField, SelectField, TextField } from "@/core/ui";
import { FormAlert } from "../../components/FormAlert";
import { fieldMessage } from "../../errors";
import { parseDecimal, todayIso } from "../../format";
import { strings } from "../../strings";

const t = strings.settings.policy;

export type PolicyField = {
  key: string;
  label: string;
  kind: "number" | "weekday";
  hint?: string;
};

export type PolicyValues = {
  effectiveFrom: string;
  ratified: boolean;
  note: string | undefined;
  numbers: Record<string, number | null>;
};

type Props = {
  fields: readonly PolicyField[];
  pending: boolean;
  error: unknown;
  onSubmit: (values: PolicyValues) => void;
  onCancel: () => void;
};

/**
 * Formulario de una versión nueva de parámetros. Todos los valores son opcionales: vacío significa «sin definir»
 * (el sistema no asume ninguno). El servidor valida rangos y vigencia.
 */
export function PolicyForm({ fields, pending, error, onSubmit, onCancel }: Props) {
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [ratified, setRatified] = useState(false);
  const [note, setNote] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numbers: Record<string, number | null> = {};
    const problems: Record<string, string> = {};
    for (const field of fields) {
      const text = (texts[field.key] ?? "").trim();
      if (text === "") {
        numbers[field.key] = null;
        continue;
      }
      const value = parseDecimal(text);
      if (value === null) problems[field.key] = strings.common.invalidNumber;
      else numbers[field.key] = value;
    }
    setInvalid(problems);
    if (Object.keys(problems).length > 0) return;
    onSubmit({
      effectiveFrom,
      ratified,
      note: note.trim() === "" ? undefined : note.trim(),
      numbers,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextField
        type="date"
        label={t.effectiveFrom}
        hint={t.effectiveHint}
        value={effectiveFrom}
        min={todayIso()}
        onChange={(event) => setEffectiveFrom(event.target.value)}
        error={fieldMessage(error, "effectiveFrom")}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) =>
          field.kind === "weekday" ? (
            <SelectField
              key={field.key}
              label={field.label}
              hint={field.hint}
              placeholder={strings.settings.policy.payment.weekdayNone}
              value={texts[field.key] ?? ""}
              onChange={(event) =>
                setTexts((current) => ({ ...current, [field.key]: event.target.value }))
              }
              options={t.weekdays.map((name, index) => ({
                value: String(index + 1),
                label: name,
              }))}
              error={fieldMessage(error, field.key)}
            />
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              inputMode="decimal"
              value={texts[field.key] ?? ""}
              onChange={(event) =>
                setTexts((current) => ({ ...current, [field.key]: event.target.value }))
              }
              error={invalid[field.key] ?? fieldMessage(error, field.key)}
            />
          ),
        )}
      </div>
      <CheckboxField
        label={t.ratified}
        description={t.ratifiedHint}
        checked={ratified}
        onChange={(event) => setRatified(event.target.checked)}
      />
      <TextField
        label={t.note}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={fieldMessage(error, "note")}
        maxLength={500}
      />
      <FormAlert error={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          {strings.common.cancel}
        </Button>
        <Button type="submit" loading={pending} loadingLabel={t.publishing}>
          {t.publish}
        </Button>
      </div>
    </form>
  );
}
