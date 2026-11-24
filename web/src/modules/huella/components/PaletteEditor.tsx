import { useMemo, useState } from "react";
import { useNotify } from "@/core/notifications";
import { Alert, Button, Panel, SelectField, TextField } from "@/core/ui";
import { normalizeHex } from "../lib/appearance/color";
import { buildPalette, COLOR_KEYS, parseColors, type BuiltPalette, type ColorKey, type PaletteColors } from "../lib/appearance/palette";
import { allPalettes, appearance, MAX_NAME, useAppearance, type CustomPalette } from "../lib/appearance/store";
import { strings } from "../strings";

const t = strings.appearance.editor;

type Props = {
  /** Paleta propia que se edita; sin ella se crea una nueva. */
  editing: CustomPalette | null;
  /** Colores con los que empieza una paleta nueva (la que está en uso). */
  start: PaletteColors;
  /** La vista previa y las comprobaciones siguen lo que se escribe, antes de guardar. */
  onDraft: (built: BuiltPalette | null) => void;
  onClose: () => void;
};

type Draft = Record<ColorKey, string>;

/**
 * Crear o editar una paleta propia: nombre y cuatro colores (selector + código). Todo lo demás lo deriva el generador
 * (`lib/appearance/palette.ts`); aquí solo se valida lo que escribe la persona y se le dice qué color se usa de verdad si
 * hubo que ajustarlo.
 */
export function PaletteEditor({ editing, start, onDraft, onClose }: Props) {
  const notify = useNotify();
  const appearanceState = useAppearance();
  const [name, setName] = useState(editing?.name ?? "");
  const [draft, setDraft] = useState<Draft>({ ...(editing?.colors ?? start) });
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => parseColors(draft), [draft]);
  const built = useMemo(() => (parsed.colors ? buildPalette(parsed.colors) : null), [parsed.colors]);
  const derivedPurple = built !== null && built.purple.length > 0;
  const nameError = submitted && name.trim() === "" ? t.nameRequired : undefined;

  const update = (next: Draft) => {
    setDraft(next);
    const result = parseColors(next);
    const nextBuilt = result.colors ? buildPalette(result.colors) : null;
    onDraft(nextBuilt && nextBuilt.purple.length === 0 ? nextBuilt : null);
  };

  const setColor = (key: ColorKey, value: string) => update({ ...draft, [key]: value });

  const save = () => {
    setSubmitted(true);
    if (name.trim() === "" || !parsed.colors || !built || derivedPurple) return;
    const id = appearance.saveCustom({ id: editing?.id, name, colors: parsed.colors });
    if (id) {
      notify(strings.common.saved, "success");
      onClose();
    }
  };

  const choices = allPalettes(appearanceState).map((p) => ({ value: p.id, label: p.name }));

  return (
    <Panel title={editing ? t.editTitle : t.createTitle} description={t.description} headingLevel="h3">
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t.name}
            value={name}
            maxLength={MAX_NAME}
            error={nameError}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField
            label={t.from}
            options={[{ value: "", label: "—" }, ...choices]}
            value=""
            onChange={(e) => {
              const source = allPalettes(appearanceState).find((p) => p.id === e.target.value);
              if (source) update({ ...source.colors });
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          {COLOR_KEYS.map((key) => {
            const field = t.fields[key];
            const typed = draft[key];
            const valid = normalizeHex(typed);
            const errorKind = parsed.errors[key];
            const used = built?.resolved[key];
            const adjusted = used && valid && used !== valid;
            return (
              <div key={key} className="flex items-start gap-3">
                <input
                  type="color"
                  aria-label={t.picker(field.label)}
                  value={valid ?? "#000000"}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="mt-[1.625rem] size-11 shrink-0 cursor-pointer rounded-xl border border-line-strong bg-surface p-1"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <TextField
                    label={`${field.label} · ${t.hex}`}
                    hint={field.hint}
                    value={typed}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    error={errorKind === "invalid" ? t.invalid : errorKind === "purple" ? t.purple : undefined}
                    onChange={(e) => setColor(key, e.target.value)}
                  />
                  {adjusted ? <p className="text-xs text-muted">{t.used(used)}</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        {derivedPurple ? <Alert variant="error" message={t.purpleDerived} /> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={!parsed.colors || derivedPurple}>
            {t.save}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
