import { useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Panel,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
} from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import { useRenameEmail, useSaveEmail, useSetSentEmail } from "../api/hooks";
import type { Email } from "../api/schemas";
import { gmailHref, isAddress, mailtoHref, wholeEmail } from "../lib/email";
import { formatDateTime } from "../lib/format";
import { strings } from "../strings";
import { AiTaskPanel } from "./AiTaskPanel";
import { ErrorNotice, TextAreaField, fieldError } from "./Form";

const t = strings.studio.email.editor;
const MAX = { subject: 150, greeting: 120, closing: 60, paragraph: 500, paragraphs: 4, min: 2, total: 1000, to: 254 } as const;

function fileName(name: string) {
  const safe = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return safe.length > 0 ? safe : "correo";
}

/** Correo de postulación: texto editable (validado en el servidor), abrirlo ya escrito en el correo, envío y volver a redactar con IA. */
export function EmailEditor({ email }: { email: Email }) {
  const { summary } = email;
  return (
    <Tabs defaultSelectedKey="content">
      <TabList aria-label={t.tabs.label}>
        <Tab id="content">{t.tabs.content}</Tab>
        <Tab id="send">{t.tabs.send}</Tab>
        <Tab id="redo">{t.tabs.redo}</Tab>
      </TabList>
      <TabPanel id="content">
        {/* La clave reinicia el borrador cuando el texto cambia en el servidor (guardado o IA). */}
        <ContentForm key={summary.updatedAt} email={email} />
      </TabPanel>
      <TabPanel id="send">
        <SendPanel email={email} />
      </TabPanel>
      <TabPanel id="redo">
        <Panel title={t.redoTitle} description={t.redoDescription}>
          <AiTaskPanel
            kind="email"
            title={t.redoBusy}
            fileBase={`huella-correo-${fileName(summary.name)}`}
            input={() => ({ versionId: summary.id })}
            runLabel={(label, model) => t.redoRun(label, model)}
            externalHint={strings.studio.email.externalHint}
          />
        </Panel>
      </TabPanel>
    </Tabs>
  );
}

function ContentForm({ email }: { email: Email }) {
  const notify = useNotify();
  const save = useSaveEmail();
  const rename = useRenameEmail();
  const { summary, document: doc } = email;
  const [name, setName] = useState(summary.name);
  const [to, setTo] = useState(doc.to);
  const [subject, setSubject] = useState(doc.subject);
  const [greeting, setGreeting] = useState(doc.greeting);
  const [paragraphs, setParagraphs] = useState(doc.paragraphs);
  const [closing, setClosing] = useState(doc.closing);
  const [remove, setRemove] = useState<number | null>(null);
  const err = (path: string) => fieldError(save.error, path);
  const total = paragraphs.reduce((n, p) => n + p.length, 0);
  const dirty =
    to !== doc.to ||
    subject !== doc.subject ||
    greeting !== doc.greeting ||
    closing !== doc.closing ||
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

        <TextField
          type="email"
          label={t.to}
          hint={t.toHint}
          value={to}
          maxLength={MAX.to}
          error={err("to")}
          onChange={(e) => setTo(e.target.value)}
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
                rows={3}
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
          <span className={`text-sm ${total > MAX.total ? "font-semibold text-fg" : "text-muted"}`}>
            {t.total(total, MAX.total)}
          </span>
        </div>
        {err("paragraphs") ? <p className="text-sm text-danger">{err("paragraphs")}</p> : null}
        <TextField
          label={t.closing}
          value={closing}
          maxLength={MAX.closing}
          error={err("closing")}
          onChange={(e) => setClosing(e.target.value)}
        />

        <div className="rounded-lg border border-line bg-surface-raised p-4">
          <p className="text-sm text-muted">{t.sender}</p>
          <p className="text-base font-semibold text-fg">{doc.signature}</p>
          {doc.contact.map((line) => (
            <p key={line} className="text-sm text-muted">
              {line}
            </p>
          ))}
        </div>

        <div>
          <Button
            variant="primary"
            type="button"
            disabled={!dirty}
            loading={save.isPending}
            loadingLabel={strings.common.saving}
            onClick={() =>
              save.mutate(
                { id: summary.id, vars: { to, subject, greeting, paragraphs, closing } },
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

function SendPanel({ email }: { email: Email }) {
  const notify = useNotify();
  const sent = useSetSentEmail();
  const { summary, document: doc, body } = email;
  const copy = (text: string, message: string) =>
    void navigator.clipboard.writeText(text).then(() => notify(message));

  return (
    <Panel title={t.sendTitle} description={t.sendHint}>
      <div className="flex flex-col gap-5">
        <Alert
          variant="info"
          message={
            <>
              <strong className="font-semibold">{t.attachTitle}.</strong> {t.attachBody}
            </>
          }
        />

        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4">
          <h3 className="text-sm font-semibold text-fg">{t.previewTitle}</h3>
          <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">{t.to}</dt>
            <dd className="break-words text-fg">
              {isAddress(doc.to) ? doc.to : <span className="text-muted">{t.noRecipient}</span>}
            </dd>
            <dt className="text-muted">{t.subject}</dt>
            <dd className="break-words font-medium text-fg">{doc.subject}</dd>
          </dl>
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-fg">{body}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a className={`${secondaryButton} no-underline`} href={mailtoHref(doc.to, doc.subject, body)}>
            {t.openMail}
          </a>
          <a
            className={`${secondaryButton} no-underline`}
            href={gmailHref(doc.to, doc.subject, body)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.openGmail}
          </a>
          <Button variant="secondary" type="button" onClick={() => copy(doc.subject, t.copiedSubject)}>
            {t.copySubject}
          </Button>
          <Button variant="secondary" type="button" onClick={() => copy(body, t.copiedBody)}>
            {t.copyBody}
          </Button>
          <Button variant="secondary" type="button" onClick={() => copy(wholeEmail(doc.subject, body), t.copiedAll)}>
            {t.copyAll}
          </Button>
        </div>

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
      </div>
    </Panel>
  );
}
