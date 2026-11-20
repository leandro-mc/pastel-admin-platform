import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useNotify } from "@/core/notifications";
import { usePreferences } from "@/core/preferences";
import { Badge, Button, ConfirmDialog, PageHeader, Panel } from "@/core/ui";
import { PaletteChecks } from "../components/PaletteChecks";
import { PaletteEditor } from "../components/PaletteEditor";
import { PalettePreview } from "../components/PalettePreview";
import { buildPalette, COLOR_KEYS, type BuiltPalette, type Mode } from "../lib/appearance/palette";
import { type PaletteDef } from "../lib/appearance/presets";
import {
  activePalette,
  allPalettes,
  appearance,
  MAX_CUSTOM,
  useAppearance,
  type CustomPalette,
} from "../lib/appearance/store";
import { chipClass } from "../lib/marker";
import { strings } from "../strings";

const t = strings.appearance;

/**
 * Apariencia de Huella: elegir una de las paletas predefinidas o crear las propias (hasta seis). La elección se guarda en
 * este navegador y se aplica al instante; a la derecha, una muestra de la pantalla con la paleta en claro y en oscuro.
 */
export function Component() {
  const state = useAppearance();
  const { theme } = usePreferences();
  const notify = useNotify();
  const [mode, setMode] = useState<Mode>(theme);
  const [editor, setEditor] = useState<{ editing: CustomPalette | null } | null>(null);
  const [draft, setDraft] = useState<BuiltPalette | null>(null);
  const [toDelete, setToDelete] = useState<CustomPalette | null>(null);

  const palettes = allPalettes(state);
  const active = activePalette(state);
  const activeBuilt = useMemo(() => buildPalette(active.colors), [active]);
  const shown = editor ? (draft ?? activeBuilt) : activeBuilt;
  const atLimit = state.custom.length >= MAX_CUSTOM;

  const openEditor = (editing: CustomPalette | null) => {
    setDraft(buildPalette(editing?.colors ?? active.colors));
    setEditor({ editing });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t.title} description={t.description} />

      <Panel title={t.palettes.title} description={t.palettes.description}>
        <div className="flex flex-col gap-4">
          <fieldset className="min-w-0">
            <legend className="sr-only">{t.palettes.label}</legend>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {palettes.map((palette) => (
                <PaletteCard
                  key={palette.id}
                  palette={palette}
                  selected={palette.id === active.id}
                  onSelect={() => appearance.select(palette.id)}
                  onEdit={() => {
                    const own = state.custom.find((p) => p.id === palette.id);
                    if (own) openEditor(own);
                  }}
                  onDelete={() => {
                    const own = state.custom.find((p) => p.id === palette.id);
                    if (own) setToDelete(own);
                  }}
                />
              ))}
            </ul>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="tonal"
              type="button"
              disabled={atLimit || editor !== null}
              onClick={() => openEditor(null)}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.palettes.create}
            </Button>
            {atLimit ? <p className="text-sm text-muted">{t.palettes.limit(MAX_CUSTOM)}</p> : null}
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {editor ? (
            <PaletteEditor
              key={editor.editing?.id ?? "new"}
              editing={editor.editing}
              start={active.colors}
              onDraft={(built) => {
                if (built) setDraft(built);
              }}
              onClose={() => {
                setEditor(null);
                setDraft(null);
              }}
            />
          ) : (
            <Roles built={activeBuilt} />
          )}
          <PaletteChecks built={shown} />
        </div>

        <div className="min-w-0 lg:sticky lg:top-4">
          <Panel
            title={t.preview.title}
            description={editor ? t.preview.editing : t.preview.description}
            actions={<ModeSwitch mode={mode} onChange={setMode} />}
          >
            <PalettePreview tokens={shown[mode]} mode={mode} />
          </Panel>
        </div>
      </div>

      {toDelete ? (
        <ConfirmDialog
          title={t.palettes.deleteTitle}
          message={t.palettes.deleteMessage(toDelete.name)}
          confirmLabel={t.palettes.delete}
          cancelLabel={strings.common.cancel}
          onClose={() => setToDelete(null)}
          onConfirm={() => {
            appearance.removeCustom(toDelete.id);
            if (editor?.editing?.id === toDelete.id) setEditor(null);
            setToDelete(null);
            notify(strings.common.saved, "success");
          }}
        />
      ) : null}
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="group" aria-label={t.preview.modeLabel} className="flex gap-2">
      {(["light", "dark"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={chipClass(mode === value)}
        >
          {mode === value ? <Check aria-hidden="true" className="size-4" /> : null}
          {t.preview.modes[value]}
        </button>
      ))}
    </div>
  );
}

/**
 * Tarjeta de una paleta: un botón de opción nativo (flechas del teclado y lector de pantalla gratis) que cubre la tarjeta
 * con su etiqueta; editar y eliminar, solo en las propias, quedan fuera de la etiqueta para no anidar controles.
 */
function PaletteCard({
  palette,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  palette: PaletteDef;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const resolved = useMemo(() => buildPalette(palette.colors).resolved, [palette.colors]);
  return (
    <li
      className="flex flex-col rounded-xl border border-line bg-surface-sunken transition-colors has-[input:checked]:border-[var(--hl-edge)] has-[input:checked]:bg-[var(--hl-soft)] has-[input:checked]:ring-1 has-[input:checked]:ring-[var(--hl-edge)] has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-accent-strong/45 [&:not(:has(input:checked)):hover]:border-line-strong"
    >
      <input
        id={id}
        type="radio"
        name="huella-palette"
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <label htmlFor={id} className="flex flex-1 cursor-pointer flex-col gap-3 p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-fg">{palette.name}</span>
          {selected ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hl-edge)] bg-[var(--hl)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hl-ink)]">
              <Check aria-hidden="true" className="size-3.5" />
              {t.palettes.inUse}
            </span>
          ) : (
            <Badge variant="neutral">{palette.builtIn ? t.palettes.builtIn : t.palettes.mine}</Badge>
          )}
        </span>
        <span role="img" aria-label={t.palettes.swatches(palette.name)} className="flex gap-1.5">
          {COLOR_KEYS.map((key) => (
            <span
              key={key}
              aria-hidden="true"
              className="size-8 rounded-full border border-line-strong"
              style={{ backgroundColor: resolved[key] }}
            />
          ))}
        </span>
        {palette.description ? <span className="text-sm text-muted">{palette.description}</span> : null}
      </label>
      {palette.builtIn ? null : (
        <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2">
          <Button variant="secondary" type="button" onClick={onEdit} aria-label={`${t.palettes.edit}: ${palette.name}`}>
            <Pencil aria-hidden="true" className="size-4" />
            {t.palettes.edit}
          </Button>
          <Button variant="quietDanger" type="button" onClick={onDelete} aria-label={`${t.palettes.delete}: ${palette.name}`}>
            <Trash2 aria-hidden="true" className="size-4" />
            {t.palettes.delete}
          </Button>
        </div>
      )}
    </li>
  );
}

/** La jerarquía de colores: qué hace cada uno, con la muestra de la paleta en uso. */
function Roles({ built }: { built: BuiltPalette }) {
  const rows = [
    ["fondo", t.roles.rows.fondo],
    ["texto", t.roles.rows.texto],
    ["acento", t.roles.rows.acento],
    ["realce", t.roles.rows.realce],
  ] as const;
  const states = t.roles.rows.estados;
  return (
    <Panel title={t.roles.title} description={t.roles.description} headingLevel="h3">
      <ul className="flex flex-col divide-y divide-line">
        {rows.map(([key, row]) => (
          <li key={key} className="flex items-start gap-3 py-3">
            <span
              aria-hidden="true"
              className="mt-0.5 size-7 shrink-0 rounded-full border border-line-strong"
              style={{ backgroundColor: built.resolved[key] }}
            />
            <RoleText name={row.name} level={row.level} share={row.share} text={row.text} />
          </li>
        ))}
        <li className="flex items-start gap-3 py-3">
          <span aria-hidden="true" className="mt-0.5 flex w-7 shrink-0 flex-col gap-0.5">
            <span className="h-2 rounded-full bg-success" />
            <span className="h-2 rounded-full bg-warning" />
            <span className="h-2 rounded-full bg-danger" />
          </span>
          <RoleText name={states.name} level={states.level} share={states.share} text={states.text} />
        </li>
      </ul>
    </Panel>
  );
}

function RoleText({
  name,
  level,
  share,
  text,
}: {
  name: string;
  level: keyof typeof t.roles.level;
  share: string;
  text: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
        {name}
        <Badge variant={level === "accent" ? "accent" : "neutral"}>{t.roles.level[level]}</Badge>
        <span className="text-xs font-normal text-muted">{share}</span>
      </p>
      <p className="mt-0.5 text-sm text-fg-secondary">{text}</p>
    </div>
  );
}
