import { useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  ConfirmDialog,
  Panel,
  SelectField,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
} from "@/core/ui";
import {
  downloadLetter,
  useRenameLetter,
  useSaveLetter,
  useSetSentLetter,
} from "../api/hooks";
import type { Letter } from "../api/schemas";
import { formatDateTime } from "../lib/format";
import { inDays } from "../lib/tracking";
import { strings } from "../strings";
import { AiTaskPanel } from "./AiTaskPanel";
import { ErrorNotice, TextAreaField, fieldError } from "./Form";

const t = strings.studio.letter.editor;
const MAX = { subject: 120, greeting: 120, closing: 60, paragraph: 800, paragraphs: 5, min: 2 } as const;

function fileName(name: string) {
  const safe = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return safe.length > 0 ? safe : "carta";
}

/** Carta de presentación: texto editable (validado en el servidor), envío y descarga, y volver a redactar con IA. */
export function LetterEditor({ letter }: { letter: Letter }) {
  const { summary } = letter;
  return (
    <Tabs defaultSelectedKey="content">
      <TabList aria-label={t.tabs.label}>
        <Tab id="content">{t.tabs.content}</Tab>
        <Tab id="send">{t.tabs.send}</Tab>
        <Tab id="redo">{t.tabs.redo}</Tab>
      </TabList>
      <TabPanel id="content">
        {/* La clave reinicia el borrador cuando el texto cambia en el servidor (guardado o IA). */}
        <ContentForm key={summary.updatedAt} letter={letter} />
      </TabPanel>
      <TabPanel id="send">
        <SendPanel letter={letter} />
      </TabPanel>
      <TabPanel id="redo">
        <Panel title={t.redoTitle} description={t.redoDescription}>
          <AiTaskPanel
            kind="letter"
            title={t.redoBusy}
            fileBase={`huella-carta-${fileName(summary.name)}`}
            input={() => ({ versionId: summary.id })}
            runLabel={(label, model) => t.redoRun(label, model)}
            externalHint={strings.studio.letter.externalHint}
          />
        </Panel>
      </TabPanel>
    </Tabs>
  );
}

function ContentForm({ letter }: { letter: Letter }) {
  const notify = useNotify();
  const save = useSaveLetter();
  const rename = useRenameLetter();
  const { summary, document: doc } = letter;
  const [name, setName] = useState(summary.name);
  const [subject, setSubject] = useState(doc.subject);
  const [greeting, setGreeting] = useState(doc.greeting);
  const [paragraphs, setParagraphs] = useState(doc.paragraphs);
  const [closing, setClosing] = useState(doc.closing);
  const [date, setDate] = useState(doc.date);
  const [recipient, setRecipient] = useState(doc.recipient.join("\n"));
  const [font, setFont] = useState(doc.font);
  const [remove, setRemove] = useState<number | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  const total = paragraphs.reduce((n, p) => n + p.length, 0);
  const dirty =
    subject !== doc.subject ||
    greeting !== doc.greeting ||
    closing !== doc.closing ||
    date !== doc.date ||
    font !== doc.font ||
    recipient !== doc.recipient.join("\n") ||
    JSON.stringify(paragraphs) !== JSON.stringify(doc.paragraphs);

  return (
    <Panel
      title={t.title}
      description={t.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            {summary.source === "ai"
              ? strings.studio.versions.source.ai
              : strings.studio.versions.source.manual}
          </Badge>
          <Badge variant="neutral">{doc.language.toUpperCase()}</Badge>
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

        <div className="rounded-lg border border-line bg-surface-raised p-4">
          <p className="text-sm text-muted">{t.sender}</p>
          <p className="text-base font-semibold text-fg">{doc.signature}</p>
          {doc.location ? (
            <p className="text-sm text-fg-secondary">{doc.location}</p>
          ) : null}
          {doc.contact.length > 0 ? (
            <p className="text-sm text-muted">{doc.contact.join(" · ")}</p>
          ) : null}
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <TextField
            type="date"
            label={t.date}
            value={date}
            error={err("date")}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="secondary" type="button" onClick={() => setDate(inDays(0))}>
            {t.today}
          </Button>
          <SelectField
            label={t.font}
            options={Object.entries(t.fonts).map(([value, label]) => ({ value, label }))}
            value={font}
            onChange={(e) => setFont(e.target.value)}
          />
        </div>
        <TextAreaField
          label={t.recipient}
          hint={t.recipientHint}
          rows={3}
          value={recipient}
          error={err("recipient") ?? err("recipient[0]")}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <TextField
          label={t.subject}
          value={subject}
          maxLength={MAX.subject}
          hint={t.counter(subject.length, MAX.subject)}
          error={err("subject")}
          onChange={(e) => setSubject(e.target.value)}
        />
        <TextField
          label={t.greeting}
          value={greeting}
          maxLength={MAX.greeting}
          error={err("greeting")}
          onChange={(e) => setGreeting(e.target.value)}
        />
        {paragraphs.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <TextAreaField
                label={t.paragraph(i + 1)}
                rows={4}
                value={p}
                maxLength={MAX.paragraph}
                hint={t.counter(p.length, MAX.paragraph)}
                error={err(`paragraphs[${i}]`)}
                onChange={(e) =>
                  setParagraphs(paragraphs.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
            </div>
            <div className="pt-7">
              <Button
                variant="ghost"
                type="button"
                disabled={paragraphs.length <= MAX.min}
                aria-label={`${strings.common.remove}: ${t.paragraph(i + 1)}`}
                onClick={() => setRemove(i)}
              >
                {strings.common.remove}
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            type="button"
            disabled={paragraphs.length >= MAX.paragraphs}
            onClick={() => setParagraphs([...paragraphs, ""])}
          >
            {t.addParagraph}
          </Button>
          <span
            className={`text-sm ${total > letter.fit.bodyMax ? "text-danger" : "text-muted"}`}
          >
            {t.total(total, letter.fit.bodyMax)}
          </span>
        </div>
        <p
          role="status"
          className={`text-sm ${letter.fit.used > letter.fit.capacity ? "text-danger" : "text-muted"}`}
        >
          {letter.fit.used > letter.fit.capacity
            ? t.overflows(letter.fit.used, letter.fit.capacity)
            : t.fits(letter.fit.used, letter.fit.capacity)}{" "}
          {t.onePageRule}
        </p>
        {err("paragraphs") ? <p className="text-sm text-danger">{err("paragraphs")}</p> : null}
        <TextField
          label={t.closing}
          value={closing}
          maxLength={MAX.closing}
          error={err("closing")}
          onChange={(e) => setClosing(e.target.value)}
        />
        <div>
          <Button
            variant="primary"
            type="button"
            disabled={!dirty}
            loading={save.isPending}
            loadingLabel={strings.common.saving}
            onClick={() =>
              save.mutate(
                {
                  id: summary.id,
                  vars: {
                    subject,
                    greeting,
                    paragraphs,
                    closing,
                    date,
                    font,
                    recipient: recipient
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  },
                },
                { onSuccess: () => notify(strings.common.saved) },
              )
            }
          >
            {t.save}
          </Button>
        </div>
        <ErrorNotice error={save.error} />
      </div>
      {remove !== null ? (
        <ConfirmDialog
          title={strings.confirm.removeTitle(t.removeParagraph)}
          message={strings.confirm.removeMessage(t.paragraph(remove + 1))}
          confirmLabel={strings.common.remove}
          cancelLabel={strings.common.cancel}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            setParagraphs(paragraphs.filter((_, j) => j !== remove));
            setRemove(null);
          }}
        />
      ) : null}
    </Panel>
  );
}

function SendPanel({ letter }: { letter: Letter }) {
  const notify = useNotify();
  const sent = useSetSentLetter();
  const { summary, document: doc } = letter;
  const [pending, setPending] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const plain = letterText(doc);

  const download = (format: "pdf" | "docx") => {
    setPending(format);
    setError(null);
    downloadLetter(summary.id, format, `${fileName(summary.name)}.${format}`)
      .catch(setError)
      .finally(() => setPending(null));
  };

  return (
    <Panel title={t.sendTitle} description={t.sendHint}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-lg border border-line p-4">
          <p className="text-sm text-fg">
            {summary.sentAt
              ? `${strings.studio.docs.sentOn} ${formatDateTime(summary.sentAt)}`
              : strings.studio.docs.unsent}
          </p>
          <div>
            <Button
              variant={summary.sentAt ? "secondary" : "primary"}
              type="button"
              loading={sent.isPending}
              onClick={() =>
                sent.mutate(
                  { id: summary.id, vars: summary.sentAt === null },
                  {
                    onSuccess: () =>
                      notify(summary.sentAt === null ? strings.studio.docs.markedSent : strings.common.saved),
                  },
                )
              }
            >
              {summary.sentAt ? strings.studio.docs.unmarkSent : strings.studio.docs.markSent}
            </Button>
          </div>
          <ErrorNotice error={sent.error} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {letter.pdfAvailable ? (
              <Button
                variant="secondary"
                type="button"
                loading={pending === "pdf"}
                disabled={pending !== null}
                onClick={() => download("pdf")}
              >
                {strings.studio.editor.pdf}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              type="button"
              loading={pending === "docx"}
              disabled={pending !== null}
              onClick={() => download("docx")}
            >
              {strings.studio.editor.docx}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(plain).then(() => notify(t.copied))
              }
            >
              {t.copy}
            </Button>
          </div>
          {letter.pdfAvailable ? null : (
            <p className="text-sm text-muted">{strings.studio.editor.pdfUnavailable}</p>
          )}
          <ErrorNotice error={error} />
        </div>
      </div>
    </Panel>
  );
}

/** «16 de noviembre de 2026» / «November 16, 2026», sin depender de la zona horaria del navegador. */
function longDate(iso: string, language: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** La carta como texto, con la forma de una carta formal compacta (un renglón en blanco entre bloques), para pegarla en un formulario. */
function letterText(doc: Letter["document"]): string {
  const subject = doc.language === "en" ? "Subject:" : "Asunto:";
  const date = longDate(doc.date, doc.language);
  const blocks = [
    [doc.signature, ...(doc.location ? [doc.location] : [])],
    date ? [date] : [],
    doc.recipient,
    doc.subject ? [`${subject} ${doc.subject}`] : [],
    [doc.greeting],
    doc.paragraphs,
    [doc.closing],
    [doc.signature, ...(doc.contact.length > 0 ? [doc.contact.join(" · ")] : [])],
  ].filter((b) => b.length > 0);
  return blocks.map((b) => b.join("\n")).join("\n\n");
}
