# Huella — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`). Sin funcionalidad de producto todavía.

- Código: `huella` · esquema de base de datos `huella` · API `/api/huella` · proyecto `Pastel.Modules.Huella`.
- Ficha de producto: `docs/modules/HUELLA.md`. Frontend: `web/src/modules/huella/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `huella.access` | Entrar al módulo (hub y router) |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben): `Huella — Usuario`.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/huella/ping` | `huella.access` | Comprobación del esqueleto |

## Datos

Esquema `huella`, sin tablas. La migración inicial la genera Build con `dotnet ef` (ver `HuellaDbContextFactory`).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `huella.resource.not_found` | 404 | El recurso pedido no existe |

## Eventos de log

Rango de `EventId` reservado: ver `docs/ERROR_HANDLING_AND_LOGGING.md` §4.2.

## Pendiente

Todo lo funcional de la ficha de producto.
