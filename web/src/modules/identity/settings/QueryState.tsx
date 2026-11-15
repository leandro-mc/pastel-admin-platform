import type { ReactNode } from "react";
import { describeError } from "../errors";
import { FormAlert } from "../components/FormAlert";
import { secondaryButton } from "../styles";
import { settingsStrings } from "./strings";

const t = settingsStrings.common;

type Props = {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
};

/** Estados de carga y error de una consulta; si hay datos, muestra el contenido. El vacío lo decide cada pantalla. */
export function QueryState({ isPending, error, onRetry, children }: Props) {
  if (isPending) {
    return (
      <p role="status" className="p-6 text-sm text-muted">
        {t.loading}
      </p>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <FormAlert error={describeError(error, t.loadError)} />
        <button type="button" onClick={onRetry} className={secondaryButton}>
          {t.retry}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
