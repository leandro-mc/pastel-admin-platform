import { focusClass } from "@/core/ui/styles";

/*
 * Lenguaje visual de Huella (tokens en core/design/module-themes.css), una sola familia de color fría:
 *   petróleo sólido (--accent*) → lo que se puede hacer: botones principales, enlaces, foco, navegación y pestaña activas;
 *   tinte de petróleo (--hl*)   → lo que está elegido: la oferta con la que se trabaja, el tipo de documento, filtros;
 *   tinta (--text)              → el contenido.
 * Lo elegido se distingue de la acción por el valor (tinte claro con borde fuerte frente a relleno sólido) y de un
 * simple hover por el relleno: el hover solo oscurece el borde. Siempre se acompaña de un icono o texto: nunca se
 * comunica solo con color.
 */

/** Superficie marcada: la oferta seleccionada o la barra con la oferta de trabajo (borde doble sin mover el contenido). */
export const markedSurface = "border-[var(--hl-edge)] bg-[var(--hl-soft)] ring-1 ring-[var(--hl-edge)]";

/**
 * Tarjeta dentro de un panel (ofertas, documentos): un nivel más hundido que el panel blanco, para que cada elemento se
 * reconozca como grupo (región común) y sus botones blancos resalten. Sobre el fondo de la página se usa `pageCard`.
 */
export const nestedCard = "border-line bg-surface-sunken";

/** Tarjeta directamente sobre el fondo de la página (historial): superficie blanca con sombra suave. */
export const pageCard = "border-line bg-surface shadow-[var(--shadow-soft)]";

/** Etiqueta pequeña de lo elegido («Seleccionada»). */
export const markedBadge =
  "inline-flex items-center gap-1 rounded-full border border-[var(--hl-edge)] bg-[var(--hl)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hl-ink)]";

/** Opción tipo chip (filtros, «Qué generar»): marcada cuando está elegida. */
export const chipClass = (selected: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${focusClass} ${
    selected
      ? "border-[var(--hl-edge)] bg-[var(--hl)] text-[var(--hl-ink)] font-semibold"
      : "border-line-strong bg-surface text-fg-secondary hover:border-[var(--hl-edge)] hover:text-fg"
  }`;
