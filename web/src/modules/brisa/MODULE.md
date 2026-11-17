# Brisa — ficha técnica (frontend)

Estado: **en construcción** (MVP en `feat/brisa-mvp`). Hecho: reglas de fechas y calendario (`domain/`). Pendiente: capa de datos, pantallas e importación.

- Código `brisa` · ruta `/brisa` · icono `ListChecks` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; permiso `brisa.access`.
- Backend: `src/Modules/Brisa/MODULE.md`. Producto: `docs/modules/BRISA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos) · `pages/` (una página por ruta; exportan `Component`).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Reglas de fechas (`domain/`)

- `dates.ts`: port de `docs/requirements/brisa/prototype/logic.js` y espejo de `Domain/TaskRules.cs` del backend. Funciones puras: día efectivo, «vencida» (dos criterios), órdenes de Vencidas y Fechas límite, validación (`día ≤ fecha límite`, 150/2000), búsqueda sin tildes y plurales. El servidor calcula el día efectivo al responder; el cliente lo **recalcula** con la misma regla para actualizar «hoy» a medianoche sin recargar.
- `calendar.ts`: semana de lunes a domingo, cuadrícula del mes y formato en español («Sábado 17 de octubre», «17 oct», «Octubre 2026»), escrito a mano para que no dependa del navegador.
- «Hoy» sale siempre de la zona IANA de la persona (`todayInZone`), nunca de la del navegador.
- Pruebas: `web/tests/components/brisa-dates.test.ts` (vectores V1–V10, AC1–AC7, zona con horario de verano, órdenes, validación, búsqueda, calendario).

## Rutas

| Ruta | Página |
|---|---|
| `/brisa` | `pages/HomePage.tsx` (marcador) |

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
