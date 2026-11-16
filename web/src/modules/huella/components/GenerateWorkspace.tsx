import { useState } from "react";
import { Button, Panel, SelectField, TextField } from "@/core/ui";
import { focusClass } from "@/core/ui/styles";
import { useBank, useGenerateCv, useOffer } from "../api/hooks";
import type { DocKind } from "../lib/studioState";
import { inDays } from "../lib/tracking";
import { strings } from "../strings";
import { AiTaskPanel } from "./AiTaskPanel";
import { ErrorNotice, Loaded } from "./Form";
import { EvidenceMap } from "./OfferPanel";

/** Nivel de CV que viene elegido al abrir «Crear CV». */
const DEFAULT_LEVEL = "junior";

type LanguageChoice = "es" | "en" | "both";
const languageChoices: Record<LanguageChoice, readonly string[]> = {
  es: ["es"],
  en: ["en"],
  both: ["es", "en"],
};

const g = strings.studio.generate;
const l = strings.studio.letter;

type Props = {
  offerId: string | null;
  /** Un documento nuevo está listo: se abre en la pestaña Documentos. */
  onGenerated: (kind: DocKind, id: string) => void;
  onPickOffer: () => void;
};

/**
 * Generar un CV o una carta de presentación. A la izquierda lo que se pide (y las tres vías de IA); a la derecha, el
 * análisis de la oferta elegida. Las acciones solo aparecen con un destino: una oferta seleccionada o, para el CV, un
 * enfoque escrito. CV y carta son pedidos distintos (prompt y respuesta propios) en la misma pantalla.
 */
export function GenerateWorkspace({ offerId, onGenerated, onPickOffer }: Props) {
  const [kind, setKind] = useState<DocKind>("cv");
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label={g.kindLabel} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-fg">{g.kindLabel}</span>
        {(["cv", "carta"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${focusClass} ${
              kind === value
                ? "border-accent-strong bg-accent-soft text-fg"
                : "border-line bg-surface text-fg-secondary hover:bg-accent-soft"
            }`}
          >
            {value === "cv" ? g.kinds.cv : g.kinds.letter}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {kind === "cv" ? (
          <CvForm offerId={offerId} onGenerated={onGenerated} onPickOffer={onPickOffer} />
        ) : (
          <LetterForm offerId={offerId} onGenerated={onGenerated} onPickOffer={onPickOffer} />
        )}
        <Analysis offerId={offerId} />
      </div>
    </div>
  );
}

function CvForm({ offerId, onGenerated, onPickOffer }: Props) {
  const bank = useBank();
  const generate = useGenerateCv();
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [paper, setPaper] = useState<string | null>(null);
  // El idioma no es una preferencia global: se elige en cada generación (uno o los dos).
  const [language, setLanguage] = useState<LanguageChoice>("es");
  const [name, setName] = useState("");
  const [draftError, setDraftError] = useState<unknown>(null);
  const [drafting, setDrafting] = useState(false);

  const hasContent = bank.data
    ? bank.data.experiences.length + bank.data.projects.length > 0
    : null;
  const achievements = bank.data
    ? bank.data.experiences.reduce((n, e) => n + e.achievements.length, 0) +
      bank.data.projects.reduce((n, p) => n + p.achievements.length, 0)
    : null;
  const effectivePaper = paper ?? bank.data?.notes.preferredPaper ?? "letter";
  const languages = languageChoices[language];
  const hasTarget = offerId !== null || focus.trim() !== "";

  const taskInput = () => ({
    offerId,
    focus: offerId ? null : focus.trim() || null,
    level,
    paper: effectivePaper,
    languages: [...languages],
    name: name || null,
  });

  // Borrador sin IA: arma el CV con reglas a partir de los logros ya derivados (una versión por idioma).
  const draft = async () => {
    setDraftError(null);
    setDrafting(true);
    try {
      let last: string | null = null;
      for (const lang of languages) {
        const version = await generate.mutateAsync({
          ...taskInput(),
          language: lang,
        });
        last = version.summary.id;
      }
      if (last) onGenerated("cv", last);
    } catch (error) {
      setDraftError(error);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Panel title={g.title} description={g.description}>
      <div className="flex flex-col gap-5">
        {hasContent === false ? (
          <p className="text-sm text-muted">{g.emptyBank}</p>
        ) : null}

        <TextField
          label={g.focus}
          hint={offerId ? g.fromOffer : g.focusHint}
          value={focus}
          disabled={offerId !== null}
          onChange={(e) => setFocus(e.target.value)}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-fg">{g.options}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={g.level}
              options={Object.entries(g.levels).map(([value, label]) => ({
                value,
                label,
              }))}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
            <SelectField
              label={g.paper}
              options={Object.entries(strings.bank.papers).map(
                ([value, label]) => ({ value, label }),
              )}
              value={effectivePaper}
              onChange={(e) => setPaper(e.target.value)}
            />
            <SelectField
              label={g.language}
              options={Object.entries(g.languageChoices).map(
                ([value, label]) => ({ value, label }),
              )}
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageChoice)}
            />
            <TextField
              label={g.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted">{g.languageHint}</p>
        </fieldset>

        {hasTarget ? (
          <>
            <AiTaskPanel
              kind="cv"
              title={g.aiTitle(languages.length)}
              fileBase={`huella-cv-${level}-${languages.join("-")}`}
              disabled={hasContent === false}
              input={taskInput}
              runLabel={(label, model) => g.run(label, model)}
              externalHint={g.externalHint}
              onDone={(outcomes) => {
                const id = outcomes[0]?.versionIds[0];
                if (id) onGenerated("cv", id);
              }}
            />
            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <p className="text-sm text-muted">{g.draftHint}</p>
              <div>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={achievements === 0}
                  loading={drafting}
                  loadingLabel={g.submitting}
                  onClick={() => void draft()}
                >
                  {g.draft}
                </Button>
              </div>
              {achievements === 0 ? (
                <p className="text-sm text-muted">{g.draftNeedsAchievements}</p>
              ) : null}
              <ErrorNotice error={draftError} />
            </div>
          </>
        ) : (
          <NeedTarget text={g.needTarget} onPickOffer={onPickOffer} />
        )}
      </div>
    </Panel>
  );
}

function LetterForm({ offerId, onGenerated, onPickOffer }: Props) {
  const bank = useBank();
  const [tone, setTone] = useState("formal");
  const [language, setLanguage] = useState<LanguageChoice>("es");
  const [name, setName] = useState("");
  const hasContent = bank.data
    ? bank.data.experiences.length + bank.data.projects.length > 0
    : null;
  const languages = languageChoices[language];

  return (
    <Panel title={l.title} description={l.description}>
      <div className="flex flex-col gap-5">
        {hasContent === false ? (
          <p className="text-sm text-muted">{g.emptyBank}</p>
        ) : null}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-fg">{g.options}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={l.language}
              options={Object.entries(g.languageChoices).map(
                ([value, label]) => ({ value, label }),
              )}
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageChoice)}
            />
            <SelectField
              label={l.tone}
              options={Object.entries(l.tones).map(([value, label]) => ({
                value,
                label,
              }))}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextField
                label={g.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted">{l.languageHint}</p>
        </fieldset>

        {offerId !== null ? (
          <AiTaskPanel
            kind="letter"
            title={l.aiTitle(languages.length)}
            fileBase={`huella-carta-${languages.join("-")}`}
            disabled={hasContent === false}
            input={() => ({
              offerId,
              languages: [...languages],
              tone,
              name: name || null,
              today: inDays(0),
            })}
            runLabel={(label, model) => l.run(label, model)}
            externalHint={l.externalHint}
            onDone={(outcomes) => {
              const id = outcomes[0]?.versionIds[0];
              if (id) onGenerated("carta", id);
            }}
          />
        ) : (
          <NeedTarget text={l.needOffer} onPickOffer={onPickOffer} />
        )}
      </div>
    </Panel>
  );
}

function NeedTarget({ text, onPickOffer }: { text: string; onPickOffer: () => void }) {
  return (
    <div
      role="note"
      className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong p-4"
    >
      <p className="text-sm text-fg">{text}</p>
      <Button variant="secondary" type="button" onClick={onPickOffer}>
        {g.goOffers}
      </Button>
    </div>
  );
}

function Analysis({ offerId }: { offerId: string | null }) {
  const offer = useOffer(offerId);
  if (offerId === null) {
    return (
      <Panel title={g.analysis}>
        <p className="text-sm text-muted">{g.analysisNone}</p>
      </Panel>
    );
  }
  return (
    <Loaded query={offer}>{(data) => <EvidenceMap offer={data} />}</Loaded>
  );
}
