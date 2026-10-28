# Cosecha — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `cosecha` · ruta `/cosecha` · icono `Sprout` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; permiso `cosecha.access`.
- Backend: `src/Modules/Cosecha/MODULE.md`. Producto: `docs/modules/COSECHA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Página |
|---|---|
| `/cosecha` | `pages/HomePage.tsx` (marcador) |

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
