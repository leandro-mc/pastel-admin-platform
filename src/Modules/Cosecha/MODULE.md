# Cosecha — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `cosecha` · esquema de base de datos `cosecha` · API `/api/cosecha` · proyecto `Pastel.Modules.Cosecha`.
- Producto: `docs/modules/COSECHA.md` (fuente de verdad funcional). Frontend: `web/src/modules/cosecha/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `cosecha.access` | Entrar al módulo |
| `cosecha.catalog.read` / `.manage` | Ver / gestionar catálogo |
| `cosecha.producers.read` / `.manage` | Ver / gestionar productores |
| `cosecha.buyers.read` / `.manage` | Ver / gestionar compradores |
| `cosecha.orders.read` / `.manage` | Ver / gestionar pedidos |
| `cosecha.orders.read.own` | Comprador: ver solo sus pedidos y el estado de sus envíos |
| `cosecha.shipments.read` / `.manage` | Ver / gestionar envíos, recepciones y entregas |
| `cosecha.settlements.read` / `.manage` | Ver / gestionar liquidaciones y pagos |
| `cosecha.reports.read` | Ver reportes |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Cosecha — Gestor`: todos los permisos excepto `cosecha.orders.read.own`
- `Cosecha — Comprador`: `cosecha.access`, `cosecha.orders.read.own`

El rol `Administrator` recibe todos los permisos al sincronizar el catálogo.

## Reglas de servidor (de la ficha)

- El comprador solo ve datos de los compradores vinculados a su `UserId` (filtro en el servidor).
- Productores sin cuenta en el MVP; su ficha admite un `UserId` opcional para un futuro rol productor (roles futuros: no implementar).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/cosecha/ping` | `cosecha.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `cosecha` sin tablas. `CosechaDbContext` usa `HasDefaultSchema("cosecha")` y su historial de migraciones vive en `cosecha.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/CosechaDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `cosecha.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
