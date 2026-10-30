# Brisa — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `brisa` · esquema de base de datos `brisa` · API `/api/brisa` · proyecto `Pastel.Modules.Brisa`.
- Producto: `docs/modules/BRISA.md` (fuente de verdad funcional). Frontend: `web/src/modules/brisa/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `brisa.access` | Entrar al módulo (hub y router) |
| `brisa.items.manage` | Crear y editar **sus propios** pendientes |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Brisa — Usuario`: `brisa.access`, `brisa.items.manage`

El rol `Administrator` recibe todos los permisos al sincronizar el catálogo.

## Reglas de servidor (de la ficha)

- Cada persona ve y modifica solo sus pendientes (filtro por usuario en el servidor).
- Diseño preparado para sincronización móvil futura (no se implementa ahora): `UpdatedAt`, borrado lógico (`DeletedAt`), token de concurrencia y escrituras idempotentes con identificador de cliente (`docs/ARCHITECTURE.md` §5 y §7).
- No se agrega compartir ni grupos sin decisión del propietario; el inventario funcional es `docs/migration/brisa-inventory.md` (está en la rama `docs/brisa-inventory`, aún sin integrar).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/brisa/ping` | `brisa.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `brisa` sin tablas. `BrisaDbContext` usa `HasDefaultSchema("brisa")` y su historial de migraciones vive en `brisa.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/BrisaDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `brisa.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
