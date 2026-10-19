# Huella — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `huella` · ruta `/huella` · icono `Footprints` (Lucide) · color por `data-module="huella"` (valores en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `public`; permiso `huella.access`.
- Backend: `src/Modules/Huella/MODULE.md`. Producto: `docs/modules/HUELLA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Página |
|---|---|
| `/huella` | `pages/HomePage.tsx` (marcador) |

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
