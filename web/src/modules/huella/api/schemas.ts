import { z } from "zod";

/** Esquemas de la API de Huella (`/api/huella`). Toda respuesta se valida aquí, en el borde. */

const id = z.string();
const text = z.string();
const maybe = z.string().nullable();

export const linkSchema = z.object({
  id,
  kind: text,
  label: text,
  url: text,
  isPublic: z.boolean(),
  /** Icono elegido; `null` = el que corresponde al tipo. */
  icon: maybe,
});

export const profileSchema = z.object({
  displayName: text,
  headline: text,
  summary: text,
  location: maybe,
  availability: maybe,
  contactEmail: maybe,
  contactPhone: maybe,
  showContactEmail: z.boolean(),
  showContactPhone: z.boolean(),
  showLocation: z.boolean(),
  showAvailability: z.boolean(),
  links: z.array(linkSchema),
  isPublished: z.boolean(),
  updatedAt: text,
});

export const achievementSchema = z.object({
  id,
  shortText: text,
  longText: text,
  rawText: maybe,
  resultValue: maybe,
  resultUnit: maybe,
  resultBaseline: maybe,
  impactType: text,
  strength: z.number(),
  verified: z.boolean(),
  source: text,
  visibility: text,
  skillIds: z.array(id),
});

export const experienceSchema = z.object({
  id,
  role: text,
  marketRole: maybe,
  company: text,
  location: maybe,
  employmentType: maybe,
  workMode: maybe,
  start: text,
  end: maybe,
  narrative: text,
  companyContext: maybe,
  teamSize: z.number().nullable(),
  isVisible: z.boolean(),
  achievements: z.array(achievementSchema),
});

export const projectSchema = z.object({
  id,
  name: text,
  url: maybe,
  summary: text,
  approach: text,
  stack: maybe,
  startYear: z.number().nullable(),
  endYear: z.number().nullable(),
  isVisible: z.boolean(),
  achievements: z.array(achievementSchema),
});

export const skillSchema = z.object({
  id,
  name: text,
  aliases: maybe,
  category: text,
  firstUsedYear: z.number().nullable(),
  lastUsedYear: z.number().nullable(),
  why: text,
  isVisible: z.boolean(),
  evidence: z.number(),
});

export const educationSchema = z.object({
  id,
  degree: text,
  institution: text,
  startYear: z.number().nullable(),
  endYear: z.number().nullable(),
  note: maybe,
  isVisible: z.boolean(),
});

export const certificationSchema = z.object({
  id,
  name: text,
  issuer: maybe,
  issuedYear: z.number().nullable(),
  expiresYear: z.number().nullable(),
  credentialUrl: maybe,
  isVisible: z.boolean(),
});

export const languageSchema = z.object({
  id,
  language: text,
  level: text,
  evidence: maybe,
  isVisible: z.boolean(),
});

export const competencySchema = z.object({
  id,
  name: text,
  /** `personal` (blanda) o `technical`. */
  kind: text,
  description: text,
  evidence: text,
  /** Va siempre en el CV de competencias. */
  alwaysInclude: z.boolean().default(false),
  isVisible: z.boolean(),
});

export const notesSchema = z.object({
  story: text,
  voice: text,
  residence: text,
  workMode: text,
  availability: text,
  workAuthorization: text,
  salaryExpectation: text,
  avoid: text,
  preferredPaper: text,
  extraBannedPhrases: text,
});

export const bankSchema = z.object({
  notes: notesSchema,
  experiences: z.array(experienceSchema),
  projects: z.array(projectSchema),
  skills: z.array(skillSchema),
  educations: z.array(educationSchema),
  certifications: z.array(certificationSchema),
  languages: z.array(languageSchema),
  competencies: z.array(competencySchema),
});

export const proposalSchema = z.object({
  shortText: text,
  longText: text,
  rawText: text,
  resultValue: maybe,
  resultUnit: maybe,
  impactType: text,
  strength: z.number(),
  needsFigure: z.boolean(),
  skillIds: z.array(id),
  unknownSkills: z.array(text),
});

export const derivationSchema = z.object({
  source: text,
  proposals: z.array(proposalSchema),
  rejected: z.array(text),
});

export const aiPackageSchema = z.object({
  task: text,
  prompt: text,
  schema: text,
});

// ── Estudio ──
export const offerStatusValues = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
  "no_response",
  "discarded",
] as const;
export type OfferStatus = (typeof offerStatusValues)[number];

export const offerSummarySchema = z.object({
  id,
  title: text,
  company: maybe,
  sourceUrl: maybe,
  createdAt: text,
  status: z.enum(offerStatusValues),
  statusUpdatedAt: maybe,
  appliedAt: maybe,
  /** Día de seguimiento (`AAAA-MM-DD`). */
  followUpAt: maybe,
  notes: text,
  /** Requisitos obligatorios con respaldo en el banco de hoy. */
  coverage: z.object({ covered: z.number(), total: z.number() }),
});

export const evidenceSchema = z.object({
  term: text,
  weight: z.number(),
  status: z.enum(["ok", "partial", "gap"]),
  count: z.number(),
  note: maybe,
});

export const hardFilterSchema = z.object({
  requirement: text,
  mine: text,
  status: text,
  advice: text,
});

export const offerSchema = z.object({
  id,
  title: text,
  company: maybe,
  sourceUrl: maybe,
  rawText: text,
  analysis: z.object({
    title: text,
    terms: z.array(z.object({ term: text, weight: z.number() })),
  }),
  evidence: z.array(evidenceSchema),
  hardFilters: z.array(hardFilterSchema),
  createdAt: text,
});

export const bulletSchema = z.object({
  text,
  sourceIds: z.array(id),
  shortText: maybe,
  score: z.number(),
});

export const entrySchema = z.object({
  title: text,
  subtitle: text,
  location: maybe,
  /** Qué fue (práctica, proyecto académico…); va junto a la empresa. */
  context: maybe.optional(),
  dates: text,
  lineBudget: z.number(),
  bullets: z.array(bulletSchema),
});

export const cvDocumentSchema = z.object({
  language: maybe.optional(),
  /** `standard` o `competencies`; los CV anteriores no lo traen. */
  format: z.string().optional(),
  header: z.object({
    name: text,
    headline: text,
    contactLine1: z.array(text),
    contactLine2: z.array(text),
  }),
  summary: text,
  skills: z.array(z.object({ label: text, items: z.array(text) })),
  competencies: z
    .array(
      z.object({
        kind: text,
        label: text,
        items: z.array(z.object({ id, name: text, note: maybe.optional() })),
      }),
    )
    .default([]),
  experience: z.array(entrySchema),
  projects: z.array(entrySchema),
  education: z.array(
    z.object({
      degree: text,
      institution: text,
      dates: text,
      detail: maybe,
    }),
  ),
  extras: z.array(text),
  extrasLabel: maybe.optional(),
});

export const versionSummarySchema = z.object({
  id,
  name: text,
  level: text,
  paper: text,
  language: text,
  format: z.string().default("standard"),
  mode: text,
  source: text,
  pages: z.number(),
  linesUsed: z.number(),
  lineBudget: z.number(),
  isPublic: z.boolean(),
  /** Cuándo se envió; `null` = sin enviar. */
  sentAt: maybe,
  offerId: z.string().nullable(),
  createdAt: text,
  updatedAt: text,
});

export const letterSummarySchema = z.object({
  id,
  name: text,
  language: text,
  tone: text,
  source: text,
  sentAt: maybe,
  offerId: z.string().nullable(),
  createdAt: text,
  updatedAt: text,
});

export const letterDocSchema = z.object({
  language: text,
  signature: text,
  /** País o ciudad: va bajo el nombre, arriba. */
  location: text,
  /** Correo y teléfono: van al pie, bajo el nombre de la firma. */
  contact: z.array(text),
  /** Fecha de la carta (`AAAA-MM-DD`). */
  date: text,
  recipient: z.array(text),
  /** `times` (Times New Roman) o `arial`. */
  font: text,
  subject: text,
  greeting: text,
  paragraphs: z.array(text),
  closing: text,
});

export const letterSchema = z.object({
  summary: letterSummarySchema,
  document: letterDocSchema,
  pdfAvailable: z.boolean(),
  /** Cupo de una página: renglones usados y disponibles, y caracteres de cuerpo (usados y máximos con este encabezado). */
  fit: z.object({
    used: z.number(),
    capacity: z.number(),
    bodyChars: z.number(),
    bodyMax: z.number(),
  }),
});

/** Correo de postulación: el CV siempre va adjunto; `body` es el cuerpo completo en texto plano (saludo, párrafos, despedida y firma). */
export const emailSummarySchema = z.object({
  id,
  name: text,
  language: text,
  tone: text,
  source: text,
  sentAt: maybe,
  offerId: z.string().nullable(),
  createdAt: text,
  updatedAt: text,
});

export const emailDocSchema = z.object({
  language: text,
  /** Correo al que se postula, si la oferta lo trae; puede quedar vacío. */
  to: text,
  subject: text,
  greeting: text,
  paragraphs: z.array(text),
  closing: text,
  signature: text,
  contact: z.array(text),
});

export const emailSchema = z.object({
  summary: emailSummarySchema,
  document: emailDocSchema,
  body: text,
});

/** Una sección del CV regenerada con IA (no guardada): un documento con solo esa parte llena y lo que se descartó. */
export const cvSectionSchema = z.object({
  section: text,
  document: cvDocumentSchema,
  warnings: z.array(text),
});

export const versionSchema = z.object({
  summary: versionSummarySchema,
  document: cvDocumentSchema,
  report: z.object({
    checks: z.array(
      z.object({ label: text, passed: z.boolean(), note: maybe }),
    ),
    fitLog: z.array(text),
    evidence: z.array(evidenceSchema),
    hardFilters: z.array(hardFilterSchema),
  }),
  atsText: text,
  pdfAvailable: z.boolean(),
  /** La otra versión (español o inglés) generada junta con esta; `null` si no tiene pareja. */
  pair: z
    .object({
      twinId: id,
      twinLanguage: text,
      twinName: text,
      /** Esta versión no refleja aún cambios hechos en la otra. */
      pending: z.boolean(),
      /** La otra versión no refleja aún cambios hechos en esta. */
      twinPending: z.boolean(),
    })
    .nullable()
    .default(null),
});

// ── Tareas de IA (CV, perfil público, traducción) ──
export const aiTaskPackageSchema = z.object({
  kind: text,
  title: text,
  fileName: text,
  prompt: text,
  schema: text,
});

export const aiTaskOutcomeSchema = z.object({
  kind: text,
  accepted: z.number(),
  rejected: z.array(text),
  versionIds: z.array(id),
  sections: z.array(text),
});

// ── IA automática ──
export const aiProviderSchema = z.object({
  id: text,
  label: text,
  defaultModel: text,
  configured: z.boolean(),
  readable: z.boolean(),
  isActive: z.boolean(),
  model: maybe,
  keyHint: maybe,
  updatedAt: maybe,
});

export const aiSettingsSchema = z.object({
  activeProvider: maybe,
  providers: z.array(aiProviderSchema),
});

export const aiModelSchema = z.object({ id: text, label: text });

// ── Contenido del perfil público (español editable, inglés sincronizado) ──
const nullableNumber = z.number().nullable();

export const contentDocSchema = z.object({
  headline: text,
  summary: text,
  highlights: z.array(z.object({ figure: maybe, text })),
  experience: z.array(
    z.object({
      sourceId: id,
      role: text,
      company: text,
      location: maybe,
      start: text,
      end: maybe,
      bullets: z.array(text),
    }),
  ),
  projects: z.array(
    z.object({
      sourceId: id,
      name: text,
      url: maybe,
      stack: maybe,
      summary: text,
    }),
  ),
  skills: z.array(z.object({ label: text, items: z.array(text) })),
  education: z.array(
    z.object({
      sourceId: id,
      degree: text,
      institution: text,
      startYear: nullableNumber,
      endYear: nullableNumber,
      note: maybe,
    }),
  ),
  certifications: z.array(
    z.object({
      sourceId: id,
      name: text,
      issuer: maybe,
      year: nullableNumber,
      url: maybe,
    }),
  ),
  languages: z.array(z.object({ sourceId: id, language: text, level: text })),
});

export const contentViewSchema = z.object({
  es: contentDocSchema,
  en: contentDocSchema,
  sections: z.array(
    z.object({
      id: text,
      status: z.enum(["empty", "ready", "stale"]),
      updatedAt: maybe,
    }),
  ),
});

// ── Publicación y vista pública ──
const ledgerLine = z.object({ figure: maybe, text });

export const publicLocalizedSchema = z.object({
  headline: text,
  summary: text,
  facts: z.object({
    yearsOfExperience: z.number(),
    currentRole: maybe,
    currentCompany: maybe,
    currentSince: maybe,
    previousRole: maybe,
    previousCompany: maybe,
    previousYears: maybe,
  }),
  highlights: z.array(ledgerLine),
  experience: z.array(
    z.object({
      role: text,
      company: text,
      location: maybe,
      start: text,
      end: maybe,
      achievements: z.array(ledgerLine),
    }),
  ),
  projects: z.array(
    z.object({ name: text, url: maybe, stack: maybe, summary: text }),
  ),
  skills: z.array(z.object({ label: text, items: z.array(text) })),
  education: z.array(
    z.object({
      degree: text,
      institution: text,
      startYear: nullableNumber,
      endYear: nullableNumber,
      note: maybe,
    }),
  ),
  certifications: z.array(
    z.object({
      name: text,
      issuer: maybe,
      year: nullableNumber,
      url: maybe,
    }),
  ),
  languages: z.array(z.object({ language: text, level: text })),
});

export const publicProfileSchema = z.object({
  name: text,
  location: maybe,
  availability: maybe,
  contact: z.object({ email: maybe, phone: maybe }),
  links: z.array(
    z.object({ kind: text, label: text, url: text, icon: maybe.optional() }),
  ),
  hasCv: z.boolean(),
  es: publicLocalizedSchema,
  en: publicLocalizedSchema,
});

export const statusSchema = z.object({
  isPublished: z.boolean(),
  publishedVersion: z.number().nullable(),
  publishedAt: maybe,
  hasLink: z.boolean(),
  linkCreatedAt: maybe,
  hasUnpublishedChanges: z.boolean(),
  canPublish: z.boolean(),
  blockedReason: maybe,
  /** Token del enlace público; solo lo recibe la persona dueña autenticada. */
  token: maybe,
});

export const previewSchema = z.object({
  profile: publicProfileSchema,
  seed: text,
  hasCv: z.boolean(),
});

export const publicationResultSchema = z.object({
  status: statusSchema,
  token: maybe,
});

export const publicViewSchema = z.object({
  profile: publicProfileSchema,
  seed: text,
  version: z.number(),
  publishedAt: text,
});

export type Profile = z.infer<typeof profileSchema>;
export type Bank = z.infer<typeof bankSchema>;
export type Notes = z.infer<typeof notesSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type LanguageSkill = z.infer<typeof languageSchema>;
export type Competency = z.infer<typeof competencySchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Derivation = z.infer<typeof derivationSchema>;
export type AiPackage = z.infer<typeof aiPackageSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiModel = z.infer<typeof aiModelSchema>;
export type OfferSummary = z.infer<typeof offerSummarySchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type CvVersion = z.infer<typeof versionSchema>;
export type LetterSummary = z.infer<typeof letterSummarySchema>;
export type Letter = z.infer<typeof letterSchema>;
export type EmailSummary = z.infer<typeof emailSummarySchema>;
export type Email = z.infer<typeof emailSchema>;
export type VersionSummary = z.infer<typeof versionSummarySchema>;
export type CvDocument = z.infer<typeof cvDocumentSchema>;
export type CvSection = z.infer<typeof cvSectionSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicLocalized = z.infer<typeof publicLocalizedSchema>;
export type ContentDoc = z.infer<typeof contentDocSchema>;
export type ContentView = z.infer<typeof contentViewSchema>;
export type AiTaskPackage = z.infer<typeof aiTaskPackageSchema>;
export type AiTaskOutcome = z.infer<typeof aiTaskOutcomeSchema>;
export type PublicationStatus = z.infer<typeof statusSchema>;

// ───────── Respaldo del banco ─────────
export const BACKUP_FORMAT = "pastel-huella-bank";
/** La versión del documento que esta pantalla entiende (la misma que escribe el servidor). */
export const BACKUP_VERSION = 1;

const backupParent = z.looseObject({ achievements: z.array(z.unknown()).default([]) });

/**
 * Lo mínimo que la pantalla necesita del archivo para mostrar qué trae antes de importarlo. El servidor valida todo lo
 * demás; al importar se envía el documento tal cual se leyó (no esta versión recortada).
 */
export const bankBackupSchema = z.looseObject({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.string().optional(),
  profile: z.unknown().optional(),
  bank: z.looseObject({
    experiences: z.array(backupParent).default([]),
    projects: z.array(backupParent).default([]),
    skills: z.array(z.unknown()).default([]),
    competencies: z.array(z.unknown()).default([]),
    educations: z.array(z.unknown()).default([]),
    certifications: z.array(z.unknown()).default([]),
    languages: z.array(z.unknown()).default([]),
  }),
});

export const bankImportResultSchema = z.object({
  profileUpdated: z.boolean(),
  experiences: z.number(),
  projects: z.number(),
  achievements: z.number(),
  skills: z.number(),
  competencies: z.number(),
  educations: z.number(),
  certifications: z.number(),
  languages: z.number(),
});

export type BankBackup = z.infer<typeof bankBackupSchema>;
export type BankImportResult = z.infer<typeof bankImportResultSchema>;
