import type { z } from "zod";
import { CSRF_HEADER, getCsrfToken } from "./csrf";
import { ApiError, problemFromResponse } from "./errors";
import { apiMessages } from "./messages";
import { notifySessionExpired } from "./session";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Solo lecturas (GET): reintentos automáticos ante red caída o 502/503/504. Por defecto 2; 0 los desactiva. */
  retries?: number;
  /** Evita enviar a /api/auth/refresh tras un 401 (rutas de acceso). */
  skipRefresh?: boolean;
  /** Para reportes enviados mientras la página se cierra. */
  keepalive?: boolean;
};

const TIMEOUT_MS = 30_000;
const MAX_READ_RETRIES = 2;
const RETRY_BASE_MS = 300;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const SAFE_METHODS = new Set<HttpMethod>(["GET"]);
/** Rutas de acceso: un 401 ahí es una respuesta normal, no una sesión vencida. */
const NO_REFRESH_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/client-errors",
];

type Call = {
  method: HttpMethod;
  path: string;
  body?: unknown;
} & RequestOptions;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Una sola petición HTTP, sin refresco ni reintentos. Traduce fallos de red a `ApiError` con `status` 0. */
async function attempt(call: Call): Promise<Response> {
  const headers = new Headers(call.headers);
  if (call.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!SAFE_METHODS.has(call.method)) {
    headers.set(CSRF_HEADER, await getCsrfToken());
  }

  try {
    return await fetch(call.path, {
      method: call.method,
      headers,
      body: call.body === undefined ? undefined : JSON.stringify(call.body),
      credentials: "include",
      cache: "no-store",
      signal: withTimeout(call.signal),
      keepalive: call.keepalive,
    });
  } catch (error) {
    if (call.signal?.aborted) throw error; // cancelación pedida por quien llama: no es un fallo de red
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError({
      status: 0,
      code: timedOut ? "client.timeout" : "client.network",
      detail: timedOut ? apiMessages.timeout : apiMessages.network,
      cause: error,
    });
  }
}

let refreshing: Promise<boolean> | null = null;

/** Refresco de sesión compartido: sin importar cuántas peticiones reciban 401, solo hay una en vuelo. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= attempt({
    method: "POST",
    path: "/api/auth/refresh",
    skipRefresh: true,
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function canRefresh(call: Call): boolean {
  return (
    !call.skipRefresh &&
    !NO_REFRESH_PREFIXES.some((p) => call.path.startsWith(p))
  );
}

/**
 * Ante 401 refresca la sesión una vez y repite la petición. Una respuesta 401 significa que la autenticación falló antes
 * de ejecutar la acción, así que repetir una escritura no la duplica. Si el refresco falla, avisa «sesión vencida».
 */
async function execute(call: Call): Promise<Response> {
  const response = await attempt(call);
  if (response.status !== 401 || !canRefresh(call)) return response;

  if (!(await refreshSession())) {
    notifySessionExpired();
    return response;
  }
  const retried = await attempt(call);
  if (retried.status === 401) notifySessionExpired();
  return retried;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** Lecturas idempotentes: hasta 2 reintentos con espera creciente. Las escrituras nunca se reintentan. */
async function send(call: Call): Promise<Response> {
  const maxRetries = SAFE_METHODS.has(call.method)
    ? (call.retries ?? MAX_READ_RETRIES)
    : 0;
  for (let n = 0; ; n++) {
    try {
      const response = await execute(call);
      if (n < maxRetries && RETRYABLE_STATUS.has(response.status)) {
        await sleep(RETRY_BASE_MS * 3 ** n, call.signal);
        continue;
      }
      return response;
    } catch (error) {
      if (n < maxRetries && error instanceof ApiError && error.isNetwork) {
        await sleep(RETRY_BASE_MS * 3 ** n, call.signal);
        continue;
      }
      throw error;
    }
  }
}

async function readJson<S extends z.ZodType>(
  call: Call,
  schema: S,
): Promise<z.infer<S>> {
  const response = await send(call);
  if (!response.ok) throw await problemFromResponse(response);

  let data: unknown;
  try {
    data = response.status === 204 ? undefined : await response.json();
  } catch (error) {
    throw invalidResponse(response.status, error);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw invalidResponse(response.status, parsed.error);
  return parsed.data;
}

function invalidResponse(status: number, cause: unknown): ApiError {
  return new ApiError({
    status,
    code: "client.invalid_response",
    detail: apiMessages.invalidResponse,
    cause,
  });
}

async function readNothing(call: Call): Promise<void> {
  const response = await send(call);
  if (!response.ok) throw await problemFromResponse(response);
}

/** Cliente de la API. Toda respuesta con cuerpo se valida con zod en el borde (no hay `as T`). */
export const api = {
  get: <S extends z.ZodType>(
    path: string,
    schema: S,
    options?: RequestOptions,
  ) => readJson({ method: "GET", path, ...options }, schema),
  post: <S extends z.ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: RequestOptions,
  ) => readJson({ method: "POST", path, body, ...options }, schema),
  put: <S extends z.ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: RequestOptions,
  ) => readJson({ method: "PUT", path, body, ...options }, schema),
  patch: <S extends z.ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: RequestOptions,
  ) => readJson({ method: "PATCH", path, body, ...options }, schema),
  /** Operaciones sin cuerpo de respuesta (204). */
  send: (
    method: Exclude<HttpMethod, "GET">,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) => readNothing({ method, path, body, ...options }),
};
