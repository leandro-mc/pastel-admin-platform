# Brisa — ficha técnica (backend)

Estado: **en construcción** (MVP en `feat/brisa-mvp`). Hecho: regla de fechas y validación (`Domain/TaskRules.cs`). Pendiente: persistencia, API e importación.

- Código: `brisa` · esquema de base de datos `brisa` · API `/api/brisa` · proyecto `Pastel.Modules.Brisa`.
- Producto: `docs/modules/BRISA.md` (fuente de verdad funcional). Frontend: `web/src/modules/brisa/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `brisa.access` | Entrar al módulo (hub y router) |
| `brisa.items.manage` | Crear y editar **sus propios** pendientes |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Brisa — Usuario`: `brisa.access`, `brisa.items.manage`

El rol `Administrator` no recibe los permisos de esta app al sincronizar el catálogo (solo `Owner/Superuser`); ver `docs/SECURITY.md`.

## Reglas de servidor (de la ficha)

- Cada persona ve y modifica solo sus pendientes (filtro por usuario en el servidor).
- Diseño preparado para sincronización móvil futura (no se implementa ahora): `UpdatedAt`, borrado lógico (`DeletedAt`), token de concurrencia y escrituras idempotentes con identificador de cliente (`docs/ARCHITECTURE.md` §5 y §7).
- No se agrega compartir ni grupos sin decisión del propietario; el inventario funcional es `docs/requirements/brisa/INVENTARIO-BRISA.md`.

## Regla de fechas (`Domain/TaskRules.cs`)

Port de `docs/requirements/brisa/prototype/logic.js` (inventario §13.1–§13.4). Es **pura** (sin base de datos ni reloj): recibe «hoy» y la zona de la persona.

- **Día efectivo derivado:** `ScheduledDate` nunca se reescribe; se calcula. Abierta → referencia = hoy; hecha → día local de `CompletedAt` (si es nulo, queda en su día asignado). Sin fecha límite nunca se mueve; con ella avanza cada día hasta la fecha límite y luego queda ahí, vencida.
- **«Vencida»** (dos criterios): abierta y, con fecha límite, esa fecha ya pasó; sin ella, su día efectivo ya pasó.
- **Validación:** `día ≤ fecha límite` (se compara el día elegido o el guardado, no el efectivo); título ≤ 150 y notas ≤ 2000 tras recortar, sin truncar; color `#RRGGBB`; fechas `aaaa-mm-dd` estrictas.
- **«Hoy»** sale de la zona IANA de la persona (por defecto `America/Costa_Rica`), nunca de la del servidor.

Pruebas: `Pastel.Modules.Brisa.Tests/TaskRulesTests.cs` (vectores V1–V10, AC1–AC7, casos de paridad, frontera de zona con y sin horario de verano).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/brisa/ping` | `brisa.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `brisa` sin tablas. `BrisaDbContext` usa `HasDefaultSchema("brisa")` y su historial de migraciones vive en `brisa.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/BrisaDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

Los mensajes usan **tuteo** (regla propia de Brisa, `docs/modules/BRISA.md` §7).

| Código | Estado | Cuándo |
|---|---|---|
| `brisa.resource.not_found` | 404 | El recurso pedido no existe |
| `brisa.task.title_required` / `title_too_long` / `notes_too_long` | 400 | Título vacío o > 150; notas > 2000 |
| `brisa.task.date_invalid` / `due_invalid` / `color_invalid` | 400 | Día, fecha límite o color con formato inválido |
| `brisa.task.day_after_deadline` | 400 | El día de la tarea es posterior a su fecha límite |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
