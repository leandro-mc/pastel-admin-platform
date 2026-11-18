import { useId, useState, type ChangeEvent } from "react";
import { Alert, Badge, Button, ConfirmDialog, Panel, StateView } from "@/core/ui";
import { inputClass, labelClass } from "@/core/ui/styles";
import { log } from "@/core/log";
import { useImport, useRevertImport } from "../api/mutations";
import { useImportBatches } from "../api/queries";
import type { ImportReport } from "../api/schemas";
import { formatLong, formatShort } from "../domain/calendar";
import { dateFromInstant } from "../domain/dates";
import { useBrisa } from "../state/BrisaContext";
import { brisaMessage } from "../state/errors";
import { strings } from "../strings";

const MAX_BYTES = 10 * 1024 * 1024;

type Issue = ImportReport["errors"][number];

function IssueList({ title, issues }: { title: string; issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <ul className="mt-1 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-fg-secondary">
        {issues.map((issue, index) => (
          <li key={`${issue.row ?? "x"}-${issue.field ?? "x"}-${index}`}>
            {issue.row !== null ? <strong className="text-fg">{strings.import.row(issue.row)}</strong> : null}
            {issue.field ? <span> · {issue.field}</span> : null}
            {issue.row !== null || issue.field ? ": " : ""}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Importar tareas: elegir un archivo JSON, ver la vista previa con totales (no se guarda nada), confirmar y, si hace falta,
 * revertir. Todo o nada: con un solo error no se importa ningún registro (inventario §9.4).
 */
export function ImportView() {
  const { zone } = useBrisa();
  const fileId = useId();
  const preview = useImport();
  const commit = useImport();
  const revert = useRevertImport();
  const batches = useImportBatches();
  const [content, setContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [revertNote, setRevertNote] = useState<string | null>(null);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError(null);
    setRevertNote(null);
    commit.reset();
    preview.reset();
    if (file.size > MAX_BYTES) {
      setContent(null);
      setFileError(strings.import.tooBig);
      return;
    }
    file
      .text()
      .then((text) => {
        setContent(text);
        preview.mutate({ content: text, dryRun: true });
      })
      .catch((error: unknown) => {
        log.warn("No se pudo leer el archivo de importación", error);
        setContent(null);
        setFileError(strings.import.readError);
      });
  };

  const report = commit.data ?? preview.data;
  const imported = commit.data?.accepted ? commit.data : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fileId} className={labelClass}>
            {strings.import.fileLabel}
          </label>
          <input id={fileId} type="file" accept="application/json,.json" onChange={pick} className={inputClass} />
          <p className="text-xs text-muted">{strings.import.fileHint}</p>
        </div>
        {fileError ? <Alert className="mt-3" variant="error" message={fileError} /> : null}
        {preview.isError ? <Alert className="mt-3" variant="error" message={brisaMessage(preview.error)} /> : null}
      </Panel>

      {preview.isPending ? <StateView status="loading" title={strings.import.reading} /> : null}

      {report && !imported ? (
        report.accepted ? (
          <Panel title={strings.import.previewTitle}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg">
                {strings.import.totals(report.totals.records, report.totals.open, report.totals.done, report.totals.withDeadline)}
              </p>
              {report.totals.from && report.totals.to ? (
                <p className="text-sm text-fg-secondary">
                  {strings.import.range(formatShort(report.totals.from), formatShort(report.totals.to))}
                </p>
              ) : null}
              <p className="text-sm font-medium text-fg">{strings.import.toCreate(report.toCreate)}</p>
              {report.alreadyExisting > 0 ? (
                <p className="text-sm text-fg-secondary">{strings.import.existing(report.alreadyExisting)}</p>
              ) : null}
              {report.withDifferences > 0 ? (
                <p className="text-sm text-fg-secondary">{strings.import.differences(report.withDifferences)}</p>
              ) : null}
              <IssueList title={strings.import.warningsTitle} issues={report.warnings} />
              <IssueList title={strings.import.skippedTitle} issues={report.skipped} />
              {commit.isError ? <Alert variant="error" message={brisaMessage(commit.error)} /> : null}
              {report.toCreate === 0 ? (
                <p className="text-sm text-muted">{strings.import.nothingNew}</p>
              ) : (
                <div>
                  <Button
                    loading={commit.isPending}
                    loadingLabel={strings.import.importing}
                    onClick={() => content && commit.mutate({ content, dryRun: false })}
                  >
                    {strings.import.confirm(report.toCreate)}
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <Panel title={strings.import.rejectedTitle} description={strings.import.rejectedDescription}>
            <IssueList title={strings.import.errorsTitle} issues={report.errors} />
          </Panel>
        )
      ) : null}

      {imported ? (
        <Panel title={strings.import.doneTitle(imported.toCreate)} description={strings.import.doneDescription}>
          <IssueList title={strings.import.skippedTitle} issues={imported.skipped} />
          {imported.batchId ? (
            <Button variant="secondary" onClick={() => setRevertTarget(imported.batchId)}>
              {strings.import.revert}
            </Button>
          ) : null}
        </Panel>
      ) : null}

      {revertNote ? <Alert variant="success" message={revertNote} /> : null}
      {revert.isError ? <Alert variant="error" message={brisaMessage(revert.error)} /> : null}

      <Panel title={strings.import.recentTitle}>
        {batches.data && batches.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {batches.data.map((batch) => {
              const day = dateFromInstant(batch.createdAt, zone);
              return (
                <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-fg">
                    {strings.import.recentItem(day ? formatLong(day) : batch.createdAt, batch.taskCount)}
                  </span>
                  {batch.revertedAt ? (
                    <Badge>{strings.import.recentReverted}</Badge>
                  ) : (
                    <Button variant="ghost" onClick={() => setRevertTarget(batch.id)}>
                      {strings.import.revert}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{strings.import.recentEmpty}</p>
        )}
      </Panel>

      {revertTarget ? (
        <ConfirmDialog
          title={strings.import.revertTitle}
          message={strings.import.revertDescription}
          confirmLabel={strings.import.revertConfirm}
          cancelLabel={strings.import.revertKeep}
          pendingLabel={strings.import.reverting}
          pending={revert.isPending}
          onClose={() => setRevertTarget(null)}
          onConfirm={() =>
            revert.mutate(
              { batchId: revertTarget },
              {
                onSuccess: (result) => {
                  setRevertTarget(null);
                  commit.reset();
                  preview.reset();
                  setContent(null);
                  setRevertNote(strings.import.reverted(result.reverted, result.kept));
                },
                onError: () => setRevertTarget(null),
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
