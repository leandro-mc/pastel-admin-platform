import type { CvDocument } from "../api/schemas";

/*
 * Borrador de la edición libre del CV. El documento del servidor es un árbol de listas y textos; para editarlo cada fila
 * lleva una llave estable (así quitar o mover una fila no mezcla los campos de las demás). Una sección en `null` está
 * quitada: no sale en el CV. Aquí no hay topes de caracteres ni de viñetas: eso lo decide la persona.
 */

let sequence = 0;
const nextKey = () => `r${(sequence += 1)}`;

export type Row = { key: string; value: string };
export type BulletRow = { key: string; text: string; sourceIds: string[] };
export type EntryRow = {
  key: string;
  title: string;
  subtitle: string;
  location: string;
  context: string;
  dates: string;
  bullets: BulletRow[];
};
export type SkillGroupRow = { key: string; label: string; items: Row[]; /** Categoría de competencias personales (CV combinado). */ soft: boolean };
export type CompetencyRow = { key: string; id: string | null; name: string; note: string };
export type CompetencyGroupRow = { key: string; kind: string; label: string; items: CompetencyRow[] };
export type EducationRow = { key: string; degree: string; institution: string; dates: string; detail: string };

export type Draft = {
  name: string;
  headline: string;
  contact1: Row[];
  contact2: Row[];
  summary: string | null;
  skills: SkillGroupRow[] | null;
  competencies: CompetencyGroupRow[] | null;
  experience: EntryRow[] | null;
  projects: EntryRow[] | null;
  education: EducationRow[] | null;
  extras: { label: string; items: Row[] } | null;
};

/** Las secciones de la edición libre que se pueden regenerar con IA (`header` regenera solo el titular). */
export type SectionKey = "header" | "summary" | "skills" | "competencies" | "experience" | "projects" | "education" | "extras";

/** Pone en el borrador la sección que regeneró la IA (el servidor devuelve un documento con solo esa parte llena). */
export function applySection(draft: Draft, key: SectionKey, doc: CvDocument): Draft {
  const fresh = toDraft(doc);
  switch (key) {
    case "header":
      return { ...draft, headline: fresh.headline };
    case "summary":
      return { ...draft, summary: fresh.summary ?? "" };
    case "skills":
      return { ...draft, skills: fresh.skills };
    case "competencies":
      return { ...draft, competencies: fresh.competencies };
    case "experience":
      return { ...draft, experience: fresh.experience };
    case "projects":
      return { ...draft, projects: fresh.projects };
    case "education":
      return { ...draft, education: fresh.education };
    case "extras":
      return { ...draft, extras: fresh.extras };
  }
}

// ── Filas nuevas ──
export const newRow = (value = ""): Row => ({ key: nextKey(), value });
export const newBullet = (text = ""): BulletRow => ({ key: nextKey(), text, sourceIds: [] });
export const newEntry = (): EntryRow => ({
  key: nextKey(),
  title: "",
  subtitle: "",
  location: "",
  context: "",
  dates: "",
  bullets: [newBullet()],
});
export const newSkillGroup = (): SkillGroupRow => ({ key: nextKey(), label: "", items: [newRow()], soft: false });
export const newCompetency = (): CompetencyRow => ({ key: nextKey(), id: null, name: "", note: "" });
export const newEducation = (): EducationRow => ({ key: nextKey(), degree: "", institution: "", dates: "", detail: "" });

const entriesOf = (list: CvDocument["experience"]): EntryRow[] | null =>
  list.length === 0
    ? null
    : list.map((e) => ({
        key: nextKey(),
        title: e.title,
        subtitle: e.subtitle,
        location: e.location ?? "",
        context: e.context ?? "",
        dates: e.dates,
        bullets: e.bullets.map((b) => ({ key: nextKey(), text: b.text, sourceIds: [...b.sourceIds] })),
      }));

/** El documento del servidor como borrador editable. */
export function toDraft(doc: CvDocument): Draft {
  return {
    name: doc.header.name,
    headline: doc.header.headline,
    contact1: doc.header.contactLine1.map((value) => newRow(value)),
    contact2: doc.header.contactLine2.map((value) => newRow(value)),
    summary: doc.summary === "" ? null : doc.summary,
    skills:
      doc.skills.length === 0
        ? null
        : doc.skills.map((g) => ({ key: nextKey(), label: g.label, items: g.items.map((value) => newRow(value)), soft: g.soft === true })),
    competencies:
      doc.competencies.length === 0
        ? null
        : doc.competencies.map((g) => ({
            key: nextKey(),
            kind: g.kind,
            label: g.label,
            items: g.items.map((c) => ({ key: nextKey(), id: c.id, name: c.name, note: c.note ?? "" })),
          })),
    experience: entriesOf(doc.experience),
    projects: entriesOf(doc.projects),
    education:
      doc.education.length === 0
        ? null
        : doc.education.map((e) => ({
            key: nextKey(),
            degree: e.degree,
            institution: e.institution,
            dates: e.dates,
            detail: e.detail ?? "",
          })),
    extras: doc.extras.length === 0 ? null : { label: doc.extrasLabel ?? "", items: doc.extras.map((value) => newRow(value)) },
  };
}

const entryInput = (list: EntryRow[] | null) =>
  (list ?? []).map((e) => ({
    title: e.title,
    subtitle: e.subtitle,
    location: e.location,
    context: e.context,
    dates: e.dates,
    bullets: e.bullets.map((b) => ({ text: b.text, sourceIds: b.sourceIds })),
  }));

/**
 * Lo que recibe `PUT …/document`. Una sección quitada va vacía. El servidor descarta las filas sin nada escrito y limpia el
 * texto (sin HTML); aquí se envía tal cual está en pantalla.
 */
export function toInput(draft: Draft) {
  return {
    header: {
      name: draft.name,
      headline: draft.headline,
      contactLine1: draft.contact1.map((r) => r.value),
      contactLine2: draft.contact2.map((r) => r.value),
    },
    summary: draft.summary ?? "",
    skills: (draft.skills ?? []).map((g) => ({ label: g.label, items: g.items.map((r) => r.value), soft: g.soft })),
    competencies: (draft.competencies ?? []).map((g) => ({
      kind: g.kind,
      label: g.label,
      items: g.items.map((c) => ({ id: c.id, name: c.name, note: c.note })),
    })),
    experience: entryInput(draft.experience),
    projects: entryInput(draft.projects),
    education: (draft.education ?? []).map((e) => ({
      degree: e.degree,
      institution: e.institution,
      dates: e.dates,
      detail: e.detail,
    })),
    extras: (draft.extras?.items ?? []).map((r) => r.value),
    extrasLabel: draft.extras && draft.extras.label.trim() !== "" ? draft.extras.label : null,
  };
}

/** Huella del contenido del borrador: dos borradores con la misma huella dicen lo mismo. */
export const fingerprintOf = (draft: Draft) => JSON.stringify(toInput(draft));

// ── Operaciones sobre listas (inmutables) ──
export function update<T extends { key: string }>(list: readonly T[], key: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

export function remove<T extends { key: string }>(list: readonly T[], key: string): T[] {
  return list.filter((item) => item.key !== key);
}

/** Mueve la fila una posición hacia arriba (`-1`) o hacia abajo (`1`); en el borde no hace nada. */
export function move<T extends { key: string }>(list: readonly T[], key: string, delta: -1 | 1): T[] {
  const from = list.findIndex((item) => item.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return [...list];
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}
