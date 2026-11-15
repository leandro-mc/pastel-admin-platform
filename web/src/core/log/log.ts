import { ApiError, api } from "@/core/api";

/**
 * Registro técnico del cliente (`ERROR_HANDLING_AND_LOGGING.md` §3). Es el único lugar que puede usar `console`.
 * Solo se reportan errores al servidor: sin cuerpos de formularios, sin cabeceras, sin la cadena de consulta de la URL
 * y sin texto escrito por la persona usuaria. El servidor lo registra como Warning y no lo guarda en la base.
 */
const MAX_MESSAGE = 500;
const MAX_STACK = 2048;
const MAX_PER_MINUTE = 5;
const DEDUPE_MS = 60_000;

const version = import.meta.env.VITE_APP_VERSION ?? "dev";
const recent = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

export type LogContext = {
  /** Código del módulo (`identity`, `brisa`…). Si falta se deduce del primer segmento de la ruta. */
  module?: string;
};

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof ApiError) {
    // El `detail` del servidor ya es un texto seguro; se agrega el código y el traceId para correlacionar.
    const trace = error.traceId ? ` traceId=${error.traceId}` : "";
    return {
      message: `ApiError ${error.status} ${error.code}${trace}`,
      stack: error.stack,
    };
  }
  if (error instanceof Error)
    return { message: error.message, stack: error.stack };
  return {
    message: typeof error === "string" ? error : "Error no identificado",
  };
}

function currentRoute(): string {
  return window.location.pathname; // sin query ni hash: pueden traer datos de la persona
}

function shouldSend(key: string, now: number): boolean {
  if (now - windowStart > 60_000) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= MAX_PER_MINUTE) return false;
  const last = recent.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return false;
  if (recent.size > 100) recent.clear();
  recent.set(key, now);
  sentInWindow += 1;
  return true;
}

function report(error: unknown, context: LogContext): void {
  const { message, stack } = describe(error);
  const route = currentRoute();
  const key = `${route}|${message}`;
  if (!shouldSend(key, Date.now())) return;

  const module = context.module ?? route.split("/")[1] ?? "";
  void api
    .send(
      "POST",
      "/api/client-errors",
      {
        message: message.slice(0, MAX_MESSAGE),
        stack: stack?.slice(0, MAX_STACK),
        route,
        module,
        version,
      },
      { keepalive: true },
    )
    .catch(() => {
      // Si el reporte falla no hay a dónde más informar; se descarta para no generar un ciclo de errores.
    });
}

function toConsole(
  level: "warn" | "error",
  message: string,
  error?: unknown,
): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console -- único uso permitido: ayuda de desarrollo dentro del envoltorio.
  console[level](message, error ?? "");
}

export const log = {
  /** Error inesperado: se muestra en desarrollo y se reporta al servidor (con límite y sin duplicados). */
  error(message: string, error?: unknown, context: LogContext = {}): void {
    toConsole("error", message, error);
    report(error ?? new Error(message), context);
  },
  /** Aviso solo para desarrollo: no se envía al servidor. */
  warn(message: string, error?: unknown): void {
    toConsole("warn", message, error);
  },
};

/** Registra los errores globales no capturados (`error` y `unhandledrejection`). Devuelve la función que los quita. */
export function installGlobalErrorHandlers(): () => void {
  const onError = (event: ErrorEvent) =>
    log.error("Error no capturado", event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) =>
    log.error("Promesa rechazada sin manejar", event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
