import { Download, FileUp } from "lucide-react";
import { useId, useState } from "react";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import { Alert, Button, ConfirmDialog, PageHeader, Panel } from "@/core/ui";
import { labelClass } from "@/core/ui/styles";
import { downloadBankBackup, useBank, useImportBank } from "../api/hooks";
import type { BankImportResult } from "../api/schemas";
import { ErrorNotice, Loaded } from "../components/Form";
import { formatDateTime } from "../lib/format";
import { nestedCard } from "../lib/marker";
import {
  countsOfBank,
  describeBackupPath,
  MAX_BACKUP_BYTES,
  readBackup,
  type BackupCounts,
  type ReadBackup,
} from "../lib/backup";
import { strings } from "../strings";

const t = strings.backup;
const countKeys = Object.keys(t.counts) as (keyof BackupCounts)[];
type Picked = Extract<ReadBackup, { ok: true }> & { name: string };

/** «3 experiencias, 31 logros…» a partir de los conteos, en el orden de la pantalla. */
const summarize = (counts: BackupCounts) =>
  countKeys.map((key) => `${counts[key]} ${t.counts[key].toLowerCase()}`).join(", ");

/**
 * Respaldo del banco: descargar el perfil y el banco completo como JSON e importarlo en esta u otra computadora. Importar
 * reemplaza todo y es todo o nada (el servidor deshace cualquier cambio si el archivo trae algo inválido); por eso se muestra
 * qué cambia, se ofrece una copia de lo actual antes y se pide confirmar.
 */
export function Component() {
  const bank = useBank();
  const notify = useNotify();
  const importer = useImportBank();
  const fileId = useId();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [problem, setProblem] = useState<keyof typeof t.import.reasons | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<BankImportResult | null>(null);

  const download = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadBankBackup(t.export.fileName(new Date().toLocaleDateString("sv-SE")));
      notify(t.export.done, "success");
    } catch (error) {
      setDownloadError(error);
    } finally {
      setDownloading(false);
    }
  };

  const choose = async (file: File | undefined) => {
    setResult(null);
    importer.reset();
    if (!file) return;
    const read = readBackup(file.size > MAX_BACKUP_BYTES ? "" : await file.text(), file.size);
    if (read.ok) {
      setPicked({ ...read, name: file.name });
      setProblem(null);
    } else {
      setPicked(null);
      setProblem(read.reason);
    }
  };

  const reset = () => {
    setPicked(null);
    setProblem(null);
    setConfirming(false);
    importer.reset();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <PageHeader title={t.title} description={t.description} />

      <Loaded query={bank}>
        {(data) => {
          const current = countsOfBank(data);
          return (
            <>
              <Panel title={t.export.title} description={t.export.description}>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-fg-secondary">
                    <span className="font-medium text-fg">{t.export.today}</span> {summarize(current)}.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-xl border p-3 ${nestedCard}`}>
                      <p className="text-sm font-semibold text-fg">{t.export.includesTitle}</p>
                      <p className="mt-1 text-sm text-fg-secondary">{t.export.includes}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${nestedCard}`}>
                      <p className="text-sm font-semibold text-fg">{t.export.excludesTitle}</p>
                      <p className="mt-1 text-sm text-fg-secondary">{t.export.excludes}</p>
                    </div>
                  </div>
                  <Alert variant="warning" message={t.export.privacy} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      type="button"
                      loading={downloading}
                      loadingLabel={t.export.downloading}
                      onClick={() => void download()}
                    >
                      <Download aria-hidden="true" className="size-4" />
                      {t.export.download}
                    </Button>
                  </div>
                  <ErrorNotice error={downloadError} />
                </div>
              </Panel>

              <Panel title={t.import.title} description={t.import.description}>
                <div className="flex flex-col gap-4">
                  <Alert variant="warning" message={t.import.warning} />

                  {result ? (
                    <Alert
                      variant="success"
                      message={
                        <>
                          <span className="font-semibold">{t.import.success}</span> {t.import.successDetail}{" "}
                          {summarize(result)}.
                        </>
                      }
                    />
                  ) : null}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={fileId} className={labelClass}>
                      {t.import.pick}
                    </label>
                    <input
                      id={fileId}
                      type="file"
                      accept=".json,application/json"
                      className="text-sm text-fg file:mr-3 file:min-h-9 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
                      onChange={(e) => {
                        const input = e.target;
                        void choose(input.files?.[0]).finally(() => {
                          input.value = "";
                        });
                      }}
                    />
                  </div>

                  {problem ? <Alert variant="error" message={t.import.reasons[problem]} /> : null}

                  {picked ? (
                    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${nestedCard}`}>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                        <FileUp aria-hidden="true" className="size-4 text-accent-strong" />
                        <span className="break-all">{picked.name}</span>
                        {picked.exportedAt ? (
                          <span className="text-xs font-normal text-muted">
                            {t.import.exportedOn} {formatDateTime(picked.exportedAt)}
                          </span>
                        ) : null}
                      </p>
                      <table className="w-full text-sm">
                        <caption className="mb-1 text-left text-xs font-semibold text-muted">{t.import.compare}</caption>
                        <thead>
                          <tr className="text-left text-xs text-muted">
                            <th scope="col" className="py-1 font-medium">
                              <span className="sr-only">Sección</span>
                            </th>
                            <th scope="col" className="py-1 text-right font-medium">
                              {t.import.fileColumn}
                            </th>
                            <th scope="col" className="py-1 text-right font-medium">
                              {t.import.todayColumn}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {countKeys.map((key) => (
                            <tr key={key}>
                              <th scope="row" className="py-1.5 text-left font-normal text-fg-secondary">
                                {t.counts[key]}
                              </th>
                              <td
                                className={`py-1.5 text-right tabular-nums ${picked.counts[key] === current[key] ? "text-fg" : "font-semibold text-fg"}`}
                              >
                                {picked.counts[key]}
                              </td>
                              <td className="py-1.5 text-right text-muted tabular-nums">{current[key]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-sm text-fg-secondary">{picked.hasProfile ? t.import.profile : t.import.noProfile}</p>

                      <div className="flex flex-col gap-2 border-t border-line pt-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            variant="secondary"
                            type="button"
                            loading={downloading}
                            loadingLabel={t.export.downloading}
                            onClick={() => void download()}
                          >
                            {t.import.saveFirst}
                          </Button>
                          <span className="text-sm text-muted">{t.import.saveFirstHint}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="danger" type="button" onClick={() => setConfirming(true)}>
                            {t.import.replace}
                          </Button>
                          <Button variant="ghost" type="button" onClick={reset}>
                            {t.import.clear}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <ImportProblems error={importer.error} />
                </div>
              </Panel>

              {confirming && picked ? (
                <ConfirmDialog
                  title={t.import.confirmTitle}
                  message={t.import.confirmMessage(summarize(picked.counts))}
                  confirmLabel={t.import.confirm}
                  cancelLabel={strings.common.cancel}
                  pendingLabel={t.import.working}
                  pending={importer.isPending}
                  onClose={() => setConfirming(false)}
                  onConfirm={() =>
                    importer.mutate(picked.raw, {
                      onSuccess: (done) => {
                        setConfirming(false);
                        setPicked(null);
                        setResult(done);
                        notify(t.import.success, "success");
                      },
                      onError: () => setConfirming(false),
                    })
                  }
                />
              ) : null}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

/** Los problemas del archivo, uno por línea y con su lugar (sección, elemento y campo), o el aviso general si no hay detalle. */
function ImportProblems({ error }: { error: unknown }) {
  if (!error) return null;
  const details = isApiError(error) && !error.isNetwork ? Object.entries(error.errors) : [];
  if (details.length === 0) return <ErrorNotice error={error} />;
  return (
    <Alert
      variant="error"
      message={
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">{t.import.problemsTitle}</p>
          <ul className="list-disc pl-5">
            {details.map(([path, messages]) => (
              <li key={path}>
                <span className="font-medium">{describeBackupPath(path)}</span>: {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
