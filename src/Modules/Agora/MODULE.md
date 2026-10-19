# Ágora — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`). Sin funcionalidad de producto todavía.

- Código: `agora` · esquema de base de datos `agora` · API `/api/agora` · proyecto `Pastel.Modules.Agora`.
- Ficha de producto: `docs/modules/AGORA.md`. Frontend: `web/src/modules/agora/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `agora.access` | Entrar al módulo (hub y router) |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben): `Ágora — Usuario`.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/agora/ping` | `agora.access` | Comprobación del esqueleto |

## Datos

Esquema `agora`, sin tablas. La migración inicial la genera Build con `dotnet ef` (ver `AgoraDbContextFactory`).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `agora.resource.not_found` | 404 | El recurso pedido no existe |

## Eventos de log

Rango de `EventId` reservado: ver `docs/ERROR_HANDLING_AND_LOGGING.md` §4.2.

## Pendiente

Todo lo funcional de la ficha de producto.
