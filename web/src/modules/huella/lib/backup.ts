import { BACKUP_VERSION, bankBackupSchema, type Bank } from "../api/schemas";

/** nginx limita el cuerpo de una petición a 1 MB: un archivo más grande no llegaría al servidor. */
export const MAX_BACKUP_BYTES = 1_000_000;

export type BackupCounts = {
  experiences: number;
  projects: number;
  achievements: number;
  skills: number;
  competencies: number;
  educations: number;
  certifications: number;
  languages: number;
};

export type ReadBackup =
  | { ok: true; raw: unknown; exportedAt: string | null; hasProfile: boolean; counts: BackupCounts }
  | { ok: false; reason: "too_big" | "not_json" | "not_backup" | "too_new" };

/** Cuánto hay en el banco que ya está en el servidor (para compararlo con lo que trae el archivo). */
export function countsOfBank(bank: Bank): BackupCounts {
  return {
    experiences: bank.experiences.length,
    projects: bank.projects.length,
    achievements:
      bank.experiences.reduce((n, e) => n + e.achievements.length, 0) +
      bank.projects.reduce((n, p) => n + p.achievements.length, 0),
    skills: bank.skills.length,
    competencies: bank.competencies.length,
    educations: bank.educations.length,
    certifications: bank.certifications.length,
    languages: bank.languages.length,
  };
}

/**
 * Lee un respaldo descargado de Huella: comprueba tamaño, JSON y formato y cuenta qué trae. No valida el contenido (eso lo
 * hace el servidor al importar, todo o nada); conserva el documento original para enviarlo sin cambios.
 */
export function readBackup(text: string, bytes: number): ReadBackup {
  if (bytes > MAX_BACKUP_BYTES) return { ok: false, reason: "too_big" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not_json" };
  }
  const parsed = bankBackupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "not_backup" };
  if (parsed.data.version > BACKUP_VERSION) return { ok: false, reason: "too_new" };
  const { bank } = parsed.data;
  return {
    ok: true,
    raw,
    exportedAt: parsed.data.exportedAt ?? null,
    hasProfile: parsed.data.profile != null,
    counts: {
      experiences: bank.experiences.length,
      projects: bank.projects.length,
      achievements:
        bank.experiences.reduce((n, e) => n + e.achievements.length, 0) +
        bank.projects.reduce((n, p) => n + p.achievements.length, 0),
      skills: bank.skills.length,
      competencies: bank.competencies.length,
      educations: bank.educations.length,
      certifications: bank.certifications.length,
      languages: bank.languages.length,
    },
  };
}

const SECTIONS: Record<string, string> = {
  profile: "Perfil",
  notes: "Notas",
  experiences: "Experiencias",
  projects: "Proyectos",
  skills: "Habilidades",
  competencies: "Competencias",
  educations: "Educación",
  certifications: "Certificaciones",
  languages: "Idiomas",
};

/**
 * Lugar legible de un error del servidor: `experiences.items[2].start` → «Experiencias · n.º 3 · start». Cada `[n]` es la
 * posición (desde 0) en la lista, y la pantalla la cuenta desde 1 como la persona.
 */
export function describeBackupPath(path: string): string {
  const [section = "", ...rest] = path.split(".");
  const parts = [SECTIONS[section] ?? section];
  for (const piece of rest) {
    const match = /^(\w+)\[(\d+)\]$/.exec(piece);
    if (!match) {
      parts.push(piece);
    } else if (match[1] === "achievements") {
      parts.push(`logro n.º ${Number(match[2]) + 1}`);
    } else if (match[1] !== "items") {
      parts.push(`${match[1]} n.º ${Number(match[2]) + 1}`);
    } else {
      parts.push(`n.º ${Number(match[2]) + 1}`);
    }
  }
  return parts.join(" · ");
}
