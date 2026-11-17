import { Sprout } from "lucide-react";
import { strings } from "../strings";

/** Portada provisional del módulo; la reemplaza «Hoy» cuando esté la pantalla de envíos. */
export function Component() {
  return (
    <section
      data-module="cosecha"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
        <Sprout aria-hidden="true" className="size-8" />
      </span>
      <h1 className="text-2xl font-semibold text-fg">{strings.name}</h1>
      <p className="text-muted">{strings.tagline}</p>
    </section>
  );
}
