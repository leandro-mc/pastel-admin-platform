import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { Blocker } from "react-router";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel, TextField } from "@/core/ui";
import { focusClass, inputClass, labelClass } from "@/core/ui/styles";
import { useSaveDocument } from "../api/hooks";
import type { CvVersion } from "../api/schemas";
import {
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
  type SkillGroupRow,
} from "../lib/cvDraft";
import { nestedCard } from "../lib/marker";
import type { useCvDraft } from "../lib/useCvDraft";
import { strings } from "../strings";
import { ErrorNotice, fieldError } from "./Form";

const f = strings.studio.editor.free;
const sectionTitles = { ...strings.public.sections, summary: strings.studio.editor.summary };

type Free = ReturnType<typeof useCvDraft>;

// ───────────────────────────── Piezas ─────────────────────────────

const smallButton = `inline-grid size-10 shrink-0 place-items-center rounded-lg text-fg-secondary hover:bg-accent-soft hover:text-fg disabled:pointer-events-none disabled:opacity-40 ${focusClass}`;

function Tool({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={smallButton}>
      {children}
    </button>
  );
}

/** Subir, bajar y quitar una fila; el nombre dice a qué fila se refiere (`Subir viñeta 2`). */
function RowTools({ what, index, count, onMove, onRemove }: { what: string; index: number; count: number; onMove: (delta: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Tool label={`${f.up} ${what}`} disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp aria-hidden="true" className="size-4" />
      </Tool>
      <Tool label={`${f.down} ${what}`} disabled={index === count - 1} onClick={() => onMove(1)}>
        <ArrowDown aria-hidden="true" className="size-4" />
      </Tool>
      <Tool label={`${f.remove} ${what}`} onClick={onRemove}>
        <Trash2 aria-hidden="true" className="size-4 text-danger" />
      </Tool>
    </div>
  );
}

/** Texto de varias líneas que crece con lo que se escribe, sin límite de caracteres. */
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} field-sizing-content py-2 leading-relaxed`}
      />
    </div>
  );
}

function Section({ title, present, onRemove, onAdd, children }: { title: string; present: boolean; onRemove?: () => void; onAdd?: () => void; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-4 rounded-xl border p-4 ${nestedCard}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={id} className="text-base font-semibold text-fg">
          {title}
        </h4>
        {present && onRemove ? (
          <Button variant="quietDanger" type="button" onClick={onRemove} aria-label={`${f.removeSection}: ${title}`}>
            <Trash2 aria-hidden="true" className="size-4" />
            {f.removeSection}
          </Button>
        ) : null}
      </header>
      {present ? (
        children
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">{f.removedSection}</p>
          <Button variant="tonal" type="button" onClick={onAdd} aria-label={`${f.addSection}: ${title}`}>
            <Plus aria-hidden="true" className="size-4" />
            {f.addSection}
          </Button>
        </div>
      )}
    </section>
  );
}

/** Lista de líneas de texto (contacto, enlaces, otros datos): un campo por fila, con orden y quitar. */
function RowList({ rows, onChange, label, addLabel }: { rows: Row[]; onChange: (rows: Row[]) => void; label: (n: number) => string; addLabel: string }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-end gap-1">
          <div className="min-w-0 flex-1">
            <TextField label={label(i + 1)} value={row.value} onChange={(e) => onChange(update(rows, row.key, { value: e.target.value }))} />
          </div>
          <RowTools what={label(i + 1).toLowerCase()} index={i} count={rows.length} onMove={(d) => onChange(move(rows, row.key, d))} onRemove={() => onChange(remove(rows, row.key))} />
        </div>
      ))}
      <div>
        <Button variant="secondary" type="button" onClick={() => onChange([...rows, newRow()])}>
          <Plus aria-hidden="true" className="size-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

/** Habilidades de una categoría: cada una es un campo corto que se edita o se quita; las nuevas se agregan al final. */
function Chips({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const s = f.skills;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-center rounded-xl border border-line-strong bg-surface focus-within:ring-3 focus-within:ring-accent-strong/45">
          <input
            aria-label={s.item(i + 1)}
            value={row.value}
            onChange={(e) => onChange(update(rows, row.key, { value: e.target.value }))}
            className="field-sizing-content min-h-10 max-w-64 min-w-20 rounded-l-xl bg-transparent px-3 text-base text-fg outline-none"
          />
          <button
            type="button"
            aria-label={`${f.remove} ${s.item(i + 1).toLowerCase()}`}
            onClick={() => onChange(remove(rows, row.key))}
            className="grid size-10 shrink-0 place-items-center rounded-r-xl text-muted hover:text-danger"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
      <Button variant="secondary" type="button" onClick={() => onChange([...rows, newRow()])}>
        <Plus aria-hidden="true" className="size-4" />
        {s.addItem}
      </Button>
    </div>
  );
}

// ───────────────────────────── Secciones ─────────────────────────────

function SkillGroups({ groups, onChange }: { groups: SkillGroupRow[]; onChange: (groups: SkillGroupRow[] | null) => void }) {
  const s = f.skills;
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, i) => (
        <div key={group.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-end gap-1">
            <div className="min-w-0 flex-1">
              <TextField label={s.label} hint={s.labelHint} value={group.label} onChange={(e) => onChange(update(groups, group.key, { label: e.target.value }))} />
            </div>
            <RowTools what={s.group(i + 1)} index={i} count={groups.length} onMove={(d) => onChange(move(groups, group.key, d))} onRemove={() => onChange(remove(groups, group.key))} />
          </div>
          <Chips rows={group.items} onChange={(items) => onChange(update(groups, group.key, { items }))} />
        </div>
      ))}
      <div>
        <Button variant="secondary" type="button" onClick={() => onChange([...groups, newSkillGroup()])}>
          <Plus aria-hidden="true" className="size-4" />
          {s.addGroup}
        </Button>
      </div>
    </div>
  );
}

function CompetencyGroups({ groups, onChange }: { groups: CompetencyGroupRow[]; onChange: (groups: CompetencyGroupRow[]) => void }) {
  const c = f.competencies;
  const setItems = (group: CompetencyGroupRow, items: CompetencyRow[]) => onChange(update(groups, group.key, { items }));
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, i) => (
        <div key={group.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-end gap-1">
            <div className="min-w-0 flex-1">
              <TextField label={c.label} value={group.label} onChange={(e) => onChange(update(groups, group.key, { label: e.target.value }))} />
            </div>
            <RowTools what={c.group(i + 1)} index={i} count={groups.length} onMove={(d) => onChange(move(groups, group.key, d))} onRemove={() => onChange(remove(groups, group.key))} />
          </div>
          {group.items.map((item, j) => (
            <div key={item.key} className="flex items-end gap-1">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <TextField label={c.name} value={item.name} onChange={(e) => setItems(group, update(group.items, item.key, { name: e.target.value }))} />
                <TextField label={c.note} value={item.note} onChange={(e) => setItems(group, update(group.items, item.key, { note: e.target.value }))} />
              </div>
              <RowTools what={c.item(j + 1)} index={j} count={group.items.length} onMove={(d) => setItems(group, move(group.items, item.key, d))} onRemove={() => setItems(group, remove(group.items, item.key))} />
            </div>
          ))}
          <div>
            <Button variant="secondary" type="button" onClick={() => setItems(group, [...group.items, newCompetency()])}>
              <Plus aria-hidden="true" className="size-4" />
              {c.addItem}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Bullets({ bullets, onChange }: { bullets: BulletRow[]; onChange: (bullets: BulletRow[]) => void }) {
  const e = f.entry;
  return (
    <div className="flex flex-col gap-3">
      {bullets.map((bullet, i) => (
        <div key={bullet.key} className="flex items-start gap-1">
          <Area label={e.bullet(i + 1)} value={bullet.text} onChange={(text) => onChange(update(bullets, bullet.key, { text }))} />
          <div className="pt-7">
            <RowTools what={e.bulletOf(i + 1)} index={i} count={bullets.length} onMove={(d) => onChange(move(bullets, bullet.key, d))} onRemove={() => onChange(remove(bullets, bullet.key))} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="secondary" type="button" onClick={() => onChange([...bullets, newBullet()])}>
          <Plus aria-hidden="true" className="size-4" />
          {e.addBullet}
        </Button>
      </div>
    </div>
  );
}

function Entries({ entries, project, onChange }: { entries: EntryRow[]; project: boolean; onChange: (entries: EntryRow[]) => void }) {
  const e = f.entry;
  const set = (entry: EntryRow, patch: Partial<EntryRow>) => onChange(update(entries, entry.key, patch));
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, i) => (
        <div key={entry.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-2 text-sm font-semibold text-fg">{entry.title || `${i + 1}`}</p>
            <RowTools what={e.entry(i + 1)} index={i} count={entries.length} onMove={(d) => onChange(move(entries, entry.key, d))} onRemove={() => onChange(remove(entries, entry.key))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={project ? e.projectTitle : e.title} value={entry.title} onChange={(ev) => set(entry, { title: ev.target.value })} />
            <TextField label={project ? e.projectSubtitle : e.subtitle} value={entry.subtitle} onChange={(ev) => set(entry, { subtitle: ev.target.value })} />
            <TextField label={e.dates} value={entry.dates} onChange={(ev) => set(entry, { dates: ev.target.value })} />
            {project ? null : <TextField label={e.location} value={entry.location} onChange={(ev) => set(entry, { location: ev.target.value })} />}
            {project ? null : (
              <div className="sm:col-span-2">
                <TextField label={e.context} value={entry.context} onChange={(ev) => set(entry, { context: ev.target.value })} />
              </div>
            )}
          </div>
          <Bullets bullets={entry.bullets} onChange={(bullets) => set(entry, { bullets })} />
        </div>
      ))}
      <div>
        <Button variant="secondary" type="button" onClick={() => onChange([...entries, newEntry()])}>
          <Plus aria-hidden="true" className="size-4" />
          {project ? e.addProject : e.addEntry}
        </Button>
      </div>
    </div>
  );
}

function Educations({ rows, onChange }: { rows: EducationRow[]; onChange: (rows: EducationRow[]) => void }) {
  const ed = f.education;
  const set = (row: EducationRow, patch: Partial<EducationRow>) => onChange(update(rows, row.key, patch));
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex justify-end">
            <RowTools what={ed.item(i + 1)} index={i} count={rows.length} onMove={(d) => onChange(move(rows, row.key, d))} onRemove={() => onChange(remove(rows, row.key))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={ed.degree} value={row.degree} onChange={(ev) => set(row, { degree: ev.target.value })} />
            <TextField label={ed.institution} value={row.institution} onChange={(ev) => set(row, { institution: ev.target.value })} />
            <TextField label={ed.dates} value={row.dates} onChange={(ev) => set(row, { dates: ev.target.value })} />
            <TextField label={ed.detail} value={row.detail} onChange={(ev) => set(row, { detail: ev.target.value })} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="secondary" type="button" onClick={() => onChange([...rows, newEducation()])}>
          <Plus aria-hidden="true" className="size-4" />
          {ed.add}
        </Button>
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

/**
 * Edición libre del CV: todo el documento precargado en campos (encabezado, perfil, habilidades por categoría, cargos y
 * proyectos con sus viñetas, educación y otros datos), con poder quitar secciones y viñetas, agregar y ordenar. Sin topes de
 * caracteres, de viñetas ni de páginas: el servidor solo limpia el texto (sin HTML) y el PDF y el Word salen tal cual con
 * el estilo de siempre. Nada se guarda hasta pulsar «Guardar cambios».
 */
export function CvFreeEditor({ version, free }: { version: CvVersion; free: Free }) {
  const { draft, setDraft, dirty, reset } = free;
  const save = useSaveDocument();
  const notify = useNotify();
  const [discarding, setDiscarding] = useState(false);
  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));
  const hasCompetencies = draft.competencies !== null || version.document.format === "competencies";
  const nameMissing = draft.name.trim() === "";

  const onSave = () =>
    save.mutate(
      { id: version.summary.id, vars: toInput(draft) },
      {
        onSuccess: (saved) => {
          reset(saved.document);
          notify(strings.common.saved, "success");
        },
      },
    );

  return (
    <Panel
      title={f.title}
      description={f.description}
      actions={<Badge variant={dirty ? "warning" : "success"}>{dirty ? f.unsaved : f.allSaved}</Badge>}
    >
      <div className="flex flex-col gap-5">
        <p className="rounded-xl border border-info/30 border-l-4 border-l-info bg-info-soft px-3 py-2.5 text-sm text-fg">{f.note}</p>

        <Section title={f.header.title} present>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={f.header.name}
              value={draft.name}
              error={nameMissing ? f.header.nameRequired : fieldError(save.error, "header.name")}
              onChange={(e) => patch({ name: e.target.value })}
            />
            <TextField label={f.header.headline} value={draft.headline} onChange={(e) => patch({ headline: e.target.value })} />
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold text-fg">{f.header.contact}</legend>
            <RowList rows={draft.contact1} onChange={(contact1) => patch({ contact1 })} label={f.header.contactItem} addLabel={f.header.addContact} />
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold text-fg">{f.header.links}</legend>
            <RowList rows={draft.contact2} onChange={(contact2) => patch({ contact2 })} label={f.header.linkItem} addLabel={f.header.addLink} />
          </fieldset>
        </Section>

        <Section title={sectionTitles.summary} present={draft.summary !== null} onRemove={() => patch({ summary: null })} onAdd={() => patch({ summary: "" })}>
          <Area label={f.summary.label} value={draft.summary ?? ""} onChange={(summary) => patch({ summary })} />
        </Section>

        <Section title={sectionTitles.tools} present={draft.skills !== null} onRemove={() => patch({ skills: null })} onAdd={() => patch({ skills: [newSkillGroup()] })}>
          <SkillGroups groups={draft.skills ?? []} onChange={(skills) => patch({ skills: skills && skills.length > 0 ? skills : null })} />
        </Section>

        {hasCompetencies ? (
          <Section
            title={strings.studio.editor.free.competencies.label}
            present={draft.competencies !== null}
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
          </Section>
        ) : null}

        <Section title={sectionTitles.path} present={draft.experience !== null} onRemove={() => patch({ experience: null })} onAdd={() => patch({ experience: [newEntry()] })}>
          <Entries entries={draft.experience ?? []} project={false} onChange={(experience) => patch({ experience: experience.length > 0 ? experience : null })} />
        </Section>

        <Section title={sectionTitles.projects} present={draft.projects !== null} onRemove={() => patch({ projects: null })} onAdd={() => patch({ projects: [newEntry()] })}>
          <Entries entries={draft.projects ?? []} project onChange={(projects) => patch({ projects: projects.length > 0 ? projects : null })} />
        </Section>

        <Section title={sectionTitles.education} present={draft.education !== null} onRemove={() => patch({ education: null })} onAdd={() => patch({ education: [newEducation()] })}>
          <Educations rows={draft.education ?? []} onChange={(education) => patch({ education: education.length > 0 ? education : null })} />
        </Section>

        <Section
          title={f.extras.title}
          present={draft.extras !== null}
          onRemove={() => patch({ extras: null })}
          onAdd={() => patch({ extras: { label: "", items: [newRow()] } })}
        >
          <TextField
            label={f.extras.label}
            hint={f.extras.labelHint}
            value={draft.extras?.label ?? ""}
            onChange={(e) => patch({ extras: { label: e.target.value, items: draft.extras?.items ?? [] } })}
          />
          <RowList
            rows={draft.extras?.items ?? []}
            onChange={(items) => patch({ extras: items.length > 0 ? { label: draft.extras?.label ?? "", items } : null })}
            label={f.extras.item}
            addLabel={f.extras.add}
          />
        </Section>

        <ErrorNotice error={save.error} />

        <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line-strong bg-surface p-3 shadow-[var(--shadow)]">
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
