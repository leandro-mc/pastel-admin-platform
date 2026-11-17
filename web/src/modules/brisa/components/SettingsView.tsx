import { useMemo, useState } from "react";
import { Alert, Button, Panel, SelectField } from "@/core/ui";
import { focusClass } from "@/core/ui/styles";
import { usePreferences, type TextSize, type Theme } from "@/core/preferences";
import { useUpdateSettings } from "../api/mutations";
import { formatLong } from "../domain/calendar";
import { useBrisa } from "../state/BrisaContext";
import { brisaMessage } from "../state/errors";
import { strings } from "../strings";

/** Zonas más usadas, por si el navegador no sabe listar todas (`Intl.supportedValuesOf`). */
const FALLBACK_ZONES = [
  "America/Costa_Rica",
  "America/Mexico_City",
  "America/Bogota",
  "America/Panama",
  "America/New_York",
  "America/Los_Angeles",
  "America/Argentina/Buenos_Aires",
  "Europe/Madrid",
  "UTC",
];

function listZones(current: string): string[] {
  let zones: string[];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = FALLBACK_ZONES;
  }
  const all = new Set([...zones, "UTC", current]);
  return [...all].sort((a, b) => a.localeCompare(b));
}

const textSizes: TextSize[] = ["small", "normal", "large", "xlarge"];
const themes: { value: Theme; label: string }[] = [
  { value: "light", label: strings.settings.themeLight },
  { value: "dark", label: strings.settings.themeDark },
];

/** Segmento de opciones excluyentes con estado visible (texto + marca), no solo color. */
function Choice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${focusClass} ${
        selected
          ? "border-accent bg-accent-soft text-accent-strong"
          : "border-line-strong bg-surface text-fg hover:bg-accent-soft"
      }`}
    >
      {selected ? "✓ " : ""}
      {children}
    </button>
  );
}

/** Configuración: zona horaria por persona (define «hoy»), tema y tamaño de texto de la plataforma. */
export function SettingsView() {
  const { zone, today } = useBrisa();
  const { theme, setTheme, textSize, setTextSize } = usePreferences();
  const update = useUpdateSettings();
  const [selected, setSelected] = useState(zone);
  const [saved, setSaved] = useState(false);
  const zones = useMemo(() => listZones(zone), [zone]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Panel title={strings.settings.timeZoneTitle} description={strings.settings.timeZoneDescription}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            update.mutate(selected, { onSuccess: () => setSaved(true) });
          }}
        >
          {update.isError ? <Alert variant="error" message={brisaMessage(update.error)} /> : null}
          {saved ? <Alert variant="success" message={strings.settings.saved} /> : null}
          <SelectField
            label={strings.settings.timeZoneLabel}
            hint={strings.settings.timeZoneNow(formatLong(today))}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setSaved(false);
            }}
            options={zones.map((id) => ({ value: id, label: id }))}
          />
          <div>
            <Button
              type="submit"
              loading={update.isPending}
              loadingLabel={strings.settings.saving}
              disabled={selected === zone}
            >
              {strings.settings.save}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={strings.settings.themeTitle} description={strings.settings.themeDescription}>
        <div className="flex flex-wrap gap-2">
          {themes.map((option) => (
            <Choice key={option.value} selected={theme === option.value} onSelect={() => setTheme(option.value)}>
              {option.label}
            </Choice>
          ))}
        </div>
      </Panel>

      <Panel title={strings.settings.textSizeTitle} description={strings.settings.textSizeDescription}>
        <div className="flex flex-wrap gap-2">
          {textSizes.map((size) => (
            <Choice key={size} selected={textSize === size} onSelect={() => setTextSize(size)}>
              {strings.settings.textSizes[size]}
            </Choice>
          ))}
        </div>
      </Panel>
    </div>
  );
}
