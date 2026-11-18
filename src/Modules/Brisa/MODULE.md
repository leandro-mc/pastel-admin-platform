# Brisa — ficha técnica (backend)

Estado: **en construcción** (MVP en `feat/brisa-mvp`). Hecho: regla de fechas, persistencia, API de pendientes (crear, modificar, marcar, eliminar, deshacer, ajustes) e importación. Detalle y lo no verificado: `docs/progress/BRISA.md`.

- Código: `brisa` · esquema de base de datos `brisa` · API `/api/brisa` · proyecto `Pastel.Modules.Brisa`.
- Producto: `docs/modules/BRISA.md` (fuente de verdad funcional). Frontend: `web/src/modules/brisa/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `brisa.access` | Entrar al módulo y leer sus propios pendientes y ajustes |
| `brisa.items.manage` | Crear, editar, marcar, eliminar y deshacer sobre **sus propios** pendientes |

Las escrituras exigen ambos permisos. Rol sugerido: `Brisa — Usuario` (ambos). `Administrator` no recibe los permisos de esta app (solo `Owner/Superuser`); ver `docs/SECURITY.md`.

## Regla de fechas (`Domain/TaskRules.cs`)

Port de `docs/requirements/brisa/prototype/logic.js` (inventario §13.1–§13.4). **Pura**: recibe «hoy» y la zona de la persona.

- **Día efectivo derivado:** `ScheduledDate` nunca se reescribe; se calcula. Abierta → referencia = hoy; hecha → día local de `CompletedAt` (si es nulo, queda en su día asignado). Sin fecha límite nunca se mueve; con ella avanza cada día hasta la fecha límite y luego queda ahí, vencida.
- **«Vencida»** (dos criterios): abierta y, con fecha límite, esa fecha ya pasó; sin ella, su día efectivo ya pasó.
- **Validación:** `día ≤ fecha límite` (se compara el día elegido o el guardado, no el efectivo); título ≤ 150 y notas ≤ 2000 tras recortar, sin truncar; color `#RRGGBB`; fechas `aaaa-mm-dd` estrictas.
- **«Hoy»** sale de la zona IANA de la persona (`PersonContext`; por defecto `America/Costa_Rica`), nunca de la del servidor.

## Endpoints (`/api/brisa`)

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /tasks?page&pageSize&updatedSince` | `access` | Paginado (≤ 100), orden `UpdatedAt`. Sin `updatedSince`: no eliminadas. Con él: lo cambiado desde entonces, **incluidas** las eliminadas (`deletedAt`) |
| `POST /tasks` | `access` + `manage` | 201. Alta rápida: basta `title`; día = hoy, prioridad Media, color al azar de la paleta |
| `PUT /tasks/{id}` | `access` + `manage` | Reemplazo completo; `version` obligatoria (409 si cambió) |
| `PUT /tasks/{id}/completed` | `access` + `manage` | Cuerpo `{ completed }` (estado pedido, no alternancia). `CompletedAt` lo fija el servidor. Devuelve `{ task, undoId }` |
| `POST /tasks/{id}/delete` | `access` + `manage` | Eliminación lógica (es `POST` porque la respuesta lleva cuerpo y es deshacible). Devuelve `{ taskId, undoId }` |
| `POST /undo/{undoId}` | `access` + `manage` | Deshacer seguro (BR-19), ver abajo |
| `GET` / `PUT /settings` | `access` / + `manage` | `{ timeZoneId, today }`; la zona se valida contra la base IANA |
| `POST /import` | `access` + `manage` | Cuerpo `{ content, dryRun }`. Vista previa o definitivo; ver «Importación» |
| `GET /import` | `access` | Últimos 10 lotes de la persona |
| `POST /import/{batchId}/revert` | `access` + `manage` | Revierte un lote; devuelve `{ reverted, kept }` |

Cada tarea sale con `effectiveDate` (calculado), `isOverdue`, `version` (`xmin`) y los campos de sincronización `updatedAt`/`deletedAt`. No hay búsqueda en el servidor: el cliente busca (sin tildes ni mayúsculas) sobre las tareas propias que ya cargó.

## Deshacer seguro (BR-19)

Cada marcar/reabrir y cada eliminar guarda en `task_undos` el estado anterior (hecha, `CompletedAt`, `DeletedAt`) y el `UpdatedAt` posterior. `POST /undo/{id}` (transacción serializable): restaura **solo esos tres campos**, sin recalcular; 409 `brisa.undo.stale` si `UpdatedAt` cambió después; 409 `brisa.undo.used` si ya se usó. Las reversiones de más de un día se podan al crear nuevas.

## Importación (BR-14, inventario §9)

Acepta el arreglo crudo de `tasks_json` o el sobre `{ "format": "brisa-export", "version": 1, "tasks": [...] }` (`Domain/ImportParser.cs`, puro).

- **Todo o nada:** cualquier registro inválido rechaza el lote y se informa fila, campo y motivo (`accepted: false`, nada se crea). Única tolerancia: prioridad desconocida → Media con aviso.
- **Sin duplicar** por `(OwnerId, Id)`: id existente con contenido igual → «ya existente»; con contenido distinto o eliminada → se **omite** y se informa; nunca se sobrescribe. Los ids del archivo se conservan.
- **Vista previa** (`dryRun: true`): totales (registros, abiertas, hechas, con fecha límite, rango de días) sin escribir.
- Los datos entran **tal cual** (sin reprogramar); `CompletedAt` queda nulo; `createdAt` (ms UTC) se conserva o, si falta, se usa el momento de la importación con aviso.
- **Reversión:** cada lote guarda su id en las tareas. Revertir borra de forma lógica solo las que **no se tocaron** desde la importación (`UpdatedAt` igual al instante del lote); las editadas después se conservan y se cuentan en `kept`. Un lote se revierte una sola vez.
- «Respaldo previo» del inventario §9.4.4: la importación nunca modifica tareas existentes y es reversible, así que no hay copia aparte que restaurar.

## Datos (esquema `brisa`)

- `tasks`: clave `(OwnerId, Id)` — toda consulta por id exige el dueño, así que un id ajeno es 404 —; `ScheduledDate`/`DueDate` son `date`; `CreatedAt`/`UpdatedAt`/`CompletedAt`/`DeletedAt` `timestamptz`; `Version` = `xmin`; `ImportBatchId` para revertir lotes.
- `settings` (zona por persona), `task_undos`, `import_batches`. Sin claves foráneas.
- Migración `AddBrisaTasks` escrita a mano (sin SDK en el entorno de desarrollo): **Build debe regenerarla con `dotnet ef` y comparar** (`Persistence/BrisaDbContextFactory.cs`).

## Códigos de error

Los mensajes usan **tuteo** (regla propia de Brisa, `docs/modules/BRISA.md` §7).

| Código | Estado | Cuándo |
|---|---|---|
| `brisa.resource.not_found` / `brisa.task.not_found` | 404 | No existe o es de otra persona |
| `brisa.task.title_required` / `title_too_long` / `notes_too_long` | 400 | Título vacío o > 150; notas > 2000 |
| `brisa.task.date_invalid` / `due_invalid` / `color_invalid` / `priority_invalid` | 400 | Formato inválido |
| `brisa.task.day_after_deadline` | 400 | El día es posterior a la fecha límite |
| `brisa.task.version_required` | 400 | Falta la versión al modificar |
| `brisa.task.changed` | 409 | La tarea cambió mientras se editaba |
| `brisa.undo.not_found` / `used` / `stale` | 404 / 409 / 409 | Reversión inexistente, ya usada o tarea cambiada después |
| `brisa.settings.timezone_invalid` | 400 | Zona horaria desconocida |
| `brisa.import.not_found` / `already_reverted` | 404 / 409 | Lote inexistente o ya revertido |

## Pruebas

`Pastel.Modules.Brisa.Tests/TaskRulesTests.cs` (regla de fechas y validación), `ImportParserTests.cs` (importación con el archivo de §9.5) y `tests/Pastel.IntegrationTests/QA/BrisaApiTests.cs` (permisos 401/403, aislamiento, borrado lógico, `updatedSince`, 409 e importación). Se escriben pero no se ejecutan hasta que el propietario lo pida (`AGENTS.md` §4).

## Pendiente

Prueba esencial 3 (idempotencia con Guid de cliente): contradice §3 de la ficha y espera decisión del propietario (`docs/progress/BRISA.md`).
