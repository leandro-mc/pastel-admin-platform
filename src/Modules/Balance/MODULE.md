# Balance — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`). Sin funcionalidad de producto todavía.

- Código: `balance` · esquema de base de datos `balance` · API `/api/balance` · proyecto `Pastel.Modules.Balance`.
- Ficha de producto: `docs/modules/BALANCE.md`. Frontend: `web/src/modules/balance/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `balance.access` | Entrar al módulo (hub y router) |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben): `Balance — Usuario`.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/balance/ping` | `balance.access` | Comprobación del esqueleto |

## Datos

Esquema `balance`, sin tablas. La migración inicial la genera Build con `dotnet ef` (ver `BalanceDbContextFactory`).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `balance.resource.not_found` | 404 | El recurso pedido no existe |

## Eventos de log

Rango de `EventId` reservado: ver `docs/ERROR_HANDLING_AND_LOGGING.md` §4.2.

## Pendiente

Todo lo funcional de la ficha de producto.
