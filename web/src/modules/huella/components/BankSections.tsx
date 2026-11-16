import { Panel, SelectField, TextField } from "@/core/ui";
import { useSaveNotes, useSaveSection } from "../api/hooks";
import type {
  Bank,
  Certification,
  Competency,
  Education,
  Experience,
  LanguageSkill,
  Notes,
  Project,
  Skill,
} from "../api/schemas";
import { strings } from "../strings";
import { AchievementsEditor } from "./AchievementsEditor";
import { ErrorNotice, TextAreaField, fieldError } from "./Form";
import { SaveStatus } from "./SaveStatus";
import { SectionEditor, newKey, type Row } from "./SectionEditor";
import { useAutosaveValue } from "./useAutosaveValue";

const t = strings.bank;
const optional = (value: string) => (value.trim() === "" ? null : value.trim());
const toInt = (value: string) =>
  value.trim() === "" ? null : Number.parseInt(value, 10);
const str = (value: string | number | null) =>
  value === null ? "" : String(value);
const filled = (value: string) => value.trim() !== "";
const options = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

// ───────────────────────── Notas privadas ─────────────────────────
export function NotesSection({ notes }: { notes: Notes }) {
  const save = useSaveNotes();
  const { value: draft, set, state, error } = useAutosaveValue<Notes>(
    notes,
    (value) => save.mutateAsync(value),
  );
  const err = (field: string) => fieldError(error, field);
  return (
    <Panel
      title={t.notes.title}
      description={t.notes.description}
      actions={<SaveStatus state={state} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextAreaField
            label={t.notes.story}
            rows={6}
            value={draft.story}
            error={err("story")}
            onChange={(e) => set({ story: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            label={t.notes.voice}
            rows={3}
            value={draft.voice}
            error={err("voice")}
            onChange={(e) => set({ voice: e.target.value })}
          />
        </div>
        <TextField
          label={t.notes.residence}
          value={draft.residence}
          error={err("residence")}
          onChange={(e) => set({ residence: e.target.value })}
        />
        <TextField
          label={t.notes.workMode}
          value={draft.workMode}
          error={err("workMode")}
          onChange={(e) => set({ workMode: e.target.value })}
        />
        <TextField
          label={t.notes.availability}
          value={draft.availability}
          error={err("availability")}
          onChange={(e) => set({ availability: e.target.value })}
        />
        <TextField
          label={t.notes.workAuthorization}
          value={draft.workAuthorization}
          error={err("workAuthorization")}
          onChange={(e) => set({ workAuthorization: e.target.value })}
        />
        <TextField
          label={t.notes.salaryExpectation}
          value={draft.salaryExpectation}
          error={err("salaryExpectation")}
          onChange={(e) => set({ salaryExpectation: e.target.value })}
        />
        <TextField
          label={t.notes.avoid}
          value={draft.avoid}
          error={err("avoid")}
          onChange={(e) => set({ avoid: e.target.value })}
        />
        <SelectField
          label={t.notes.paper}
          options={options(t.papers)}
          value={draft.preferredPaper}
          onChange={(e) => set({ preferredPaper: e.target.value })}
        />
        <div className="sm:col-span-2">
          <TextField
            label={t.notes.banned}
            value={draft.extraBannedPhrases}
            error={err("extraBannedPhrases")}
            onChange={(e) => set({ extraBannedPhrases: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-4">
        <ErrorNotice error={error} />
      </div>
    </Panel>
  );
}

// ───────────────────────── Experiencia ─────────────────────────
type ExperienceRow = Row & {
  role: string;
  marketRole: string;
  company: string;
  location: string;
  employmentType: string;
  workMode: string;
  start: string;
  end: string;
  narrative: string;
  companyContext: string;
  teamSize: string;
  isVisible: boolean;
};

export function ExperienceSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("experiences");
  return (
    <SectionEditor<Experience, ExperienceRow>
      title={t.experience.title}
      empty={t.experience.empty}
      addLabel={t.experience.add}
      searchLabel={t.experience.search}
      removeWhat={strings.confirm.what.experience}
      readyHint={t.experience.readyHint}
      source={bank.experiences}
      toRow={(e) => ({
        key: e.id,
        id: e.id,
        role: e.role,
        marketRole: str(e.marketRole),
        company: e.company,
        location: str(e.location),
        employmentType: str(e.employmentType),
        workMode: str(e.workMode),
        start: e.start,
        end: str(e.end),
        narrative: e.narrative,
        companyContext: str(e.companyContext),
        teamSize: str(e.teamSize),
        isVisible: e.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        role: "",
        marketRole: "",
        company: "",
        location: "",
        employmentType: "",
        workMode: "",
        start: "",
        end: "",
        narrative: "",
        companyContext: "",
        teamSize: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        role: r.role,
        marketRole: optional(r.marketRole),
        company: r.company,
        location: optional(r.location),
        employmentType: optional(r.employmentType),
        workMode: optional(r.workMode),
        start: r.start,
        end: optional(r.end),
        narrative: r.narrative,
        companyContext: optional(r.companyContext),
        teamSize: toInt(r.teamSize),
        isVisible: r.isVisible,
      })}
      isReady={(r) =>
        filled(r.role) && filled(r.company) && /^\d{4}-\d{2}$/.test(r.start)
      }
      save={(items) => save.mutateAsync(items).then((b) => b.experiences)}
      heading={(r) => [r.role, r.company].filter(Boolean).join(" - ")}
      searchText={(r) => `${r.marketRole} ${r.location} ${r.start}`}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.experience.role}
            value={r.role}
            error={err("role")}
            onChange={(e) => set({ role: e.target.value })}
          />
          <TextField
            label={t.experience.company}
            value={r.company}
            error={err("company")}
            onChange={(e) => set({ company: e.target.value })}
          />
          <TextField
            label={t.experience.marketRole}
            hint={t.experience.marketRoleHint}
            value={r.marketRole}
            error={err("marketRole")}
            onChange={(e) => set({ marketRole: e.target.value })}
          />
          <TextField
            label={t.experience.location}
            value={r.location}
            error={err("location")}
            onChange={(e) => set({ location: e.target.value })}
          />
          <TextField
            label={t.experience.start}
            type="month"
            value={r.start}
            error={err("start")}
            onChange={(e) => set({ start: e.target.value })}
          />
          <TextField
            label={t.experience.end}
            type="month"
            value={r.end}
            error={err("end")}
            onChange={(e) => set({ end: e.target.value })}
          />
          <SelectField
            label={t.experience.employmentType}
            placeholder={strings.common.none}
            options={options(t.employmentTypes)}
            value={r.employmentType}
            error={err("employmentType")}
            onChange={(e) => set({ employmentType: e.target.value })}
          />
          <SelectField
            label={t.experience.workMode}
            placeholder={strings.common.none}
            options={options(t.workModes)}
            value={r.workMode}
            error={err("workMode")}
            onChange={(e) => set({ workMode: e.target.value })}
          />
          <TextField
            label={t.experience.teamSize}
            type="number"
            min={0}
            value={r.teamSize}
            error={err("teamSize")}
            onChange={(e) => set({ teamSize: e.target.value })}
          />
          <TextField
            label={t.experience.companyContext}
            value={r.companyContext}
            error={err("companyContext")}
            onChange={(e) => set({ companyContext: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label={t.experience.narrative}
              hint={t.experience.narrativeHint}
              rows={7}
              value={r.narrative}
              error={err("narrative")}
              onChange={(e) => set({ narrative: e.target.value })}
            />
          </div>
        </>
      )}
      extra={(r) =>
        r.id ? (
          <AchievementsEditor
            kind="experiences"
            parentId={r.id}
            achievements={
              bank.experiences.find((e) => e.id === r.id)?.achievements ?? []
            }
            skills={bank.skills}
          />
        ) : null
      }
    />
  );
}

// ───────────────────────── Proyectos ─────────────────────────
type ProjectRow = Row & {
  name: string;
  url: string;
  summary: string;
  approach: string;
  stack: string;
  startYear: string;
  endYear: string;
  isVisible: boolean;
};

export function ProjectSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("projects");
  return (
    <SectionEditor<Project, ProjectRow>
      title={t.project.title}
      empty={t.project.empty}
      addLabel={t.project.add}
      searchLabel={t.project.search}
      removeWhat={strings.confirm.what.project}
      readyHint={t.project.readyHint}
      source={bank.projects}
      toRow={(p) => ({
        key: p.id,
        id: p.id,
        name: p.name,
        url: str(p.url),
        summary: p.summary,
        approach: p.approach,
        stack: str(p.stack),
        startYear: str(p.startYear),
        endYear: str(p.endYear),
        isVisible: p.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        name: "",
        url: "",
        summary: "",
        approach: "",
        stack: "",
        startYear: "",
        endYear: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        name: r.name,
        url: optional(r.url),
        summary: r.summary,
        approach: r.approach,
        stack: optional(r.stack),
        startYear: toInt(r.startYear),
        endYear: toInt(r.endYear),
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.name)}
      save={(items) => save.mutateAsync(items).then((b) => b.projects)}
      heading={(r) => r.name}
      searchText={(r) => `${r.stack} ${r.summary}`}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.project.name}
            value={r.name}
            error={err("name")}
            onChange={(e) => set({ name: e.target.value })}
          />
          <TextField
            label={t.project.url}
            value={r.url}
            error={err("url")}
            onChange={(e) => set({ url: e.target.value })}
          />
          <TextField
            label={t.project.stack}
            value={r.stack}
            error={err("stack")}
            onChange={(e) => set({ stack: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t.project.startYear}
              type="number"
              value={r.startYear}
              error={err("startYear")}
              onChange={(e) => set({ startYear: e.target.value })}
            />
            <TextField
              label={t.project.endYear}
              type="number"
              value={r.endYear}
              error={err("endYear")}
              onChange={(e) => set({ endYear: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label={t.project.summary}
              rows={3}
              value={r.summary}
              error={err("summary")}
              onChange={(e) => set({ summary: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label={t.project.approach}
              rows={4}
              value={r.approach}
              error={err("approach")}
              onChange={(e) => set({ approach: e.target.value })}
            />
          </div>
        </>
      )}
      extra={(r) =>
        r.id ? (
          <AchievementsEditor
            kind="projects"
            parentId={r.id}
            achievements={
              bank.projects.find((p) => p.id === r.id)?.achievements ?? []
            }
            skills={bank.skills}
          />
        ) : null
      }
    />
  );
}

// ───────────────────────── Habilidades ─────────────────────────
type SkillRow = Row & {
  name: string;
  aliases: string;
  category: string;
  firstUsedYear: string;
  lastUsedYear: string;
  why: string;
  isVisible: boolean;
};

export function SkillSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("skills");
  return (
    <SectionEditor<Skill, SkillRow>
      title={t.skill.title}
      empty={t.skill.empty}
      addLabel={t.skill.add}
      searchLabel={t.skill.search}
      removeWhat={strings.confirm.what.skill}
      readyHint={t.skill.readyHint}
      maxItems={150}
      source={bank.skills}
      toRow={(s) => ({
        key: s.id,
        id: s.id,
        name: s.name,
        aliases: str(s.aliases),
        category: s.category,
        firstUsedYear: str(s.firstUsedYear),
        lastUsedYear: str(s.lastUsedYear),
        why: s.why,
        isVisible: s.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        name: "",
        aliases: "",
        category: "",
        firstUsedYear: "",
        lastUsedYear: "",
        why: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        name: r.name,
        aliases: optional(r.aliases),
        category: r.category,
        firstUsedYear: toInt(r.firstUsedYear),
        lastUsedYear: toInt(r.lastUsedYear),
        why: r.why,
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.name)}
      save={(items) => save.mutateAsync(items).then((b) => b.skills)}
      heading={(r) => r.name}
      searchText={(r) => `${r.category} ${r.aliases}`}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.skill.name}
            value={r.name}
            error={err("name")}
            onChange={(e) => set({ name: e.target.value })}
          />
          <TextField
            label={t.skill.category}
            value={r.category}
            error={err("category")}
            onChange={(e) => set({ category: e.target.value })}
          />
          <TextField
            label={t.skill.aliases}
            value={r.aliases}
            error={err("aliases")}
            onChange={(e) => set({ aliases: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t.skill.firstUsedYear}
              type="number"
              value={r.firstUsedYear}
              error={err("firstUsedYear")}
              onChange={(e) => set({ firstUsedYear: e.target.value })}
            />
            <TextField
              label={t.skill.lastUsedYear}
              type="number"
              value={r.lastUsedYear}
              error={err("lastUsedYear")}
              onChange={(e) => set({ lastUsedYear: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label={t.skill.why}
              value={r.why}
              error={err("why")}
              onChange={(e) => set({ why: e.target.value })}
            />
          </div>
          <p className="text-sm text-muted sm:col-span-2">
            {t.skill.evidence(
              bank.skills.find((s) => s.id === r.id)?.evidence ?? 0,
            )}
          </p>
        </>
      )}
    />
  );
}

// ───────────────────────── Educación, certificaciones, idiomas ─────────────────────────
type EducationRow = Row & {
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
  note: string;
  isVisible: boolean;
};

export function EducationSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("education");
  return (
    <SectionEditor<Education, EducationRow>
      title={t.education.title}
      empty={t.education.empty}
      addLabel={t.education.add}
      searchLabel={t.education.search}
      removeWhat={strings.confirm.what.education}
      readyHint={t.education.readyHint}
      source={bank.educations}
      toRow={(e) => ({
        key: e.id,
        id: e.id,
        degree: e.degree,
        institution: e.institution,
        startYear: str(e.startYear),
        endYear: str(e.endYear),
        note: str(e.note),
        isVisible: e.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        degree: "",
        institution: "",
        startYear: "",
        endYear: "",
        note: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        degree: r.degree,
        institution: r.institution,
        startYear: toInt(r.startYear),
        endYear: toInt(r.endYear),
        note: optional(r.note),
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.degree) && filled(r.institution)}
      save={(items) => save.mutateAsync(items).then((b) => b.educations)}
      heading={(r) => r.degree}
      searchText={(r) => r.institution}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.education.degree}
            value={r.degree}
            error={err("degree")}
            onChange={(e) => set({ degree: e.target.value })}
          />
          <TextField
            label={t.education.institution}
            value={r.institution}
            error={err("institution")}
            onChange={(e) => set({ institution: e.target.value })}
          />
          <TextField
            label={t.education.startYear}
            type="number"
            value={r.startYear}
            error={err("startYear")}
            onChange={(e) => set({ startYear: e.target.value })}
          />
          <TextField
            label={t.education.endYear}
            type="number"
            value={r.endYear}
            error={err("endYear")}
            onChange={(e) => set({ endYear: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t.education.note}
              value={r.note}
              error={err("note")}
              onChange={(e) => set({ note: e.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}

type CertificationRow = Row & {
  name: string;
  issuer: string;
  issuedYear: string;
  expiresYear: string;
  credentialUrl: string;
  isVisible: boolean;
};

export function CertificationSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("certifications");
  return (
    <SectionEditor<Certification, CertificationRow>
      title={t.certification.title}
      empty={t.certification.empty}
      addLabel={t.certification.add}
      searchLabel={t.certification.search}
      removeWhat={strings.confirm.what.certification}
      readyHint={t.certification.readyHint}
      source={bank.certifications}
      toRow={(c) => ({
        key: c.id,
        id: c.id,
        name: c.name,
        issuer: str(c.issuer),
        issuedYear: str(c.issuedYear),
        expiresYear: str(c.expiresYear),
        credentialUrl: str(c.credentialUrl),
        isVisible: c.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        name: "",
        issuer: "",
        issuedYear: "",
        expiresYear: "",
        credentialUrl: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        name: r.name,
        issuer: optional(r.issuer),
        issuedYear: toInt(r.issuedYear),
        expiresYear: toInt(r.expiresYear),
        credentialUrl: optional(r.credentialUrl),
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.name)}
      save={(items) => save.mutateAsync(items).then((b) => b.certifications)}
      heading={(r) => r.name}
      searchText={(r) => r.issuer}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.certification.name}
            value={r.name}
            error={err("name")}
            onChange={(e) => set({ name: e.target.value })}
          />
          <TextField
            label={t.certification.issuer}
            value={r.issuer}
            error={err("issuer")}
            onChange={(e) => set({ issuer: e.target.value })}
          />
          <TextField
            label={t.certification.issuedYear}
            type="number"
            value={r.issuedYear}
            error={err("issuedYear")}
            onChange={(e) => set({ issuedYear: e.target.value })}
          />
          <TextField
            label={t.certification.expiresYear}
            type="number"
            value={r.expiresYear}
            error={err("expiresYear")}
            onChange={(e) => set({ expiresYear: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t.certification.url}
              value={r.credentialUrl}
              error={err("credentialUrl")}
              onChange={(e) => set({ credentialUrl: e.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}

type LanguageRow = Row & {
  language: string;
  level: string;
  evidence: string;
  isVisible: boolean;
};

export function LanguageSection({ bank }: { bank: Bank }) {
  const save = useSaveSection("languages");
  return (
    <SectionEditor<LanguageSkill, LanguageRow>
      title={t.language.title}
      empty={t.language.empty}
      addLabel={t.language.add}
      searchLabel={t.language.search}
      removeWhat={strings.confirm.what.language}
      readyHint={t.language.readyHint}
      maxItems={15}
      source={bank.languages}
      toRow={(l) => ({
        key: l.id,
        id: l.id,
        language: l.language,
        level: l.level,
        evidence: str(l.evidence),
        isVisible: l.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        language: "",
        level: "B1",
        evidence: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        language: r.language,
        level: r.level,
        evidence: optional(r.evidence),
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.language)}
      save={(items) => save.mutateAsync(items).then((b) => b.languages)}
      heading={(r) => (r.language ? `${r.language} (${r.level})` : "")}
      searchText={(r) => r.evidence}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.language.language}
            value={r.language}
            error={err("language")}
            onChange={(e) => set({ language: e.target.value })}
          />
          <SelectField
            label={t.language.level}
            options={t.levels.map((v) => ({ value: v, label: v }))}
            value={r.level}
            error={err("level")}
            onChange={(e) => set({ level: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t.language.evidence}
              value={r.evidence}
              error={err("evidence")}
              onChange={(e) => set({ evidence: e.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}

type CompetencyRow = Row & {
  name: string;
  kind: string;
  description: string;
  evidence: string;
  isVisible: boolean;
};

export function CompetencySection({ bank }: { bank: Bank }) {
  const save = useSaveSection("competencies");
  return (
    <SectionEditor<Competency, CompetencyRow>
      title={t.competency.title}
      description={t.competency.description}
      empty={t.competency.empty}
      addLabel={t.competency.add}
      searchLabel={t.competency.search}
      removeWhat={strings.confirm.what.competency}
      readyHint={t.competency.readyHint}
      maxItems={60}
      source={bank.competencies}
      toRow={(c) => ({
        key: c.id,
        id: c.id,
        name: c.name,
        kind: c.kind,
        description: c.description,
        evidence: c.evidence,
        isVisible: c.isVisible,
      })}
      blank={() => ({
        key: newKey(),
        name: "",
        kind: "personal",
        description: "",
        evidence: "",
        isVisible: true,
      })}
      toPayload={(r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        description: r.description,
        evidence: r.evidence,
        isVisible: r.isVisible,
      })}
      isReady={(r) => filled(r.name)}
      save={(items) => save.mutateAsync(items).then((b) => b.competencies)}
      heading={(r) =>
        r.name ? `${r.name} · ${t.competency.kinds[r.kind as "personal" | "technical"] ?? r.kind}` : ""
      }
      searchText={(r) => `${r.description} ${r.evidence}`}
      fields={(r, set, err) => (
        <>
          <TextField
            label={t.competency.name}
            value={r.name}
            error={err("name")}
            onChange={(e) => set({ name: e.target.value })}
          />
          <SelectField
            label={t.competency.kind}
            options={options(t.competency.kinds)}
            value={r.kind}
            error={err("kind")}
            onChange={(e) => set({ kind: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t.competency.description_}
              value={r.description}
              error={err("description")}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label={t.competency.evidence}
              rows={3}
              value={r.evidence}
              error={err("evidence")}
              onChange={(e) => set({ evidence: e.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}
