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

export const notesSchema = z.object({
  story: text,
  voice: text,
  residence: text,
  workMode: text,
  availability: text,
  workAuthorization: text,
  salaryExpectation: text,
  avoid: text,
  preferredLanguage: text,
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
export const offerSummarySchema = z.object({
  id,
  title: text,
  company: maybe,
  createdAt: text,
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
  dates: text,
  lineBudget: z.number(),
  bullets: z.array(bulletSchema),
});

export const cvDocumentSchema = z.object({
  header: z.object({
    name: text,
    headline: text,
    contactLine1: z.array(text),
    contactLine2: z.array(text),
  }),
  summary: text,
  skills: z.array(z.object({ label: text, items: z.array(text) })),
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
});

export const versionSummarySchema = z.object({
  id,
  name: text,
  level: text,
  paper: text,
  language: text,
  mode: text,
  source: text,
  pages: z.number(),
  linesUsed: z.number(),
  lineBudget: z.number(),
  isPublic: z.boolean(),
  offerId: z.string().nullable(),
  createdAt: text,
  updatedAt: text,
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
});

export const aiApplySchema = z.object({
  version: versionSchema,
  accepted: z.number(),
  rejected: z.array(text),
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

// ── Publicación y vista pública ──
export const publicProfileSchema = z.object({
  name: text,
  headline: text,
  summary: text,
  location: maybe,
  availability: maybe,
  contact: z.object({ email: maybe, phone: maybe }),
  links: z.array(z.object({ kind: text, label: text, url: text })),
  facts: z.object({
    yearsOfExperience: z.number(),
    currentRole: maybe,
    currentCompany: maybe,
    currentSince: maybe,
    previousRole: maybe,
    previousCompany: maybe,
    previousYears: maybe,
  }),
  highlights: z.array(z.object({ figure: maybe, text })),
  experience: z.array(
    z.object({
      role: text,
      company: text,
      location: maybe,
      start: text,
      end: maybe,
      achievements: z.array(z.object({ figure: maybe, text })),
    }),
  ),
  projects: z.array(
    z.object({
      name: text,
      url: maybe,
      stack: maybe,
      summary: text,
      achievements: z.array(z.object({ figure: maybe, text })),
    }),
  ),
  skills: z.array(
    z.object({
      name: text,
      category: text,
      recency: z.enum(["current", "recent", "earlier"]),
      evidence: z.number(),
    }),
  ),
  education: z.array(
    z.object({
      degree: text,
      institution: text,
      startYear: z.number().nullable(),
      endYear: z.number().nullable(),
      note: maybe,
    }),
  ),
  certifications: z.array(
    z.object({
      name: text,
      issuer: maybe,
      year: z.number().nullable(),
      url: maybe,
    }),
  ),
  languages: z.array(
    z.object({ language: text, level: text, evidence: maybe }),
  ),
  hasCv: z.boolean(),
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
export type VersionSummary = z.infer<typeof versionSummarySchema>;
export type CvDocument = z.infer<typeof cvDocumentSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicationStatus = z.infer<typeof statusSchema>;
