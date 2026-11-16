import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useNotify } from "@/core/notifications";
import {
  fetchAiTaskPackage,
  importAiTask,
  refreshAfterAiTask,
  runAiTask,
  type AiTaskInput,
  type AiTaskKind,
} from "../api/hooks";
import type { AiTaskOutcome } from "../api/schemas";
import { useAiJob, type AiStep } from "../lib/useAiJob";
import { strings } from "../strings";
import { AiWorkbench } from "./AiWorkbench";

const t = strings.aiJob;

type Props = {
  kind: AiTaskKind;
  /** Datos actuales de la tarea; se leen al pulsar, no al dibujar. */
  input: () => AiTaskInput;
  /** Título de la ventana de progreso. */
  title: string;
  /** Pasos con el proveedor configurado, uno tras otro. Sin ellos hay un solo paso con `input()`. */
  steps?: () => { label: string; input: AiTaskInput }[];
  /** Base del nombre del archivo del prompt descargado. */
  fileBase: string;
  disabled?: boolean;
  externalHint?: string;
  runLabel?: (label: string, model: string) => string;
  /** Se llama con los resultados cuando la tarea terminó bien (con el proveedor o al importar). */
  onDone?: (outcomes: AiTaskOutcome[]) => void;
  after?: ReactNode;
};

/**
 * Una acción de IA con sus tres caminos, que comparten reglas y prompt: ejecutarla con el proveedor configurado (con
 * ventana de progreso, un paso a la vez), descargar el prompt completo para una IA externa e importar su respuesta.
 */
export function AiTaskPanel({
  kind,
  input,
  title,
  steps,
  fileBase,
  disabled,
  externalHint,
  runLabel,
  onDone,
  after,
}: Props) {
  const notify = useNotify();
  const client = useQueryClient();
  const job = useAiJob();
  const [preparing, setPreparing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [rejected, setRejected] = useState<readonly string[]>([]);

  const run = () => {
    setError(null);
    setRejected([]);
    const plan = steps?.() ?? [{ label: title, input: input() }];
    const jobSteps: AiStep[] = plan.map((s) => ({
      label: s.label,
      run: () => runAiTask(kind, s.input),
    }));
    void job.start(title, jobSteps).then((outcomes) => {
      setRejected(outcomes.flatMap((o) => o.rejected));
      if (outcomes.length === jobSteps.length && outcomes.length > 0) {
        onDone?.(outcomes);
      }
    });
  };

  const doImport = (json: string, done: () => void) => {
    setError(null);
    setImporting(true);
    importAiTask(kind, input(), json)
      .then((outcome) => {
        setRejected(outcome.rejected);
        refreshAfterAiTask(client);
        if (outcome.accepted > 0) {
          done();
          notify(t.imported(outcome.accepted), "success");
          onDone?.([outcome]);
        } else {
          notify(outcome.rejected[0] ?? t.importedNothing, "error");
        }
      })
      .catch((e: unknown) => {
        setError(e);
        notify(t.importedNothing, "error");
      })
      .finally(() => setImporting(false));
  };

  return (
    <>
      <AiWorkbench
        fileBase={fileBase}
        getPackage={async () => {
          setPreparing(true);
          setError(null);
          try {
            return await fetchAiTaskPackage(kind, input());
          } catch (e) {
            setError(e);
            throw e;
          } finally {
            setPreparing(false);
          }
        }}
        preparing={preparing}
        onRun={run}
        running={job.running}
        onImport={doImport}
        importing={importing}
        error={error}
        rejected={rejected}
        disabled={disabled}
        externalHint={externalHint}
        runLabel={runLabel}
        busyTitle={title}
        after={after}
        hideBusy
      />
      {job.dialog}
    </>
  );
}
