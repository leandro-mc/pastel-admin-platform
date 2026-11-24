import { Check, Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Alert, Button, Panel, SelectField, TextField } from "@/core/ui";
import { useBank, useGenerateCv, useOffer } from "../api/hooks";
import { chipClass } from "../lib/marker";
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
const m = strings.studio.email;

/** Lo que se puede generar: el CV (propio, de competencias o de competencias y habilidades), la carta o el correo de postulación. */
type GenKind = "cv" | "competencies" | "combined" | "letter" | "email";

type Props = {
  offerId: string | null;
  /** Un documento nuevo está listo: se abre en la pestaña Documentos. */
  onGenerated: (kind: DocKind, id: string) => void;
  onPickOffer: () => void;
};

/**
 * Generar un CV, una carta de presentación o un correo de postulación. A la izquierda lo que se pide (y las tres vías de IA); a la derecha, el
 * análisis de la oferta elegida. Las acciones solo aparecen con un destino: una oferta seleccionada o, para el CV, un
 * enfoque escrito. CV y carta son pedidos distintos (prompt y respuesta propios) en la misma pantalla.
 */
export function GenerateWorkspace({ offerId, onGenerated, onPickOffer }: Props) {
  const [kind, setKind] = useState<GenKind>("cv");
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label={g.kindLabel} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-fg">{g.kindLabel}</span>
        {(["cv", "competencies", "combined", "letter", "email"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={chipClass(kind === value)}
          >
            {kind === value ? <Check aria-hidden="true" className="size-4" /> : null}
            {g.kinds[value]}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {kind === "letter" ? (
          <LetterForm offerId={offerId} onGenerated={onGenerated} onPickOffer={onPickOffer} />
        ) : kind === "email" ? (
          <EmailForm offerId={offerId} onGenerated={onGenerated} onPickOffer={onPickOffer} />
        ) : (
          <CvForm
            key={kind}
            format={kind === "competencies" || kind === "combined" ? kind : "standard"}
            offerId={offerId}
            onGenerated={onGenerated}
            onPickOffer={onPickOffer}
          />
        )}
        <Analysis offerId={offerId} />
      </div>
    </div>
  );
}

function CvForm({
  offerId,
  onGenerated,
  onPickOffer,
  format,
}: Props & { format: "standard" | "competencies" | "combined" }) {
  const competencies = format === "competencies";
  const combined = format === "combined";
  // Los dos formatos con competencias usan el catálogo del banco y no ofrecen borrador sin IA.
  const withCompetencies = competencies || combined;
  const copy = competencies ? g.competencies : combined ? g.combined : null;
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
  const catalogEmpty = bank.data ? bank.data.competencies.length === 0 : false;

  const taskInput = () => ({
    offerId,
    focus: offerId ? null : focus.trim() || null,
    level,
    paper: effectivePaper,
    languages: [...languages],
    format,
    name: name || null,
  });

  // Borrador sin IA: arma el CV con reglas a partir de los logros ya derivados (una versión por idioma).
  const draft = async () => {
    setDraftError(null);
    setDrafting(true);
    try {
      let last: string | null = null;
      // Las dos versiones (español e inglés) generadas juntas quedan emparejadas para mantenerse al día entre sí.
      const pairId = languages.length === 2 ? crypto.randomUUID() : null;
      for (const lang of languages) {
        const version = await generate.mutateAsync({
          ...taskInput(),
          language: lang,
          pairId,
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
    <Panel
      title={copy ? copy.title : g.title}
      description={copy ? copy.description : g.description}
    >
      <div className="flex flex-col gap-5">
        {hasContent === false ? <Alert variant="warning" message={g.emptyBank} /> : null}
        {withCompetencies && catalogEmpty ? (
          <Alert variant="warning" message={g.competencies.needCatalog} />
        ) : null}

        {offerId ? (
          <InfoNote>{g.fromOffer}</InfoNote>
        ) : (
          <TextField
            label={g.focus}
            hint={g.focusHint}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-fg">{g.options}</legend>
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
          <ActionArea>
            <AiTaskPanel
              kind="cv"
              title={(copy ? copy.aiTitle : g.aiTitle)(
                languages.length,
              )}
              fileBase={`huella-cv${competencies ? "-competencias" : combined ? "-completo" : ""}-${level}-${languages.join("-")}`}
              disabled={hasContent === false || (withCompetencies && catalogEmpty)}
              input={taskInput}
              runLabel={(label, model) => g.run(label, model)}
              externalHint={
                copy ? copy.externalHint : g.externalHint
              }
              onDone={(outcomes) => {
                const id = outcomes[0]?.versionIds[0];
                if (id) onGenerated("cv", id);
              }}
            />
            {withCompetencies ? null : (
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
            )}
          </ActionArea>
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
        {hasContent === false ? <Alert variant="warning" message={g.emptyBank} /> : null}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-fg">{g.options}</legend>
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
          <ActionArea>
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
          </ActionArea>
        ) : (
          <NeedTarget text={l.needOffer} onPickOffer={onPickOffer} />
        )}
      </div>
    </Panel>
  );
}

function EmailForm({ offerId, onGenerated, onPickOffer }: Props) {
  const bank = useBank();
  const [tone, setTone] = useState("formal");
  const [language, setLanguage] = useState<LanguageChoice>("es");
  const [name, setName] = useState("");
  const hasContent = bank.data
    ? bank.data.experiences.length + bank.data.projects.length > 0
    : null;
  const languages = languageChoices[language];

  return (
    <Panel title={m.title} description={m.description}>
      <div className="flex flex-col gap-5">
        {hasContent === false ? <Alert variant="warning" message={g.emptyBank} /> : null}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-fg">{g.options}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={m.language}
              options={Object.entries(g.languageChoices).map(
                ([value, label]) => ({ value, label }),
              )}
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageChoice)}
            />
            <SelectField
              label={m.tone}
              options={Object.entries(m.tones).map(([value, label]) => ({
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
          <p className="text-sm text-muted">{m.languageHint}</p>
        </fieldset>

        {offerId !== null ? (
          <ActionArea>
            <AiTaskPanel
              kind="email"
              title={m.aiTitle(languages.length)}
              fileBase={`huella-correo-${languages.join("-")}`}
              disabled={hasContent === false}
              input={() => ({
                offerId,
                languages: [...languages],
                tone,
                name: name || null,
              })}
              runLabel={(label, model) => m.run(label, model)}
              externalHint={m.externalHint}
              onDone={(outcomes) => {
                const id = outcomes[0]?.versionIds[0];
                if (id) onGenerated("correo", id);
              }}
            />
          </ActionArea>
        ) : (
          <NeedTarget text={m.needOffer} onPickOffer={onPickOffer} />
        )}
      </div>
    </Panel>
  );
}

/**
 * Zona de acción: separa «qué se pide» (opciones, arriba) de «cómo se genera» (las vías de IA) con un contenedor hundido
 * y su propio título, así el botón principal se encuentra sin recorrer el formulario.
 */
function ActionArea({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface-sunken p-4"
    >
      <h3 id={id} className="text-base font-semibold text-fg">
        {g.actionTitle}
      </h3>
      {children}
    </section>
  );
}

/** Información importante (no un error ni una advertencia): tinte de información con su icono. */
function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-info/30 border-l-4 border-l-info bg-info-soft px-3 py-2.5 text-sm text-fg"
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
      <span>{children}</span>
    </p>
  );
}

/** Falta un destino: se explica qué hacer y la salida va como acción principal del bloque (tonal). */
function NeedTarget({ text, onPickOffer }: { text: string; onPickOffer: () => void }) {
  return (
    <div
      role="note"
      className="flex flex-col items-start gap-3 rounded-xl border border-info/30 border-l-4 border-l-info bg-info-soft p-4"
    >
      <p className="flex items-start gap-2 text-sm text-fg">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>{text}</span>
      </p>
      <Button variant="tonal" type="button" onClick={onPickOffer}>
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
