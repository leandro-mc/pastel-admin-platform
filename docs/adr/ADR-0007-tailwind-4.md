# ADR-0007 — Tailwind CSS 4 y estilos gobernados

- Estado: decisión aprobada; Build debe ejecutar auditorías sobre el SHA vigente.
- Contexto: la migración de estilo no debe simplificar ni degradar una interfaz trabajada.

## Decisión
Se usa Tailwind CSS 4 con integración `@tailwindcss/vite` y una entrada CSS-first en `web/src/core/design/tailwind.css`. Las utilidades de layout, espacio, responsive y estados viven en JSX. Los tokens son la fuente única de color; CSS de componentes se reserva para composiciones de marca/editoriales aprobadas y se mantiene acotado. `@apply` no se permite fuera de `core/design/base.css`.

## Consecuencias
Las utilidades deben cubrir al menos el 95 % de los atributos `className` según la auditoría del proyecto; el CSS de componentes se limita a 400 líneas por archivo y las clases semánticas deben estar en uso. La aprobación visual requiere comparar referencias reales, no solo revisar la salida de Vite.

## Referencias
`docs/DESIGN_SYSTEM.md` y `scripts/tailwind-audit.mjs`.
