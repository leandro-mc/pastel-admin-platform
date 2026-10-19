import { messageForStatus } from "./messages";

/** Errores por campo, tal como los devuelve `problem+json` de validación: `{ campo: [mensajes] }`. */
export type FieldErrors = Record<string, string[]>;

export type ApiErrorInit = {
  status: number;
  code: string;
  detail: string;
  errors?: FieldErrors;
  traceId?: string;
  cause?: unknown;
};

/**
 * Modelo único de error de la API (`ERROR_HANDLING_AND_LOGGING.md` §3).
 * `status` 0 significa que no hubo respuesta (sin red o tiempo agotado).
 * `detail` viene del servidor en español; si el módulo tiene un texto para `code`, debe preferirlo.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly errors: FieldErrors;
  readonly traceId: string | undefined;

  constructor(init: ApiErrorInit) {
    super(init.detail, { cause: init.cause });
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.errors = init.errors ?? {};
    this.traceId = init.traceId;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
  get isValidation(): boolean {
    return this.status === 400 && Object.keys(this.errors).length > 0;
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
  get isUnavailable(): boolean {
    return this.status === 503;
  }
  /** Fallos que justifican mostrar la pantalla de error con código de soporte. */
  get isUnexpected(): boolean {
    return this.status >= 500 && this.status !== 503;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asFieldErrors(value: unknown): FieldErrors {
  const record = asRecord(value);
  if (!record) return {};
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(record)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter(
        (m): m is string => typeof m === "string",
      );
    }
  }
  return result;
}

/** Convierte una respuesta no exitosa (`problem+json`) en `ApiError`. Nunca lanza. */
export async function problemFromResponse(
  response: Response,
): Promise<ApiError> {
  let body: Record<string, unknown> | null = null;
  try {
    body = asRecord(await response.json());
  } catch {
    // La respuesta no es JSON (por ejemplo, una página de error del proxy): se usa el texto genérico.
  }

  const detail =
    typeof body?.detail === "string" && body.detail.length > 0
      ? body.detail
      : messageForStatus(response.status);
  const code =
    typeof body?.code === "string"
      ? body.code
      : `platform.http_${response.status}`;
  const traceId =
    typeof body?.traceId === "string"
      ? body.traceId
      : (response.headers.get("X-Trace-Id") ?? undefined);

  return new ApiError({
    status: response.status,
    code,
    detail,
    errors: asFieldErrors(body?.errors),
    traceId,
  });
}
