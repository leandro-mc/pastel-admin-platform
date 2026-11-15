import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Badge, Button, Panel, TextField } from "@/core/ui";
import {
  useCvAiPackage,
  useCvAiResult,
  useEditLine,
  useRenameVersion,
  useSetPublicVersion,
} from "../api/hooks";
import type { CvDocument, CvVersion } from "../api/schemas";
import { strings } from "../strings";
import { ErrorNotice, TextAreaField } from "./Form";
import { EvidenceList } from "./OfferPanel";

const t = strings.studio.editor;

type Target =
  | { kind: "summary" }
  | {
      kind: "bullet";
      section: "experience" | "projects";
      entry: number;
      index: number;
    };

/** Tope blando para la longitud de una viñeta en pantalla; el servidor aplica el tope duro. */
const BULLET_HINT_MAX = 220;

function LineEditor({
  versionId,
  target,
  initial,
  sourceIds,
  onDone,
}: {
  versionId: string;
  target: Target;
  initial: string;
  sourceIds: readonly string[];
  onDone: () => void;
}) {
  const edit = useEditLine();
  const [text, setText] = useState(initial);
  const notify = useNotify();
  const save = () =>
    edit.mutate(
      {
        id: versionId,
        vars:
          target.kind === "summary"
            ? { target: "summary", text }
            : {
                target: "bullet",
                section: target.section,
                entry: target.entry,
                index: target.index,
                text,
                sourceIds,
              },
      },
      {
        onSuccess: () => {
          notify(strings.common.saved);
          onDone();
        },
      },
    );
  return (
    <div className="flex flex-col gap-2">
      <TextAreaField
        label={t.edit}
        rows={target.kind === "summary" ? 4 : 3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint={t.lineLength(
          text.length,
          target.kind === "summary" ? 600 : BULLET_HINT_MAX,
        )}
      />
      <div className="flex gap-2">
        <Button
          variant="primary"
          type="button"
          loading={edit.isPending}
          loadingLabel={strings.common.saving}
          onClick={save}
        >
          {t.saveLine}
        </Button>
        <Button variant="ghost" type="button" onClick={onDone}>
          {strings.common.cancel}
        </Button>
      </div>
      <ErrorNotice error={edit.error} />
    </div>
  );
}

function Bullets({
  versionId,
  section,
  entries,
}: {
  versionId: string;
  section: "experience" | "projects";
  entries: CvDocument["experience"];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, ei) => (
        <div key={`${entry.title}-${ei}`} className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-fg">
            {entry.title}
            {entry.subtitle ? (
              <span className="font-normal text-fg-secondary">
                {" "}
                · {entry.subtitle}
              </span>
            ) : null}
          </p>
          <p className="text-sm text-muted">
            {[entry.dates, entry.location].filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-1 flex flex-col gap-2">
            {entry.bullets.map((bullet, bi) => {
              const key = `${section}-${ei}-${bi}`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-1 border-l-2 border-line pl-3 text-sm text-fg"
                >
                  {editing === key ? (
                    <LineEditor
                      versionId={versionId}
                      target={{ kind: "bullet", section, entry: ei, index: bi }}
                      initial={bullet.text}
                      sourceIds={bullet.sourceIds}
                      onDone={() => setEditing(null)}
                    />
                  ) : (
                    <>
                      <span>{bullet.text}</span>
                      <span>
                        <Button
                          variant="link"
                          type="button"
                          onClick={() => setEditing(key)}
                        >
                          {t.edit}
                        </Button>
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Vista previa del CV con edición validada línea por línea, reporte, texto ATS, IA manual y PDF. */
export function CvEditor({ version }: { version: CvVersion }) {
  const notify = useNotify();
  const { summary, document: doc, report } = version;
  const rename = useRenameVersion();
  const setPublic = useSetPublicVersion();
  const [name, setName] = useState(summary.name);
  const [editingSummary, setEditingSummary] = useState(false);
  const failed = report.checks.filter((c) => !c.passed);

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={t.title}
        description={strings.studio.versions.pagesLines(
          summary.pages,
          summary.linesUsed,
          summary.lineBudget,
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {summary.isPublic ? (
              <Badge variant="accent">{strings.studio.versions.public}</Badge>
            ) : null}
            <Badge>
              {strings.studio.versions.source[
                summary.source as "rules" | "manual" | "ai"
              ] ?? summary.source}
            </Badge>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <TextField
                label={strings.studio.versions.rename}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              type="button"
              disabled={name.trim() === "" || name === summary.name}
              loading={rename.isPending}
              onClick={() =>
                rename.mutate(
                  { id: summary.id, vars: name },
                  { onSuccess: () => notify(strings.common.saved) },
                )
              }
            >
              {strings.common.save}
            </Button>
          </div>
          <ErrorNotice error={rename.error} />

          <article
            className="flex flex-col gap-5 rounded-xl border border-line bg-surface-raised p-5"
            aria-label={doc.header.name}
          >
            <header>
              <h3 className="text-xl font-semibold text-fg">
                {doc.header.name}
              </h3>
              <p className="text-fg-secondary">{doc.header.headline}</p>
              {doc.header.contactLine1.length > 0 ? (
                <p className="mt-1 text-sm text-muted">
                  {doc.header.contactLine1.join(" · ")}
                </p>
              ) : null}
              {doc.header.contactLine2.length > 0 ? (
                <p className="text-sm text-muted">
                  {doc.header.contactLine2.join(" · ")}
                </p>
              ) : null}
            </header>
            <section className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">
                {t.summary}
              </h4>
              {editingSummary ? (
                <LineEditor
                  versionId={summary.id}
                  target={{ kind: "summary" }}
                  initial={doc.summary}
                  sourceIds={[]}
                  onDone={() => setEditingSummary(false)}
                />
              ) : (
                <>
                  <p className="text-sm text-fg">{doc.summary}</p>
                  <span>
                    <Button
                      variant="link"
                      type="button"
                      onClick={() => setEditingSummary(true)}
                    >
                      {t.edit}
                    </Button>
                  </span>
                </>
              )}
            </section>
            {doc.skills.length > 0 ? (
              <section className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">
                  {strings.public.sections.tools}
                </h4>
                <ul className="text-sm text-fg">
                  {doc.skills.map((g) => (
                    <li key={g.label}>
                      <span className="font-medium">{g.label}: </span>
                      {g.items.join(", ")}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {doc.experience.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">
                  {strings.public.sections.path}
                </h4>
                <Bullets
                  versionId={summary.id}
                  section="experience"
                  entries={doc.experience}
                />
              </section>
            ) : null}
            {doc.projects.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">
                  {strings.public.sections.projects}
                </h4>
                <Bullets
                  versionId={summary.id}
                  section="projects"
                  entries={doc.projects}
                />
              </section>
            ) : null}
            {doc.education.length > 0 ? (
              <section className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">
                  {strings.public.sections.education}
                </h4>
                <ul className="text-sm text-fg">
                  {doc.education.map((e) => (
                    <li key={`${e.degree}-${e.institution}`}>
                      {e.degree}, {e.institution}{" "}
                      <span className="text-muted">{e.dates}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {doc.extras.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-fg">
                {doc.extras.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : null}
          </article>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={summary.isPublic ? "secondary" : "primary"}
              type="button"
              loading={setPublic.isPending}
              onClick={() =>
                setPublic.mutate({ id: summary.id, vars: !summary.isPublic })
              }
            >
              {summary.isPublic ? t.removePublic : t.makePublic}
            </Button>
            {version.pdfAvailable ? (
              <a
                className="text-sm font-medium text-accent-strong underline"
                href={`/api/huella/studio/versions/${summary.id}/pdf`}
                download
              >
                {t.pdf}
              </a>
            ) : (
              <p className="text-sm text-muted">{t.pdfUnavailable}</p>
            )}
          </div>
          <p className="text-sm text-muted">{t.publicHint}</p>
          <ErrorNotice error={setPublic.error} />
        </div>
      </Panel>

      <Panel title={t.checks}>
        {failed.length === 0 ? (
          <p className="text-sm text-fg">{t.checksPassed}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {report.checks.map((c) => (
              <li key={c.label} className="flex flex-wrap items-center gap-2">
                <Badge variant={c.passed ? "success" : "danger"}>
                  {c.passed ? "Pasa" : "No pasa"}
                </Badge>
                <span className="text-fg">{c.label}</span>
                {c.note ? <span className="text-muted">{c.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {report.fitLog.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              {t.fit}
            </summary>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              {report.fitLog.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {report.evidence.length > 0 ? (
          <div className="mt-4">
            <EvidenceList items={report.evidence} />
          </div>
        ) : null}
      </Panel>

      <Panel title={t.ats} description={t.atsDescription}>
        <TextAreaField
          label={t.ats}
          readOnly
          rows={12}
          value={version.atsText}
        />
      </Panel>

      <AiRewrite versionId={summary.id} />
    </div>
  );
}

function AiRewrite({ versionId }: { versionId: string }) {
  const notify = useNotify();
  const pack = useCvAiPackage();
  const apply = useCvAiResult();
  const [pasted, setPasted] = useState("");
  const [rejected, setRejected] = useState<readonly string[]>([]);
  const prompt = pack.data?.prompt;
  return (
    <Panel
      title={strings.studio.ai.title}
      description={strings.studio.ai.description}
    >
      <div className="flex flex-col gap-3">
        <div>
          <Button
            variant="secondary"
            type="button"
            loading={pack.isPending}
            onClick={() => pack.mutate(versionId)}
          >
            {strings.bank.achievements.ai.getPackage}
          </Button>
        </div>
        {prompt ? (
          <>
            <TextAreaField
              label={strings.bank.achievements.ai.package}
              readOnly
              rows={6}
              value={prompt}
            />
            <div>
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(prompt)
                    .then(() => notify(strings.common.copied))
                }
              >
                {strings.common.copy}
              </Button>
            </div>
          </>
        ) : null}
        <TextAreaField
          label={strings.bank.achievements.ai.paste}
          rows={5}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div>
          <Button
            variant="secondary"
            type="button"
            disabled={pasted.trim() === ""}
            loading={apply.isPending}
            onClick={() =>
              apply.mutate(
                { id: versionId, json: pasted },
                {
                  onSuccess: (result) => {
                    setPasted("");
                    setRejected(result.rejected);
                    notify(strings.studio.ai.accepted(result.accepted));
                  },
                },
              )
            }
          >
            {strings.bank.achievements.ai.apply}
          </Button>
        </div>
        {rejected.length > 0 ? (
          <div className="text-sm text-muted">
            <p className="font-medium text-fg">{t.rejected}</p>
            <ul className="list-disc pl-5">
              {rejected.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ErrorNotice
          error={pack.error ?? apply.error}
          fallback={strings.bank.achievements.ai.invalid}
        />
      </div>
    </Panel>
  );
}
