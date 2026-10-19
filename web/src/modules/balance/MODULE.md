# Balance — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `balance` · ruta `/balance` · icono `Scale` (Lucide) · color por `data-module="balance"` (valores en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; permiso `balance.access`.
- Backend: `src/Modules/Balance/MODULE.md`. Producto: `docs/modules/BALANCE.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Página |
|---|---|
| `/balance` | `pages/HomePage.tsx` (marcador) |

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
