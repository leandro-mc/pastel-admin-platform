import { useId, type ComponentProps, type ReactNode } from "react";
import { isApiError } from "@/core/api";
import { Alert, StateView } from "@/core/ui";
import { inputClass, labelClass } from "@/core/ui/styles";
import { strings } from "../strings";

type TextAreaProps = Omit<ComponentProps<"textarea">, "className"> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Área de texto con etiqueta visible, ayuda y error asociados (el kit común aún no trae una). */
export function TextAreaField({
  label,
  hint,
  error,
  rows = 5,
  ...rest
}: TextAreaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hintId, errorId].filter(Boolean).join(" ") || undefined
        }
        className={`${inputClass} min-h-24 py-2 leading-relaxed`}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Mensaje de un error de la API: el texto del servidor si es esperable, el genérico si no. */
export function ErrorNotice({
  error,
  fallback,
}: {
  error: unknown;
  fallback?: string;
}) {
  if (!error) return null;
  // 503 es un fallo esperable con mensaje propio (motor de PDF o proveedor de IA no disponible).
  const known =
    isApiError(error) &&
    (error.status < 500 || error.status === 503) &&
    !error.isNetwork;
  // Si es una validación, el motivo concreto por campo (p. ej. el tope de versiones) en vez de «Revise los campos marcados».
  const fields = known && isApiError(error) ? Object.values(error.errors).flat() : [];
  const message =
    known && isApiError(error)
      ? fields.length > 0
        ? fields.join(" ")
        : error.detail
      : (fallback ?? strings.common.loadFailed);
  return (
    <Alert
      variant="error"
      message={message}
      supportCode={isApiError(error) ? error.traceId : undefined}
      supportCodeLabel="Código de soporte"
    />
  );
}

/** Primer mensaje de validación de un campo (`items[0].role`, `links[1].url`…). */
export function fieldError(error: unknown, path: string): string | undefined {
  return isApiError(error) ? error.errors[path]?.[0] : undefined;
}

type Query<T> = {
  isPending: boolean;
  isError: boolean;
  data: T | undefined;
  refetch: () => unknown;
};

/** Estados de carga y error de una consulta; entrega los datos ya cargados. */
export function Loaded<T>({
  query,
  children,
}: {
  query: Query<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return <StateView status="loading" title={strings.common.loading} />;
  }
  if (query.isError || query.data === undefined) {
    return (
      <StateView
        status="error"
        title={strings.common.loadFailed}
        action={
          <button
            type="button"
            className="text-sm font-medium text-accent-strong underline"
            onClick={() => void query.refetch()}
          >
            {strings.common.retry}
          </button>
        }
      />
    );
  }
  return <>{children(query.data)}</>;
}
