import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useNotify } from "@/core/notifications";
import { Button } from "@/core/ui";
import { labelClass } from "@/core/ui/styles";
import { saveFile, useAiSettings } from "../api/hooks";
import { AiBusyDialog } from "../lib/useAiJob";
import { strings } from "../strings";
import { Collapsible } from "./Collapsible";
import { ErrorNotice, TextAreaField } from "./Form";

const t = strings.aiWork;
/** Mismo tope que el servidor (`CvAiResult.MaxJsonChars`). */
const MAX_IMPORT_CHARS = 60_000;

type Props = {
  /** Base del nombre de archivo del prompt descargado (sin extensión). */
  fileBase: string;
  /** Paquete con el prompt: idéntico para el proveedor configurado y para una IA externa. */
  getPackage: () => Promise<{ prompt: string }>;
  preparing: boolean;
  onRun: () => void;
  running: boolean;
  onImport: (json: string, done: () => void) => void;
  importing: boolean;
  error: unknown;
  rejected: readonly string[];
  /** Contenido tras una aplicación correcta (p. ej. el botón del PDF). */
  after?: ReactNode;
  /** Deshabilita todas las acciones (p. ej. falta un dato obligatorio). */
  disabled?: boolean;
  /** Texto del botón del proveedor configurado. */
  runLabel?: (label: string, model: string) => string;
  /** Texto que explica el prompt para una IA externa. */
  externalHint?: string;
  /** Título de la ventana de progreso mientras el proveedor responde. */
  busyTitle?: string;
  /** No mostrar la ventana simple de espera (la acción ya trae su propia ventana de progreso). */
  hideBusy?: boolean;
};

/**
 * Tres caminos con las mismas reglas: (1) el proveedor configurado con la clave del propietario, (2) descargar el prompt
 * para una IA externa y (3) importar su respuesta. Todo lo que llega se valida en el servidor antes de guardarse.
 */
export function AiWorkbench({
  fileBase,
  getPackage,
  preparing,
  onRun,
  running,
  onImport,
  importing,
  error,
  rejected,
  after,
  disabled = false,
  runLabel,
  externalHint,
  busyTitle,
  hideBusy = false,
}: Props) {
  const notify = useNotify();
  const settings = useAiSettings();
  const [pasted, setPasted] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [busyHidden, setBusyHidden] = useState(false);
  const fileId = useId();
  const active = settings.data?.providers.find((p) => p.isActive);
  const providerReady = Boolean(active && active.readable);
  // Divulgación progresiva: con un proveedor listo, la vía externa queda plegada (es la alternativa); sin él, abierta.
  const [externalToggled, setExternalToggled] = useState<boolean | null>(null);
  const externalOpen = externalToggled ?? (!providerReady || pasted !== "");

  const download = async (extension: "md" | "txt") => {
    const pack = await getPackage().catch(() => null);
    if (!pack) return;
    const type = extension === "md" ? "text/markdown" : "text/plain";
    saveFile(
      new Blob([pack.prompt], { type: `${type};charset=utf-8` }),
      `${fileBase}.${extension}`,
    );
  };

  const copy = async () => {
    const pack = await getPackage().catch(() => null);
    if (!pack) return;
    await navigator.clipboard.writeText(pack.prompt);
    notify(strings.common.copied);
  };

  const readFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_CHARS * 4) {
      setFileError(t.fileTooLarge);
      return;
    }
    const content = await file.text();
    if (content.length > MAX_IMPORT_CHARS) {
      setFileError(t.fileTooLarge);
      return;
    }
    setPasted(content);
  };

  return (
    <div className="flex flex-col gap-5">
      <section
        className="flex flex-col gap-2"
        aria-labelledby={`${fileId}-auto`}
      >
        <h4 id={`${fileId}-auto`} className="text-sm font-semibold text-fg">
          {t.auto}
        </h4>
        {active && active.readable ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              type="button"
              loading={running}
              disabled={disabled}
              loadingLabel={t.running}
              onClick={() => {
                setBusyHidden(false);
                onRun();
              }}
            >
              {(runLabel ?? t.run)(active.label, active.model ?? active.defaultModel)}
            </Button>
            <Link
              to="/huella/ia"
              className="text-sm font-medium text-accent-strong underline"
            >
              {t.configure}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {active && !active.readable ? t.unreadable : t.notConfigured}{" "}
            <Link
              to="/huella/ia"
              className="font-medium text-accent-strong underline"
            >
              {t.configure}
            </Link>
          </p>
        )}
      </section>

      <Collapsible
        heading="h4"
        title={t.external}
        expanded={externalOpen}
        onToggle={() => setExternalToggled(!externalOpen)}
      >
        <ol className="flex flex-col gap-4">
          <Step n={1} text={externalHint ?? t.step1}>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                type="button"
                loading={preparing}
                disabled={disabled}
                onClick={() => void download("md")}
              >
                {t.downloadMd}
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={preparing || disabled}
                onClick={() => void download("txt")}
              >
                {t.downloadTxt}
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={preparing || disabled}
                onClick={() => void copy()}
              >
                {strings.common.copy}
              </Button>
            </div>
          </Step>
          <Step n={2} text={t.step2} />
          <Step n={3} text={t.step3}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fileId}-file`} className={labelClass}>
                {t.file}
              </label>
              <input
                id={`${fileId}-file`}
                type="file"
                accept=".json,.txt,.md,application/json,text/plain,text/markdown"
                className="text-sm text-fg file:mr-3 file:min-h-9 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              {fileError ? (
                <p className="text-sm text-danger">{fileError}</p>
              ) : null}
            </div>
            <TextAreaField
              label={t.paste}
              rows={6}
              value={pasted}
              maxLength={MAX_IMPORT_CHARS}
              onChange={(e) => setPasted(e.target.value)}
            />
            <div>
              <Button
                variant="tonal"
                type="button"
                disabled={pasted.trim() === "" || disabled}
                loading={importing}
                onClick={() => onImport(pasted, () => setPasted(""))}
              >
                {t.import}
              </Button>
            </div>
          </Step>
        </ol>
      </Collapsible>

      {(running || importing) && !busyHidden && !hideBusy ? (
        <AiBusyDialog
          title={busyTitle ?? t.busy}
          onClose={() => setBusyHidden(true)}
        />
      ) : null}
      {rejected.length > 0 ? (
        <div className="rounded-xl border border-warning/40 border-l-4 border-l-warning bg-warning-soft px-4 py-3 text-sm text-fg">
          <p className="font-medium">{t.rejected}</p>
          <ul className="list-disc pl-5">
            {rejected.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {after}
      <ErrorNotice
        error={error}
        fallback={strings.bank.achievements.ai.invalid}
      />
    </div>
  );
}

/** Paso numerado de la vía externa: el número es visual; la lista ordenada ya lo anuncia a los lectores de pantalla. */
function Step({ n, text, children }: { n: number; text: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-sm text-fg-secondary">{text.replace(/^\d+\.\s*/, "")}</p>
        {children}
      </div>
    </li>
  );
}
