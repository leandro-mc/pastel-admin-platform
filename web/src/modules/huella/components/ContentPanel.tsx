import { useState, type ReactNode } from "react";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel, TextField } from "@/core/ui";
import {
  runAiTask,
  useAiSettings,
  useProfileContent,
  useSaveContentSection,
} from "../api/hooks";
import type { ContentDoc, ContentView } from "../api/schemas";
import { useAiJob } from "../lib/useAiJob";
import { strings } from "../strings";
import { AiTaskPanel } from "./AiTaskPanel";
import { Collapsible } from "./Collapsible";
import { ErrorNotice, Loaded, TextAreaField, fieldError } from "./Form";

const t = strings.content;

/** Mismos máximos que el servidor (`ContentCaps`): el perfil muestra lo principal, no todo el banco. */
const CAP = {
  headline: 90,
  summary: 420,
  highlights: 3,
  highlightText: 150,
  figure: 24,
  bullets: 3,
  bullet: 170,
  title: 120,
  projectSummary: 200,
  skillLabel: 30,
  skillsPerGroup: 8,
  note: 120,
  languageName: 60,
  languageLevel: 24,
} as const;

/** Orden en pantalla y orden de generación (el titular y el resumen sintetizan lo ya redactado, por eso van al final). */
const DISPLAY = [
  "overview",
  "experience",
  "projects",
  "skills",
  "credentials",
] as const;
const GENERATION = [
  "experience",
  "projects",
  "skills",
  "credentials",
  "overview",
] as const;
type SectionId = (typeof DISPLAY)[number];

const count = (value: string, max: number) => t.counter(value.length, max);

/** Contenido del perfil público: español editable, inglés sincronizado por IA, una sección a la vez. */
export function ContentPanel() {
  const content = useProfileContent();
  return (
    <Panel title={t.title} description={t.description}>
      <Loaded query={content}>{(view) => <Body view={view} />}</Loaded>
    </Panel>
  );
}

function Body({ view }: { view: ContentView }) {
  const [open, setOpen] = useState<SectionId | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const statusOf = (id: string) =>
    view.sections.find((s) => s.id === id)?.status ?? "empty";
  const allEmpty = DISPLAY.every((id) => statusOf(id) === "empty");
  const stale = GENERATION.filter((id) => statusOf(id) === "stale");

  return (
    <div className="flex flex-col gap-3">
      <Collapsible
        title={t.generateAll}
        expanded={generateOpen || allEmpty}
        onToggle={() => setGenerateOpen((v) => !v)}
      >
        <p className="mb-3 text-sm text-muted">{t.generateAllHint}</p>
        <AiTaskPanel
          kind="profile"
          title={t.generateAllTitle}
          fileBase="huella-perfil"
          input={() => ({})}
          steps={() =>
            GENERATION.map((id) => ({
              label: t.sections[id].generating,
              input: { sections: [id] },
            }))
          }
          runLabel={(label, model) => t.run(label, model)}
          externalHint={t.externalHint}
        />
      </Collapsible>

      {stale.length > 0 ? (
        <Collapsible
          title={t.stalePending(stale.length)}
          expanded
          onToggle={() => undefined}
        >
          <p className="mb-3 text-sm text-muted">{t.staleHint}</p>
          <AiTaskPanel
            kind="profile-translate"
            title={t.translateTitle}
            fileBase="huella-ingles"
            input={() => ({ sections: [...stale] })}
            steps={() =>
              stale.map((id) => ({
                label: t.sections[id].translating,
                input: { sections: [id] },
              }))
            }
            runLabel={(label, model) => t.translateRun(label, model)}
            externalHint={t.translateExternalHint}
          />
        </Collapsible>
      ) : null}

      {DISPLAY.map((id) => (
        <SectionCard
          key={id}
          id={id}
          status={statusOf(id)}
          view={view}
          expanded={open === id}
          onToggle={() => setOpen(open === id ? null : id)}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="accent">{t.status.ready}</Badge>;
  if (status === "stale") return <Badge variant="danger">{t.status.stale}</Badge>;
  return <Badge variant="neutral">{t.status.empty}</Badge>;
}

function SectionCard({
  id,
  status,
  view,
  expanded,
  onToggle,
}: {
  id: SectionId;
  status: string;
  view: ContentView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [regenerate, setRegenerate] = useState(false);
  return (
    <Collapsible
      title={t.sections[id].title}
      actions={<StatusBadge status={status} />}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t.sections[id].hint}</p>
        <Editor id={id} es={view.es} status={status} />
        <EnglishPreview id={id} en={view.en} status={status} />
        <div className="border-t border-line pt-3">
          <button
            type="button"
            aria-expanded={regenerate}
            onClick={() => setRegenerate((v) => !v)}
            className="text-sm font-medium text-accent-strong underline"
          >
            {t.regenerate}
          </button>
          {regenerate ? (
            <div className="mt-3">
              <p className="mb-3 text-sm text-muted">{t.regenerateHint}</p>
              <AiTaskPanel
                kind="profile"
                title={t.sections[id].generating}
                fileBase={`huella-perfil-${id}`}
                input={() => ({ sections: [id] })}
                runLabel={(label, model) => t.run(label, model)}
                externalHint={t.sectionExternalHint}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Collapsible>
  );
}

// ───────────────────────────── Guardar y reescribir el inglés ─────────────────────────────
/** Guarda el español de una sección y, si hay proveedor de IA, reescribe su inglés de inmediato (con aviso visible). */
function useSectionSave(id: SectionId) {
  const save = useSaveContentSection();
  const notify = useNotify();
  const job = useAiJob();
  const settings = useAiSettings();
  const active = settings.data?.providers.find((p) => p.isActive && p.readable);
  const submit = async (body: unknown) => {
    try {
      await save.mutateAsync({ section: id, body });
    } catch {
      return false;
    }
    notify(strings.common.saved);
    if (active) {
      void job.start(t.translateTitle, [
        {
          label: t.sections[id].translating,
          run: () => runAiTask("profile-translate", { sections: [id] }),
        },
      ]);
    }
    return true;
  };
  return { save, submit, dialog: job.dialog, hasAi: Boolean(active) };
}

function SaveBar({
  dirty,
  pending,
  hasAi,
  error,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  hasAi: boolean;
  error: unknown;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          type="button"
          disabled={!dirty}
          loading={pending}
          loadingLabel={strings.common.saving}
          onClick={onSave}
        >
          {t.save}
        </Button>
        <span className="text-sm text-muted">
          {hasAi ? t.saveHintAi : t.saveHintNoAi}
        </span>
      </div>
      <ErrorNotice error={error} />
    </div>
  );
}

function RemoveConfirm({
  remove,
  onClose,
}: {
  remove: { name: string; run: () => void } | null;
  onClose: () => void;
}) {
  if (!remove) return null;
  return (
    <ConfirmDialog
      title={strings.confirm.removeTitle(t.thisItem)}
      message={strings.confirm.removeMessage(remove.name)}
      confirmLabel={strings.common.remove}
      cancelLabel={strings.common.cancel}
      onClose={onClose}
      onConfirm={() => {
        remove.run();
        onClose();
      }}
    />
  );
}

function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      type="button"
      aria-label={`${strings.common.remove}: ${name}`}
      onClick={onClick}
    >
      {strings.common.remove}
    </Button>
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Estado de edición de una sección: borrador local, copia del servidor y aviso de cambios. */
function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  // Cuando el servidor trae contenido nuevo (guardado, IA, otra pestaña) y no hay cambios sin guardar, el borrador lo toma.
  const signature = JSON.stringify(initial);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    if (!dirty) setDraft(initial);
  }
  const update = (next: T) => {
    setDraft(next);
    setDirty(!same(next, initial));
  };
  return { draft, update, dirty, reset: () => setDirty(false) };
}

function Editor({ id, es, status }: { id: SectionId; es: ContentDoc; status: string }) {
  void status;
  switch (id) {
    case "overview":
      return <OverviewEditor es={es} />;
    case "experience":
      return <ExperienceEditor es={es} />;
    case "projects":
      return <ProjectsEditor es={es} />;
    case "skills":
      return <SkillsEditor es={es} />;
    default:
      return <CredentialsEditor es={es} />;
  }
}

// ───────────────────────────── Titular, resumen y destacados ─────────────────────────────
function OverviewEditor({ es }: { es: ContentDoc }) {
  const { save, submit, dialog, hasAi } = useSectionSave("overview");
  const initial = {
    headline: es.headline,
    summary: es.summary,
    highlights: es.highlights.map((h) => ({ figure: h.figure ?? "", text: h.text })),
  };
  const { draft, update, dirty, reset } = useDraft(initial);
  const [remove, setRemove] = useState<{ name: string; run: () => void } | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label={t.overview.headline}
        value={draft.headline}
        maxLength={CAP.headline}
        hint={count(draft.headline, CAP.headline)}
        error={err("headline")}
        onChange={(e) => update({ ...draft, headline: e.target.value })}
      />
      <TextAreaField
        label={t.overview.summary}
        rows={5}
        value={draft.summary}
        maxLength={CAP.summary}
        hint={count(draft.summary, CAP.summary)}
        error={err("summary")}
        onChange={(e) => update({ ...draft, summary: e.target.value })}
      />
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-fg">{t.overview.highlights}</h4>
        {draft.highlights.map((h, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <TextField
              label={t.overview.figure}
              value={h.figure}
              maxLength={CAP.figure}
              error={err(`highlights[${i}].figure`)}
              onChange={(e) =>
                update({
                  ...draft,
                  highlights: draft.highlights.map((x, j) => (j === i ? { ...x, figure: e.target.value } : x)),
                })
              }
            />
            <TextField
              label={t.overview.highlightText}
              value={h.text}
              maxLength={CAP.highlightText}
              hint={count(h.text, CAP.highlightText)}
              error={err(`highlights[${i}].text`)}
              onChange={(e) =>
                update({
                  ...draft,
                  highlights: draft.highlights.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                })
              }
            />
            <RemoveButton
              name={h.text || t.overview.highlight}
              onClick={() =>
                setRemove({
                  name: h.text || t.overview.highlight,
                  run: () => update({ ...draft, highlights: draft.highlights.filter((_, j) => j !== i) }),
                })
              }
            />
          </div>
        ))}
        <div>
          <Button
            variant="secondary"
            type="button"
            disabled={draft.highlights.length >= CAP.highlights}
            onClick={() => update({ ...draft, highlights: [...draft.highlights, { figure: "", text: "" }] })}
          >
            {t.overview.addHighlight}
          </Button>
        </div>
      </div>
      <SaveBar
        dirty={dirty}
        pending={save.isPending}
        hasAi={hasAi}
        error={save.error}
        onSave={() =>
          void submit({
            headline: draft.headline,
            summary: draft.summary,
            highlights: draft.highlights.map((h) => ({ figure: h.figure.trim() || null, text: h.text })),
          }).then((ok) => ok && reset())
        }
      />
      <RemoveConfirm remove={remove} onClose={() => setRemove(null)} />
      {dialog}
    </div>
  );
}

// ───────────────────────────── Experiencia ─────────────────────────────
function ExperienceEditor({ es }: { es: ContentDoc }) {
  const { save, submit, dialog, hasAi } = useSectionSave("experience");
  const initial = es.experience.map((e) => ({
    sourceId: e.sourceId,
    role: e.role,
    company: e.company,
    start: e.start,
    end: e.end,
    bullets: e.bullets,
  }));
  const { draft, update, dirty, reset } = useDraft(initial);
  const [remove, setRemove] = useState<{ name: string; run: () => void } | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  if (draft.length === 0) return <p className="text-sm text-muted">{t.emptySection}</p>;
  const set = (i: number, patch: Partial<(typeof draft)[number]>) =>
    update(draft.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="flex flex-col gap-4">
      {draft.map((e, i) => (
        <div key={e.sourceId} className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-fg">
              {e.company} · {e.start.slice(0, 4)}–{e.end ? e.end.slice(0, 4) : t.present}
            </p>
            <RemoveButton
              name={`${e.role} · ${e.company}`}
              onClick={() =>
                setRemove({
                  name: `${e.role} · ${e.company}`,
                  run: () => update(draft.filter((_, j) => j !== i)),
                })
              }
            />
          </div>
          <TextField
            label={t.experience.role}
            value={e.role}
            maxLength={CAP.title}
            error={err(`experience[${i}].role`)}
            onChange={(ev) => set(i, { role: ev.target.value })}
          />
          {e.bullets.map((b, k) => (
            <div key={k} className="flex items-start gap-2">
              <div className="flex-1">
                <TextAreaField
                  label={t.experience.bullet(k + 1)}
                  rows={2}
                  value={b}
                  maxLength={CAP.bullet}
                  hint={count(b, CAP.bullet)}
                  error={err(`experience[${i}].bullets[${k}]`)}
                  onChange={(ev) => set(i, { bullets: e.bullets.map((x, j) => (j === k ? ev.target.value : x)) })}
                />
              </div>
              <div className="pt-7">
                <RemoveButton
                  name={t.experience.bullet(k + 1)}
                  onClick={() =>
                    setRemove({
                      name: b || t.experience.bullet(k + 1),
                      run: () => set(i, { bullets: e.bullets.filter((_, j) => j !== k) }),
                    })
                  }
                />
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              type="button"
              disabled={e.bullets.length >= CAP.bullets}
              onClick={() => set(i, { bullets: [...e.bullets, ""] })}
            >
              {t.experience.addBullet}
            </Button>
          </div>
        </div>
      ))}
      <SaveBar
        dirty={dirty}
        pending={save.isPending}
        hasAi={hasAi}
        error={save.error}
        onSave={() =>
          void submit({
            experience: draft.map((e) => ({ ...e, location: null, bullets: e.bullets })),
          }).then((ok) => ok && reset())
        }
      />
      <RemoveConfirm remove={remove} onClose={() => setRemove(null)} />
      {dialog}
    </div>
  );
}

// ───────────────────────────── Proyectos ─────────────────────────────
function ProjectsEditor({ es }: { es: ContentDoc }) {
  const { save, submit, dialog, hasAi } = useSectionSave("projects");
  const initial = es.projects.map((p) => ({ sourceId: p.sourceId, name: p.name, stack: p.stack, summary: p.summary }));
  const { draft, update, dirty, reset } = useDraft(initial);
  const [remove, setRemove] = useState<{ name: string; run: () => void } | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  if (draft.length === 0) return <p className="text-sm text-muted">{t.emptySection}</p>;
  return (
    <div className="flex flex-col gap-4">
      {draft.map((p, i) => (
        <div key={p.sourceId} className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-fg">
              {p.name}
              {p.stack ? <span className="text-muted"> · {p.stack}</span> : null}
            </p>
            <RemoveButton
              name={p.name}
              onClick={() => setRemove({ name: p.name, run: () => update(draft.filter((_, j) => j !== i)) })}
            />
          </div>
          <TextAreaField
            label={t.projects.summary}
            rows={3}
            value={p.summary}
            maxLength={CAP.projectSummary}
            hint={count(p.summary, CAP.projectSummary)}
            error={err(`projects[${i}].summary`)}
            onChange={(e) => update(draft.map((x, j) => (j === i ? { ...x, summary: e.target.value } : x)))}
          />
        </div>
      ))}
      <SaveBar
        dirty={dirty}
        pending={save.isPending}
        hasAi={hasAi}
        error={save.error}
        onSave={() =>
          void submit({
            projects: draft.map((p) => ({ sourceId: p.sourceId, name: p.name, url: null, stack: p.stack, summary: p.summary })),
          }).then((ok) => ok && reset())
        }
      />
      <RemoveConfirm remove={remove} onClose={() => setRemove(null)} />
      {dialog}
    </div>
  );
}

// ───────────────────────────── Habilidades ─────────────────────────────
function SkillsEditor({ es }: { es: ContentDoc }) {
  const { save, submit, dialog, hasAi } = useSectionSave("skills");
  const initial = es.skills.map((g) => ({ label: g.label, itemsText: g.items.join(", ") }));
  const { draft, update, dirty, reset } = useDraft(initial);
  const [remove, setRemove] = useState<{ name: string; run: () => void } | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  if (draft.length === 0) return <p className="text-sm text-muted">{t.emptySection}</p>;
  return (
    <div className="flex flex-col gap-4">
      {draft.map((g, i) => (
        <div key={i} className="grid items-end gap-2 sm:grid-cols-[12rem_1fr_auto]">
          <TextField
            label={t.skills.label}
            value={g.label}
            maxLength={CAP.skillLabel}
            error={err(`skills[${i}].label`)}
            onChange={(e) => update(draft.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <TextField
            label={t.skills.items}
            hint={t.skills.itemsHint(CAP.skillsPerGroup)}
            value={g.itemsText}
            error={err(`skills[${i}].items`)}
            onChange={(e) => update(draft.map((x, j) => (j === i ? { ...x, itemsText: e.target.value } : x)))}
          />
          <RemoveButton
            name={g.label}
            onClick={() => setRemove({ name: g.label, run: () => update(draft.filter((_, j) => j !== i)) })}
          />
        </div>
      ))}
      <SaveBar
        dirty={dirty}
        pending={save.isPending}
        hasAi={hasAi}
        error={save.error}
        onSave={() =>
          void submit({
            skills: draft.map((g) => ({
              label: g.label,
              items: g.itemsText.split(",").map((x) => x.trim()).filter(Boolean),
            })),
          }).then((ok) => ok && reset())
        }
      />
      <RemoveConfirm remove={remove} onClose={() => setRemove(null)} />
      {dialog}
    </div>
  );
}

// ───────────────────────────── Formación, certificaciones e idiomas ─────────────────────────────
function CredentialsEditor({ es }: { es: ContentDoc }) {
  const { save, submit, dialog, hasAi } = useSectionSave("credentials");
  const initial = {
    education: es.education.map((e) => ({ sourceId: e.sourceId, degree: e.degree, institution: e.institution, note: e.note ?? "" })),
    certifications: es.certifications.map((c) => ({ sourceId: c.sourceId, name: c.name, issuer: c.issuer })),
    languages: es.languages.map((l) => ({ sourceId: l.sourceId, language: l.language, level: l.level })),
  };
  const { draft, update, dirty, reset } = useDraft(initial);
  const [remove, setRemove] = useState<{ name: string; run: () => void } | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  if (draft.education.length + draft.certifications.length + draft.languages.length === 0) {
    return <p className="text-sm text-muted">{t.emptySection}</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {draft.education.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-fg">{t.credentials.education}</legend>
          {draft.education.map((e, i) => (
            <div key={e.sourceId} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <TextField
                label={`${t.credentials.degree} · ${e.institution}`}
                value={e.degree}
                maxLength={CAP.title}
                error={err(`education[${i}].degree`)}
                onChange={(ev) => update({ ...draft, education: draft.education.map((x, j) => (j === i ? { ...x, degree: ev.target.value } : x)) })}
              />
              <TextField
                label={t.credentials.note}
                value={e.note}
                maxLength={CAP.note}
                error={err(`education[${i}].note`)}
                onChange={(ev) => update({ ...draft, education: draft.education.map((x, j) => (j === i ? { ...x, note: ev.target.value } : x)) })}
              />
              <RemoveButton
                name={e.degree}
                onClick={() => setRemove({ name: e.degree, run: () => update({ ...draft, education: draft.education.filter((_, j) => j !== i) }) })}
              />
            </div>
          ))}
        </fieldset>
      ) : null}
      {draft.certifications.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-fg">{t.credentials.certifications}</legend>
          {draft.certifications.map((c, i) => (
            <div key={c.sourceId} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
              <TextField
                label={c.issuer ? `${t.credentials.name} · ${c.issuer}` : t.credentials.name}
                value={c.name}
                maxLength={CAP.title}
                error={err(`certifications[${i}].name`)}
                onChange={(ev) => update({ ...draft, certifications: draft.certifications.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)) })}
              />
              <RemoveButton
                name={c.name}
                onClick={() => setRemove({ name: c.name, run: () => update({ ...draft, certifications: draft.certifications.filter((_, j) => j !== i) }) })}
              />
            </div>
          ))}
        </fieldset>
      ) : null}
      {draft.languages.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-fg">{t.credentials.languages}</legend>
          {draft.languages.map((l, i) => (
            <div key={l.sourceId} className="grid items-end gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <TextField
                label={t.credentials.language}
                value={l.language}
                maxLength={CAP.languageName}
                error={err(`languages[${i}].language`)}
                onChange={(ev) => update({ ...draft, languages: draft.languages.map((x, j) => (j === i ? { ...x, language: ev.target.value } : x)) })}
              />
              <TextField
                label={t.credentials.level}
                value={l.level}
                maxLength={CAP.languageLevel}
                error={err(`languages[${i}].level`)}
                onChange={(ev) => update({ ...draft, languages: draft.languages.map((x, j) => (j === i ? { ...x, level: ev.target.value } : x)) })}
              />
              <RemoveButton
                name={l.language}
                onClick={() => setRemove({ name: l.language, run: () => update({ ...draft, languages: draft.languages.filter((_, j) => j !== i) }) })}
              />
            </div>
          ))}
        </fieldset>
      ) : null}
      <SaveBar
        dirty={dirty}
        pending={save.isPending}
        hasAi={hasAi}
        error={save.error}
        onSave={() =>
          void submit({
            education: draft.education.map((e) => ({ ...e, startYear: null, endYear: null, note: e.note.trim() || null })),
            certifications: draft.certifications.map((c) => ({ ...c, year: null, url: null })),
            languages: draft.languages,
          }).then((ok) => ok && reset())
        }
      />
      <RemoveConfirm remove={remove} onClose={() => setRemove(null)} />
      {dialog}
    </div>
  );
}

// ───────────────────────────── Vista del inglés (solo lectura) ─────────────────────────────
function EnglishPreview({ id, en, status }: { id: SectionId; en: ContentDoc; status: string }) {
  const lines = englishLines(id, en);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-accent-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-fg">{t.english.title}</h4>
        {status === "stale" ? <Badge variant="danger">{t.status.stale}</Badge> : null}
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-muted">{t.english.empty}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">{t.english.note}</p>
    </div>
  );
}

function englishLines(id: SectionId, en: ContentDoc): ReactNode[] {
  switch (id) {
    case "overview":
      return [en.headline, en.summary, ...en.highlights.map((h) => (h.figure ? `${h.figure} — ${h.text}` : h.text))].filter(Boolean);
    case "experience":
      return en.experience.flatMap((e) => [`${e.role} · ${e.company}`, ...e.bullets]);
    case "projects":
      return en.projects.map((p) => `${p.name}: ${p.summary}`);
    case "skills":
      return en.skills.map((g) => `${g.label}: ${g.items.join(", ")}`);
    default:
      return [
        ...en.education.map((e) => `${e.degree}, ${e.institution}${e.note ? ` · ${e.note}` : ""}`),
        ...en.certifications.map((c) => c.name),
        ...en.languages.map((l) => `${l.language} (${l.level})`),
      ];
  }
}
