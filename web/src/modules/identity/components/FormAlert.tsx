import { Alert } from "@/core/ui";
import type { ShownError } from "../errors";
import { identityStrings } from "../strings";

/** Aviso de error de formulario con el mensaje y código de soporte disponibles. */
export function FormAlert({ error }: { error: ShownError | null }) {
  if (!error) return null;
  return (
    <Alert
      variant="error"
      message={error.message}
      supportCode={error.traceId}
      supportCodeLabel={identityStrings.supportCode}
    />
  );
}
