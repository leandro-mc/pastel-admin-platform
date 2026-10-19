# Brisa — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`). Sin funcionalidad de producto todavía.

- Código: `brisa` · esquema de base de datos `brisa` · API `/api/brisa` · proyecto `Pastel.Modules.Brisa`.
- Ficha de producto: `docs/modules/BRISA.md`. Frontend: `web/src/modules/brisa/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `brisa.access` | Entrar al módulo (hub y router) |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben): `Brisa — Usuario`.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/brisa/ping` | `brisa.access` | Comprobación del esqueleto |

## Datos

Esquema `brisa`, sin tablas. La migración inicial la genera Build con `dotnet ef` (ver `BrisaDbContextFactory`).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `brisa.resource.not_found` | 404 | El recurso pedido no existe |

## Eventos de log

Rango de `EventId` reservado: ver `docs/ERROR_HANDLING_AND_LOGGING.md` §4.2.

## Pendiente

Todo lo funcional de la ficha de producto.
