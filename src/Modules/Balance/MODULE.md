# Balance — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `balance` · esquema de base de datos `balance` · API `/api/balance` · proyecto `Pastel.Modules.Balance`.
- Producto: `docs/modules/BALANCE.md` (fuente de verdad funcional). Frontend: `web/src/modules/balance/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `balance.access` | Entrar al módulo (hub y router) |
| `balance.groups.manage` | Gestionar los grupos de los que la persona forma parte |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Balance — Usuario`: `balance.access`, `balance.groups.manage`

El rol `Administrator` recibe todos los permisos al sincronizar el catálogo.

## Reglas de servidor (de la ficha)

- Una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor).
- Los roles dentro de un grupo (administrador del grupo, miembro) son datos del dominio de Balance, no roles de plataforma.
- El nombre anterior «SaldApp» no se usa en código ni interfaz. Inventario y decisiones de migración: `docs/migration/balance-inventory.md` (está en la rama `docs/balance-inventory`, aún sin integrar).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/balance/ping` | `balance.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `balance` sin tablas. `BalanceDbContext` usa `HasDefaultSchema("balance")` y su historial de migraciones vive en `balance.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/BalanceDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `balance.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
