import { Alert } from "@/core/ui";
import { describeError } from "../errors";
import { strings } from "../strings";

/** Alerta de error de una escritura: mensaje del servidor en español y código de soporte si fue inesperado. */
export function FormAlert({
  error,
  fallback = strings.common.saveError,
}: {
  error: unknown;
  fallback?: string;
}) {
  if (!error) return null;
  const shown = describeError(error, fallback);
  return (
    <Alert variant="error" message={shown.message} supportCode={shown.traceId} />
  );
}
