import { ArrowDown, ArrowUp, ChevronsDownUp, ChevronsUpDown, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { Blocker } from "react-router";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel } from "@/core/ui";
import { focusClass } from "@/core/ui/styles";
import { regenerateSection, useOffers, useSaveDocument } from "../api/hooks";
import type { CvVersion } from "../api/schemas";
import {
  applySection,
  move,
  newBullet,
  newCompetency,
  newEducation,
  newEntry,
  newRow,
  newSkillGroup,
  remove,
  toInput,
  update,
  type BulletRow,
  type CompetencyGroupRow,
  type CompetencyRow,
  type Draft,
  type EducationRow,
  type EntryRow,
  type Row,
  type SectionKey,
  type SkillGroupRow,
} from "../lib/cvDraft";
import { useAiJob } from "../lib/useAiJob";
import { SectionAiDialog } from "./SectionAiDialog";
import type { useCvDraft } from "../lib/useCvDraft";
import { languageName } from "../lib/usePairSync";
import { strings } from "../strings";
import { Collapsible } from "./Collapsible";
import { ErrorNotice, fieldError } from "./Form";

const f = strings.studio.editor.free;
const sectionTitles = { ...strings.public.sections, summary: strings.studio.editor.summary };

type Free = ReturnType<typeof useCvDraft>;

// ───────────────────────────── Piezas compactas ─────────────────────────────

const field = `min-h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-fg placeholder:text-muted aria-[invalid=true]:border-danger ${focusClass}`;
const tool = `inline-grid size-8 shrink-0 place-items-center rounded-lg text-fg-secondary hover:bg-accent-soft hover:text-fg disabled:pointer-events-none disabled:opacity-40 ${focusClass}`;
const textAction = `inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium ${focusClass}`;

function Tool({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={tool}>
      {children}
    </button>
  );
}

/** Subir, bajar y quitar una fila; el nombre dice a qué fila se refiere (`Subir viñeta 2`). */
function RowTools({ what, index, count, onMove, onRemove }: { what: string; index: number; count: number; onMove: (delta: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Tool label={`${f.up} ${what}`} disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp aria-hidden="true" className="size-3.5" />
      </Tool>
      <Tool label={`${f.down} ${what}`} disabled={index === count - 1} onClick={() => onMove(1)}>
        <ArrowDown aria-hidden="true" className="size-3.5" />
      </Tool>
      <Tool label={`${f.remove} ${what}`} onClick={onRemove}>
        <Trash2 aria-hidden="true" className="size-3.5 text-danger" />
      </Tool>
    </div>
  );
}

/** Campo de una línea con su etiqueta pequeña encima (o solo para lectores de pantalla si `hideLabel`). */
function Input({ label, value, onChange, error, hideLabel = false, className = "" }: { label: string; value: string; onChange: (value: string) => void; error?: string; hideLabel?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-xs font-medium text-fg-secondary"}>
        {label}
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} className={field} />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/** Texto de varias líneas que crece con lo que se escribe, sin límite de caracteres. */
function Area({ label, value, onChange, hideLabel = false }: { label: string; value: string; onChange: (value: string) => void; hideLabel?: boolean }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-xs font-medium text-fg-secondary"}>
        {label}
      </label>
      <textarea id={id} rows={1} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} field-sizing-content py-1.5 leading-relaxed`} />
    </div>
  );
}

/**
 * Sección plegable. Cerrada muestra su título con un contador; quitada, una fila punteada con «Agregar sección». Las
 * secciones y los cargos se pliegan para ver y editar solo lo que se necesita.
 */
function Block({
  title,
  count,
  present,
  open,
  onToggle,
  onRemove,
  onAdd,
  onRegenerate,
  onGenerate,
  busy = false,
  children,
}: {
  title: string;
  count?: number;
  present: boolean;
  open: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  onAdd?: () => void;
  /** Vuelve a redactar la sección con IA contra la oferta (pide confirmar: se pierde lo anterior). */
  onRegenerate?: () => void;
  /** Genera con IA una sección que estaba quitada, en vez de dejarla en blanco. */
  onGenerate?: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  if (!present) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line-strong px-3 py-1.5">
        <span className="text-sm font-semibold text-muted">{title}</span>
        <span className="text-xs text-muted">{f.removedShort}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {onGenerate ? (
            <button type="button" disabled={busy} onClick={onGenerate} aria-label={`${f.ai.generate}: ${title}`} className={`${textAction} text-accent-strong hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40`}>
              <RefreshCw aria-hidden="true" className="size-3.5" />
              {f.ai.generate}
            </button>
          ) : null}
          <button type="button" onClick={onAdd} aria-label={`${f.ai.blank}: ${title}`} className={`${textAction} text-fg-secondary hover:bg-accent-soft`}>
            <Plus aria-hidden="true" className="size-3.5" />
            {f.ai.blank}
          </button>
        </div>
      </div>
    );
  }
  return (
    <Collapsible
      dense
      heading="h4"
      expanded={open}
      onToggle={onToggle}
      title={
        <>
          {title}
          {count !== undefined ? <span className="font-normal text-muted"> · {count}</span> : null}
        </>
      }
      actions={
        <>
          {onRegenerate ? (
            <button type="button" disabled={busy} onClick={onRegenerate} aria-label={`${onRemove ? f.ai.regenerate : f.ai.regenerateHeadline}: ${title}`} className={`${textAction} text-accent-strong hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40`}>
              <RefreshCw aria-hidden="true" className="size-3.5" />
              {onRemove ? f.ai.regenerate : f.ai.regenerateHeadline}
            </button>
          ) : null}
          {onRemove ? (
            <button type="button" onClick={onRemove} aria-label={`${f.removeSection}: ${title}`} className={`${textAction} text-danger hover:bg-danger-soft`}>
              <Trash2 aria-hidden="true" className="size-3.5" />
              {f.removeSection}
            </button>
          ) : null}
        </>
      }
    >
      {children}
    </Collapsible>
  );
}

/** Etiquetas cortas editables (contacto, enlaces, habilidades): cada una se edita en su sitio y se quita con su ✕. */
function Chips({ rows, onChange, label, addLabel }: { rows: Row[]; onChange: (rows: Row[]) => void; label: (n: number) => string; addLabel: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-center rounded-lg border border-line-strong bg-surface focus-within:ring-3 focus-within:ring-accent-strong/45">
          <input
            aria-label={label(i + 1)}
            value={row.value}
            onChange={(e) => onChange(update(rows, row.key, { value: e.target.value }))}
            className="field-sizing-content min-h-8 max-w-72 min-w-16 rounded-l-lg bg-transparent px-2.5 text-sm text-fg outline-none"
          />
          <button type="button" aria-label={`${f.remove} ${label(i + 1).toLowerCase()}`} onClick={() => onChange(remove(rows, row.key))} className="grid size-8 shrink-0 place-items-center rounded-r-lg text-muted hover:text-danger">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, newRow()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
        <Plus aria-hidden="true" className="size-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

/** Lista de líneas largas (otros datos): un campo por fila, con orden y quitar. */
function RowList({ rows, onChange, label, addLabel }: { rows: Row[]; onChange: (rows: Row[]) => void; label: (n: number) => string; addLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-center gap-1">
          <Input hideLabel className="flex-1" label={label(i + 1)} value={row.value} onChange={(value) => onChange(update(rows, row.key, { value }))} />
          <RowTools what={label(i + 1).toLowerCase()} index={i} count={rows.length} onMove={(d) => onChange(move(rows, row.key, d))} onRemove={() => onChange(remove(rows, row.key))} />
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...rows, newRow()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
          <Plus aria-hidden="true" className="size-3.5" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Secciones ─────────────────────────────

/** Una línea por categoría, como en el CV: «Lenguajes: Java, Kotlin». */
function SkillGroups({ groups, onChange }: { groups: SkillGroupRow[]; onChange: (groups: SkillGroupRow[] | null) => void }) {
  const s = f.skills;
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, i) => (
        <div key={group.key} className="flex flex-wrap items-start gap-x-2 gap-y-1 border-b border-line pb-2 last:border-b-0">
          <div className="flex w-44 shrink-0 flex-col gap-0.5">
            <Input hideLabel label={s.label} value={group.label} onChange={(label) => onChange(update(groups, group.key, { label }))} />
            {group.soft ? <p className="text-xs text-muted">{s.softHint}</p> : null}
          </div>
          <Chips rows={group.items} label={s.item} addLabel={s.addItem} onChange={(items) => onChange(update(groups, group.key, { items }))} />
          <RowTools what={s.group(i + 1)} index={i} count={groups.length} onMove={(d) => onChange(move(groups, group.key, d))} onRemove={() => onChange(remove(groups, group.key))} />
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...groups, newSkillGroup()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
          <Plus aria-hidden="true" className="size-3.5" />
          {s.addGroup}
        </button>
      </div>
    </div>
  );
}

function CompetencyGroups({ groups, onChange }: { groups: CompetencyGroupRow[]; onChange: (groups: CompetencyGroupRow[]) => void }) {
  const c = f.competencies;
  const setItems = (group: CompetencyGroupRow, items: CompetencyRow[]) => onChange(update(groups, group.key, { items }));
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, i) => (
        <div key={group.key} className="flex flex-col gap-1.5 border-b border-line pb-3 last:border-b-0">
          <div className="flex items-end gap-1">
            <Input className="flex-1" label={c.label} value={group.label} onChange={(label) => onChange(update(groups, group.key, { label }))} />
            <RowTools what={c.group(i + 1)} index={i} count={groups.length} onMove={(d) => onChange(move(groups, group.key, d))} onRemove={() => onChange(remove(groups, group.key))} />
          </div>
          {group.items.map((item, j) => (
            <div key={item.key} className="flex items-center gap-1">
              <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Input hideLabel label={c.name} value={item.name} onChange={(name) => setItems(group, update(group.items, item.key, { name }))} />
                <Input hideLabel label={c.note} value={item.note} onChange={(note) => setItems(group, update(group.items, item.key, { note }))} />
              </div>
              <RowTools what={c.item(j + 1)} index={j} count={group.items.length} onMove={(d) => setItems(group, move(group.items, item.key, d))} onRemove={() => setItems(group, remove(group.items, item.key))} />
            </div>
          ))}
          <div>
            <button type="button" onClick={() => setItems(group, [...group.items, newCompetency()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
              <Plus aria-hidden="true" className="size-3.5" />
              {c.addItem}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Las viñetas como en el CV: un punto y el texto, con sus herramientas al lado. */
function Bullets({ bullets, onChange }: { bullets: BulletRow[]; onChange: (bullets: BulletRow[]) => void }) {
  const e = f.entry;
  return (
    <div className="flex flex-col gap-1.5">
      {bullets.map((bullet, i) => (
        <div key={bullet.key} className="flex items-start gap-1">
          <span aria-hidden="true" className="w-3 shrink-0 pt-1.5 text-center text-fg-secondary">
            •
          </span>
          <Area hideLabel label={e.bullet(i + 1)} value={bullet.text} onChange={(text) => onChange(update(bullets, bullet.key, { text }))} />
          <RowTools what={e.bulletOf(i + 1)} index={i} count={bullets.length} onMove={(d) => onChange(move(bullets, bullet.key, d))} onRemove={() => onChange(remove(bullets, bullet.key))} />
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...bullets, newBullet()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
          <Plus aria-hidden="true" className="size-3.5" />
          {e.addBullet}
        </button>
      </div>
    </div>
  );
}

/** Cargos o proyectos: cada uno plegable; cargo, empresa y fechas en una sola línea, como en el CV. */
function Entries({ entries, project, closed, onToggle, onChange }: { entries: EntryRow[]; project: boolean; closed: ReadonlySet<string>; onToggle: (key: string) => void; onChange: (entries: EntryRow[]) => void }) {
  const e = f.entry;
  const set = (entry: EntryRow, patch: Partial<EntryRow>) => onChange(update(entries, entry.key, patch));
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <Collapsible
          key={entry.key}
          dense
          heading="h5"
          expanded={!closed.has(entry.key)}
          onToggle={() => onToggle(entry.key)}
          title={
            <>
              {entry.title || f.untitled}
              {entry.subtitle ? <span className="font-normal text-fg-secondary"> · {entry.subtitle}</span> : null}
              <span className="font-normal text-muted"> · {f.bulletCount(entry.bullets.length)}</span>
            </>
          }
          actions={<RowTools what={e.entry(i + 1)} index={i} count={entries.length} onMove={(d) => onChange(move(entries, entry.key, d))} onRemove={() => onChange(remove(entries, entry.key))} />}
        >
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
              <Input label={project ? e.projectTitle : e.title} value={entry.title} onChange={(title) => set(entry, { title })} />
              <Input label={project ? e.projectSubtitle : e.subtitle} value={entry.subtitle} onChange={(subtitle) => set(entry, { subtitle })} />
              <Input label={e.dates} value={entry.dates} onChange={(dates) => set(entry, { dates })} />
            </div>
            {project ? null : (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Input label={e.location} value={entry.location} onChange={(location) => set(entry, { location })} />
                <Input label={e.context} value={entry.context} onChange={(context) => set(entry, { context })} />
              </div>
            )}
            <Bullets bullets={entry.bullets} onChange={(bullets) => set(entry, { bullets })} />
          </div>
        </Collapsible>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...entries, newEntry()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
          <Plus aria-hidden="true" className="size-3.5" />
          {project ? e.addProject : e.addEntry}
        </button>
      </div>
    </div>
  );
}

function Educations({ rows, onChange }: { rows: EducationRow[]; onChange: (rows: EducationRow[]) => void }) {
  const ed = f.education;
  const set = (row: EducationRow, patch: Partial<EducationRow>) => onChange(update(rows, row.key, patch));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-end gap-1 border-b border-line pb-2 last:border-b-0">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_7rem_minmax(0,1.5fr)]">
            <Input label={ed.degree} value={row.degree} onChange={(degree) => set(row, { degree })} />
            <Input label={ed.institution} value={row.institution} onChange={(institution) => set(row, { institution })} />
            <Input label={ed.dates} value={row.dates} onChange={(dates) => set(row, { dates })} />
            <Input label={ed.detail} value={row.detail} onChange={(detail) => set(row, { detail })} />
          </div>
          <RowTools what={ed.item(i + 1)} index={i} count={rows.length} onMove={(d) => onChange(move(rows, row.key, d))} onRemove={() => onChange(remove(rows, row.key))} />
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...rows, newEducation()])} className={`${textAction} text-accent-strong hover:bg-accent-soft`}>
          <Plus aria-hidden="true" className="size-3.5" />
          {ed.add}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Pantalla ─────────────────────────────

/** Avisa antes de salir de la pantalla con cambios sin guardar. */
export function LeaveGuard({ blocker }: { blocker: Blocker }) {
  if (blocker.state !== "blocked") return null;
  return (
    <ConfirmDialog
      title={f.leaveTitle}
      message={f.leaveMessage}
      confirmLabel={f.leaveConfirm}
      cancelLabel={f.leaveStay}
      onConfirm={() => blocker.proceed()}
      onClose={() => blocker.reset()}
    />
  );
}

const SECTIONS = ["header", "summary", "skills", "competencies", "experience", "projects", "education", "extras"] as const;

/**
 * Edición libre del CV: todo el documento precargado en campos, en el orden del CV y en filas compactas (cargo, empresa y
 * fechas en una línea; viñetas con su punto; contacto y habilidades como etiquetas). Las secciones y los cargos se pliegan
 * (con un contador al estar cerrados) y hay «Colapsar todo / Expandir todo». Se puede quitar secciones, cargos, viñetas y
 * habilidades, agregar y ordenar. Sin topes de caracteres, de viñetas ni de páginas: el servidor solo limpia el texto (sin
 * HTML) y el PDF y el Word salen tal cual con el estilo de siempre. Nada se guarda hasta pulsar «Guardar cambios».
 */
export function CvFreeEditor({ version, free, onSaved }: { version: CvVersion; free: Free; onSaved?: (saved: CvVersion) => void }) {
  const { draft, setDraft, dirty, reset } = free;
  const save = useSaveDocument();
  const notify = useNotify();
  const [discarding, setDiscarding] = useState(false);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const job = useAiJob();
  const offers = useOffers();
  const [confirming, setConfirming] = useState<{ key: SectionKey; generate: boolean } | null>(null);
  const offer = offers.data?.find((o) => o.id === version.summary.offerId);
  // En un CV de competencias y habilidades las personales son una categoría del apartado «Habilidades».
  const skillsTitle = version.document.format === "combined" ? f.skills.combinedTitle : sectionTitles.tools;
  const sectionTitle = (key: SectionKey) =>
    ({
      header: f.header.title,
      summary: sectionTitles.summary,
      skills: skillsTitle,
      competencies: f.competencies.title,
      experience: sectionTitles.path,
      projects: sectionTitles.projects,
      education: sectionTitles.education,
      extras: f.extras.title,
    })[key];

  /**
   * Vuelve a redactar una sección con IA contra la oferta de este CV (o su enfoque) y el banco, con ventana de progreso. La
   * sección nueva reemplaza a la del borrador: nada se guarda hasta «Guardar cambios», y «Descartar cambios» la deshace.
   */
  const regenerate = async (key: SectionKey) => {
    await job.start(f.ai.title(sectionTitle(key)), [
      {
        label: f.ai.step(sectionTitle(key)),
        run: async () => {
          const generated = await regenerateSection(version.summary.id, { section: key, draft: toInput(draft) });
          // Se aplica aquí (no al terminar la ventana) para que también valga si la persona reintenta tras un fallo.
          setDraft((d) => applySection(d, key, generated.document));
          notify(f.ai.done, "success");
          return { kind: "cv-section", accepted: 1, rejected: generated.warnings, versionIds: [], sections: [key] };
        },
      },
    ]);
  };
  const ai = (key: SectionKey) => ({ onRegenerate: () => setConfirming({ key, generate: false }), onGenerate: () => setConfirming({ key, generate: true }), busy: job.running });
  const aiTarget = offer ? f.ai.targetOffer(offer.company ? `${offer.title} · ${offer.company}` : offer.title) : f.ai.targetFocus;
  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));
  const hasCompetencies = draft.competencies !== null || version.document.format === "competencies";
  const nameMissing = draft.name.trim() === "";

  const toggle = (key: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const open = (key: string) => !closed.has(key);
  const collapseAll = () =>
    setClosed(new Set([...SECTIONS, ...(draft.experience ?? []).map((e) => e.key), ...(draft.projects ?? []).map((e) => e.key)]));

  const onSave = () =>
    save.mutate(
      { id: version.summary.id, vars: toInput(draft) },
      {
        onSuccess: (saved) => {
          reset(saved.document);
          notify(strings.common.saved, "success");
          onSaved?.(saved);
        },
      },
    );

  const setEntries = (kind: "experience" | "projects") => (entries: EntryRow[]) => patch({ [kind]: entries.length > 0 ? entries : null });

  return (
    <Panel
      title={f.title}
      description={f.description}
      actions={
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={collapseAll} className={`${textAction} text-fg-secondary hover:bg-accent-soft`}>
            <ChevronsDownUp aria-hidden="true" className="size-3.5" />
            {f.collapseAll}
          </button>
          <button type="button" onClick={() => setClosed(new Set())} className={`${textAction} text-fg-secondary hover:bg-accent-soft`}>
            <ChevronsUpDown aria-hidden="true" className="size-3.5" />
            {f.expandAll}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">{f.note}</p>
        {version.pair ? <p className="text-xs text-fg-secondary">{strings.studio.editor.pair.freeNote(languageName(version.pair.twinLanguage))}</p> : null}

        <Block {...ai("header")} title={f.header.title} present open={open("header")} onToggle={() => toggle("header")}>
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label={f.header.name} value={draft.name} error={nameMissing ? f.header.nameRequired : fieldError(save.error, "header.name")} onChange={(name) => patch({ name })} />
              <Input label={f.header.headline} value={draft.headline} onChange={(headline) => patch({ headline })} />
            </div>
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <span className="w-24 shrink-0 pt-1.5 text-xs font-medium text-fg-secondary">{f.header.contactShort}</span>
              <Chips rows={draft.contact1} onChange={(contact1) => patch({ contact1 })} label={f.header.contactItem} addLabel={f.header.addContact} />
            </div>
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <span className="w-24 shrink-0 pt-1.5 text-xs font-medium text-fg-secondary">{f.header.linksShort}</span>
              <Chips rows={draft.contact2} onChange={(contact2) => patch({ contact2 })} label={f.header.linkItem} addLabel={f.header.addLink} />
            </div>
          </div>
        </Block>

        <Block {...ai("summary")} title={sectionTitles.summary} present={draft.summary !== null} open={open("summary")} onToggle={() => toggle("summary")} onRemove={() => patch({ summary: null })} onAdd={() => patch({ summary: "" })}>
          <Area hideLabel label={f.summary.label} value={draft.summary ?? ""} onChange={(summary) => patch({ summary })} />
        </Block>

        <Block {...ai("skills")} title={skillsTitle} count={draft.skills?.length} present={draft.skills !== null} open={open("skills")} onToggle={() => toggle("skills")} onRemove={() => patch({ skills: null })} onAdd={() => patch({ skills: [newSkillGroup()] })}>
          <SkillGroups groups={draft.skills ?? []} onChange={(skills) => patch({ skills: skills && skills.length > 0 ? skills : null })} />
        </Block>

        {hasCompetencies ? (
          <Block
            {...ai("competencies")}
            title={f.competencies.title}
            count={draft.competencies?.reduce((n, g) => n + g.items.length, 0)}
            present={draft.competencies !== null}
            open={open("competencies")}
            onToggle={() => toggle("competencies")}
            onRemove={() => patch({ competencies: null })}
            onAdd={() =>
              patch({
                competencies: [
                  { key: newRow().key, kind: "personal", label: "Personales", items: [newCompetency()] },
                  { key: newRow().key, kind: "technical", label: "Técnicas", items: [newCompetency()] },
                ],
              })
            }
          >
            <CompetencyGroups groups={draft.competencies ?? []} onChange={(competencies) => patch({ competencies })} />
          </Block>
        ) : null}

        <Block {...ai("experience")} title={sectionTitles.path} count={draft.experience?.length} present={draft.experience !== null} open={open("experience")} onToggle={() => toggle("experience")} onRemove={() => patch({ experience: null })} onAdd={() => patch({ experience: [newEntry()] })}>
          <Entries entries={draft.experience ?? []} project={false} closed={closed} onToggle={toggle} onChange={setEntries("experience")} />
        </Block>

        <Block {...ai("projects")} title={sectionTitles.projects} count={draft.projects?.length} present={draft.projects !== null} open={open("projects")} onToggle={() => toggle("projects")} onRemove={() => patch({ projects: null })} onAdd={() => patch({ projects: [newEntry()] })}>
          <Entries entries={draft.projects ?? []} project closed={closed} onToggle={toggle} onChange={setEntries("projects")} />
        </Block>

        <Block {...ai("education")} title={sectionTitles.education} count={draft.education?.length} present={draft.education !== null} open={open("education")} onToggle={() => toggle("education")} onRemove={() => patch({ education: null })} onAdd={() => patch({ education: [newEducation()] })}>
          <Educations rows={draft.education ?? []} onChange={(education) => patch({ education: education.length > 0 ? education : null })} />
        </Block>

        <Block {...ai("extras")} title={f.extras.title} count={draft.extras?.items.length} present={draft.extras !== null} open={open("extras")} onToggle={() => toggle("extras")} onRemove={() => patch({ extras: null })} onAdd={() => patch({ extras: { label: "", items: [newRow()] } })}>
          <div className="flex flex-col gap-2">
            <Input label={f.extras.label} value={draft.extras?.label ?? ""} onChange={(label) => patch({ extras: { label, items: draft.extras?.items ?? [] } })} />
            <RowList rows={draft.extras?.items ?? []} onChange={(items) => patch({ extras: items.length > 0 ? { label: draft.extras?.label ?? "", items } : null })} label={f.extras.item} addLabel={f.extras.add} />
          </div>
        </Block>

        <ErrorNotice error={save.error} />

        <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line-strong bg-surface p-2.5 shadow-(--shadow)">
          <Badge variant={dirty ? "warning" : "success"}>{dirty ? f.unsaved : f.allSaved}</Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" type="button" disabled={!dirty || save.isPending} onClick={() => setDiscarding(true)}>
              {f.discard}
            </Button>
            <Button variant="primary" type="button" disabled={!dirty || nameMissing} loading={save.isPending} loadingLabel={f.saving} onClick={onSave}>
              {f.save}
            </Button>
          </div>
        </div>
      </div>

      {job.dialog}
      {confirming ? (
        <SectionAiDialog
          versionId={version.summary.id}
          section={confirming.key}
          title={confirming.generate ? f.ai.generateTitle(sectionTitle(confirming.key)) : f.ai.confirmTitle(sectionTitle(confirming.key))}
          message={
            (confirming.generate ? f.ai.generateMessage : f.ai.confirmMessage)(sectionTitle(confirming.key), aiTarget) +
            (confirming.key === "header" ? f.ai.headlineNote : "")
          }
          draft={() => toInput(draft)}
          onRun={() => {
            const key = confirming.key;
            setConfirming(null);
            void regenerate(key);
          }}
          onImported={(section) => {
            const key = confirming.key;
            setConfirming(null);
            setDraft((d) => applySection(d, key, section.document));
            notify(section.warnings.length > 0 ? f.ai.doneWarnings(section.warnings.length) : f.ai.done, "success");
          }}
          onClose={() => setConfirming(null)}
        />
      ) : null}

      {discarding ? (
        <ConfirmDialog
          title={f.discardTitle}
          message={f.discardMessage}
          confirmLabel={f.discard}
          cancelLabel={strings.common.cancel}
          onClose={() => setDiscarding(false)}
          onConfirm={() => {
            reset(version.document);
            save.reset();
            setDiscarding(false);
          }}
        />
      ) : null}
    </Panel>
  );
}
