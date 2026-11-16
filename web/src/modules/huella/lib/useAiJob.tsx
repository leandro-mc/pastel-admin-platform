import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, LoaderCircle, OctagonAlert } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { isApiError } from "@/core/api";
import { useNotify } from "@/core/notifications";
import { Button, Dialog } from "@/core/ui";
import { refreshAfterAiTask } from "../api/hooks";
import type { AiTaskOutcome } from "../api/schemas";
import { strings } from "../strings";

const t = strings.aiJob;

/** Un paso de una acción de IA. Los pasos se ejecutan de uno en uno: cada uno espera la respuesta del anterior. */
export type AiStep = { label: string; run: () => Promise<AiTaskOutcome> };

type StepStatus = "pending" | "running" | "done" | "error";

type Job = {
  title: string;
  steps: { label: string; status: StepStatus; detail?: string }[];
  finished: boolean;
  failedAt: number | null;
  rejected: string[];
  hidden: boolean;
};

/** Mensaje de un error de la API (el texto del servidor si es esperable, el genérico si no). */
export function messageOf(error: unknown): string {
  return isApiError(error) &&
    (error.status < 500 || error.status === 503) &&
    !error.isNetwork
    ? error.detail
    : strings.common.loadFailed;
}

/**
 * Ejecuta acciones de IA con aviso visible: una ventana con barra de progreso y los pasos (que se puede cerrar sin
 * cancelar) y, al terminar, una alerta en la esquina con el resultado. Si un paso falla, los siguientes no corren y se
 * puede reintentar desde el que falló.
 */
export function useAiJob() {
  const notify = useNotify();
  const client = useQueryClient();
  const [job, setJob] = useState<Job | null>(null);
  const stepsRef = useRef<AiStep[]>([]);
  const outcomesRef = useRef<AiTaskOutcome[]>([]);
  const resolveRef = useRef<((outcomes: AiTaskOutcome[]) => void) | null>(null);

  const patch = useCallback(
    (update: (current: Job) => Job) => setJob((current) => (current ? update(current) : current)),
    [],
  );

  const execute = useCallback(
    async (from: number) => {
      const steps = stepsRef.current;
      for (let index = from; index < steps.length; index++) {
        patch((j) => ({
          ...j,
          failedAt: null,
          steps: j.steps.map((s, i) => (i === index ? { ...s, status: "running", detail: undefined } : s)),
        }));
        try {
          const outcome = await steps[index]!.run();
          outcomesRef.current[index] = outcome;
          if (outcome.accepted === 0) {
            // La IA respondió, pero nada pasó la validación: se dice por qué y no se sigue.
            const reason = outcome.rejected[0] ?? t.nothingUsable;
            patch((j) => ({
              ...j,
              rejected: [...j.rejected, ...outcome.rejected],
              steps: j.steps.map((s, i) => (i === index ? { ...s, status: "error", detail: reason } : s)),
              failedAt: index,
              finished: true,
            }));
            notify(t.failed(steps[index]!.label), "error");
            resolveRef.current?.(outcomesRef.current.filter(Boolean));
            return;
          }
          patch((j) => ({
            ...j,
            rejected: [...j.rejected, ...outcome.rejected],
            steps: j.steps.map((s, i) => (i === index ? { ...s, status: "done" } : s)),
          }));
        } catch (error) {
          patch((j) => ({
            ...j,
            steps: j.steps.map((s, i) => (i === index ? { ...s, status: "error", detail: messageOf(error) } : s)),
            failedAt: index,
            finished: true,
          }));
          notify(t.failed(steps[index]!.label), "error");
          refreshAfterAiTask(client);
          resolveRef.current?.(outcomesRef.current.filter(Boolean));
          return;
        }
      }
      patch((j) => ({ ...j, finished: true }));
      notify(t.done(stepsRef.current.length), "success");
      refreshAfterAiTask(client);
      resolveRef.current?.(outcomesRef.current.filter(Boolean));
    },
    [client, notify, patch],
  );

  /** Inicia la acción; la promesa se resuelve con los resultados de los pasos que terminaron bien. */
  const start = useCallback(
    (title: string, steps: AiStep[]) => {
      stepsRef.current = steps;
      outcomesRef.current = [];
      setJob({
        title,
        steps: steps.map((s) => ({ label: s.label, status: "pending" })),
        finished: false,
        failedAt: null,
        rejected: [],
        hidden: false,
      });
      return new Promise<AiTaskOutcome[]>((resolve) => {
        resolveRef.current = resolve;
        void execute(0);
      });
    },
    [execute],
  );

  const retry = useCallback(() => {
    if (!job || job.failedAt === null) return;
    const from = job.failedAt;
    patch((j) => ({ ...j, finished: false, rejected: [] }));
    void execute(from);
  }, [execute, job, patch]);

  const dialog: ReactNode =
    job && !job.hidden ? (
      <JobDialog
        job={job}
        onClose={() => patch((j) => ({ ...j, hidden: true }))}
        onRetry={retry}
      />
    ) : null;

  return { start, running: job !== null && !job.finished, dialog };
}

function JobDialog({ job, onClose, onRetry }: { job: Job; onClose: () => void; onRetry: () => void }) {
  const total = job.steps.length;
  const done = job.steps.filter((s) => s.status === "done").length;
  const running = job.steps.some((s) => s.status === "running");
  const percent = job.finished && job.failedAt === null ? 100 : Math.round(((done + (running ? 0.5 : 0)) / total) * 100);
  const failed = job.failedAt !== null;
  return (
    <Dialog
      title={failed ? t.failedTitle : job.finished ? t.doneTitle : job.title}
      description={job.finished ? undefined : t.working}
      onClose={onClose}
      closeLabel={t.close}
    >
      <div
        role="progressbar"
        aria-label={job.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${failed ? "bg-danger" : "bg-accent"} ${running ? "animate-pulse" : ""}`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <ol className="flex flex-col gap-2" aria-live="polite">
        {job.steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <StepIcon status={step.status} />
            <span className="flex flex-col">
              <span className={step.status === "pending" ? "text-muted" : "text-fg"}>{step.label}</span>
              {step.detail ? <span className="text-danger">{step.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {job.finished && job.rejected.length > 0 ? (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer font-medium text-fg">{t.rejected(job.rejected.length)}</summary>
          <ul className="mt-2 list-disc pl-5">
            {job.rejected.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {failed ? (
          <Button variant="primary" type="button" onClick={onRetry}>
            {t.retry}
          </Button>
        ) : null}
        <Button variant={failed ? "secondary" : "primary"} type="button" onClick={onClose}>
          {job.finished ? t.close : t.hide}
        </Button>
      </div>
    </Dialog>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  const common = { "aria-hidden": true, size: 18, className: "mt-0.5 shrink-0" } as const;
  if (status === "done") return <Check {...common} className="mt-0.5 shrink-0 text-accent-strong" />;
  if (status === "running") return <LoaderCircle {...common} className="mt-0.5 shrink-0 animate-spin text-accent-strong" />;
  if (status === "error") return <OctagonAlert {...common} className="mt-0.5 shrink-0 text-danger" />;
  return <Circle {...common} className="mt-0.5 shrink-0 text-muted" />;
}

/** Ventana simple de «la IA está trabajando» para acciones de un solo paso que ya manejan su propio estado. */
export function AiBusyDialog({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Dialog title={title} description={t.working} onClose={onClose} closeLabel={t.hide}>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" type="button" onClick={onClose}>
          {t.hide}
        </Button>
      </div>
    </Dialog>
  );
}
