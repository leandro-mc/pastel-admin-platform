import { identityStrings } from "../strings";
import { errorAlert } from "../styles";
import type { ShownError } from "../errors";

/** Aviso de error de un formulario: el mensaje y, si existe, el código de soporte. */
export function FormAlert({ error }: { error: ShownError | null }) {
  if (!error) return null;
  return (
    <div role="alert" className={errorAlert}>
      <p>{error.message}</p>
      {error.traceId ? (
        <p className="mt-1 text-xs text-muted">
          {identityStrings.supportCode}: <code>{error.traceId}</code>
        </p>
      ) : null}
    </div>
  );
}
