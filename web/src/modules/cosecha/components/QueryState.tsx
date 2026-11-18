import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StateView } from "@/core/ui";
import { Button } from "@/core/ui";
import { describeError } from "../errors";
import { strings } from "../strings";

type Props<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
};

/** Carga, error con reintento y contenido de una consulta. El vacío lo decide cada pantalla. */
export function QueryState<T>({ query, children }: Props<T>) {
  if (query.isPending) {
    return <StateView status="loading" title={strings.common.loading} />;
  }
  if (query.isError) {
    const shown = describeError(query.error, strings.common.loadError);
    return (
      <StateView
        status="error"
        title={strings.common.loadError}
        description={shown.message}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {strings.common.retry}
          </Button>
        }
      />
    );
  }
  return <>{children(query.data)}</>;
}
