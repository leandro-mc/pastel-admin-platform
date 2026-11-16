import { useState } from "react";
import { Button, Panel, SelectField, TextField } from "@/core/ui";
import { useBank, useGenerateCv, useOffer } from "../api/hooks";
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

type Props = {
  offerId: string | null;
  onGenerated: (id: string) => void;
  onPickOffer: () => void;
};

/**
 * Generar un CV. A la izquierda lo que se pide (y las tres vías de IA); a la derecha, el análisis de la oferta elegida.
 * Las acciones solo aparecen con un destino: una oferta seleccionada o un enfoque escrito.
 */
export function GenerateWorkspace({ offerId, onGenerated, onPickOffer }: Props) {
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
      if (last) onGenerated(last);
    } catch (error) {
      setDraftError(error);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
                  if (id) onGenerated(id);
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
            <div
              role="note"
              className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong p-4"
            >
              <p className="text-sm text-fg">{g.needTarget}</p>
              <Button variant="secondary" type="button" onClick={onPickOffer}>
                {g.goOffers}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Analysis offerId={offerId} />
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
