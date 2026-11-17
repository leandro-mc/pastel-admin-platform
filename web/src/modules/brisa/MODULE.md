# Brisa — ficha técnica (frontend)

Estado: **en construcción** (MVP en `feat/brisa-mvp`). Hecho: reglas de fechas, capa de datos, Semana, Mes, Vencidas, Fechas límite, editor, búsqueda, «Deshacer», Importar y Configuración. Lo no verificado: `docs/progress/BRISA.md`.

- Código `brisa` · ruta `/brisa` · icono `ListChecks` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`; no se tocan).
- Acceso en el manifiesto: `permission`; permiso `brisa.access`. Escrituras: el servidor exige además `brisa.items.manage`.
- Backend: `src/Modules/Brisa/MODULE.md`. Producto: `docs/modules/BRISA.md` (§7: tuteo, tarjetas oscuras al 28 %, «Deshacer»).

## Estructura

| Carpeta | Contenido |
|---|---|
| `manifest.ts` | Rutas y menú (`virtual:pastel-modules`) |
| `strings.ts` | **Todos** los textos, en tuteo; también paleta de 10 colores y estilo de prioridades |
| `domain/` | `dates.ts` (regla del día efectivo, vencida, órdenes, validación, búsqueda) y `calendar.ts` (semana, mes, formato en español). Funciones puras |
| `api/` | `schemas.ts` (zod), `keys.ts`, `queries.ts`, `mutations.ts` (TanStack Query; actualizan la caché con la respuesta) |
| `state/` | `useToday` (hoy en la zona de la persona, se recalcula a medianoche), `useFocusDate` (día enfocado persistente), `BrisaContext`, `errors.ts` |
| `components/` | `BrisaFrame` (carga, estados, editor, aviso, búsqueda, botón flotante), vistas, `TaskCard`, `TaskEditor`, `UndoBar`, `SearchPanel` |
| `pages/` | Una página por ruta; exportan `Component` y solo componen `BrisaFrame` + vista |

Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Pantalla |
|---|---|
| `/brisa` | Semana: 7 columnas (lunes–domingo), HOY marcado, día enfocado, abiertas y HECHAS, «+» por día |
| `/brisa/mes` | Mes: cuadrícula L M X J V S D con conteo; elegir un día lo abre en Semana |
| `/brisa/vencidas` | «Pendientes atrasados», con «PROGRAMADA PARA» |
| `/brisa/fechas-limite` | Abiertas antes que hechas, por vencimiento |
| `/brisa/importar` | Importar un archivo JSON: vista previa con totales, confirmar, revertir y lotes recientes (todo o nada) |
| `/brisa/configuracion` | Zona horaria (define «hoy»), tema y tamaño de texto de la plataforma |

## Decisiones

- **Día efectivo:** el servidor lo calcula al responder y el cliente lo recalcula con la misma regla (`domain/dates.ts`), así que a medianoche todo se reubica sin recargar ni escribir nada.
- **Editor:** foco en el título, «Enter» guarda, confirma al cerrar **solo si hay texto**. «Día asignado» muestra el día efectivo, pero se envía el `scheduledDate` guardado salvo que la persona lo cambie; la validación `día ≤ fecha límite` usa ese día.
- **Color de tarjeta:** claro = el color pastel; oscuro = `color-mix` al 28 % con `--surface` (sin tokens nuevos).
- **Estado y prioridad** nunca solo con color: icono + texto y punto + texto.
- **Búsqueda** en el cliente (sin tildes ni mayúsculas) sobre las tareas propias ya cargadas.
- **«Deshacer»:** aviso de 8 s; la reversión la hace el servidor (`POST /api/brisa/undo/{id}`) y puede responder 409 si la tarea cambió.
- **Vista y día enfocado** sobreviven a una recarga con `localStorage` (sin datos en la URL); en un día nuevo se enfoca hoy.
- **Importar:** el archivo se lee en el navegador y se envía como texto; primero `dryRun` (vista previa, no escribe), luego el definitivo. El servidor valida todo; aquí solo se muestran fila, campo y motivo. Revertir confirma antes y avisa cuántas tareas se conservaron por haberse editado.
- **Errores:** los códigos `brisa.*` traen su mensaje en tuteo del servidor; red y errores inesperados usan `strings.errors` (los de la plataforma tratan de usted).

## Pruebas

`web/tests/components/brisa-dates.test.ts` (vectores V1–V10, AC1–AC7, zona con horario de verano, órdenes de Vencidas y Fechas límite, validación, búsqueda, calendario). Se escriben pero no se ejecutan hasta que el propietario lo pida (`AGENTS.md` §4).

## Pendiente y límites conocidos

- Tema «Del sistema» (BR-12): la plataforma solo tiene Claro/Oscuro; añadirlo exige cambiar `core/preferences` (zona compartida). Hoy la primera visita sigue `prefers-color-scheme`.
- Contador de Vencidas en el menú lateral: el manifiesto no admite contadores; el número va en la pantalla.
- «Restablecer demo» de la configuración del prototipo no es del producto.
