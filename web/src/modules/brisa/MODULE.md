# Brisa — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `brisa` · ruta `/brisa` · icono `ListChecks` (Lucide) · color por `data-module="brisa"` (valores en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; permiso `brisa.access`.
- Backend: `src/Modules/Brisa/MODULE.md`. Producto: `docs/modules/BRISA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Página |
|---|---|
| `/brisa` | `pages/HomePage.tsx` (marcador) |

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
