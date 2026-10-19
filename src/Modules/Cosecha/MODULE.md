# Cosecha — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`). Sin funcionalidad de producto todavía.

- Código: `cosecha` · esquema de base de datos `cosecha` · API `/api/cosecha` · proyecto `Pastel.Modules.Cosecha`.
- Ficha de producto: `docs/modules/COSECHA.md`. Frontend: `web/src/modules/cosecha/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `cosecha.access` | Entrar al módulo (hub y router) |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben): `Cosecha — Usuario`.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/cosecha/ping` | `cosecha.access` | Comprobación del esqueleto |

## Datos

Esquema `cosecha`, sin tablas. La migración inicial la genera Build con `dotnet ef` (ver `CosechaDbContextFactory`).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `cosecha.resource.not_found` | 404 | El recurso pedido no existe |

## Eventos de log

Rango de `EventId` reservado: ver `docs/ERROR_HANDLING_AND_LOGGING.md` §4.2.

## Pendiente

Todo lo funcional de la ficha de producto.
