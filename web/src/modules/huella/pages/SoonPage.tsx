import { Navigate, useParams } from "react-router";
import { PageHeader, Panel } from "@/core/ui";
import { strings } from "../strings";

const items = strings.soon.items;
type Slug = keyof typeof items;
const isSlug = (value: string | undefined): value is Slug =>
  value !== undefined && Object.hasOwn(items, value);

/** Marcador honesto de lo que viene: sin botones que no hagan nada. */
export function Component() {
  const { item } = useParams();
  // Las dos primeras pantallas «en preparación» ya existen con otro nombre: los enlaces viejos llegan a su lugar.
  if (item === "postulaciones") return <Navigate to="/huella/historial" replace />;
  if (item === "recomendacion") return <Navigate to="/huella/cv" replace />;
  if (!isSlug(item)) return <Navigate to="/huella/banco" replace />;
  const info = items[item];
  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        eyebrow={strings.soon.title}
        title={info.title}
        description={strings.soon.description}
      />
      <Panel title={info.title}>
        <p className="text-sm text-fg-secondary">{info.text}</p>
      </Panel>
    </div>
  );
}
