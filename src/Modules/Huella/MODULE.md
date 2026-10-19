# Huella — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `huella` · esquema de base de datos `huella` · API `/api/huella` · proyecto `Pastel.Modules.Huella`.
- Producto: `docs/modules/HUELLA.md` (fuente de verdad funcional). Frontend: `web/src/modules/huella/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `huella.access` | Entrar al panel de edición (las rutas públicas no requieren permiso) |
| `huella.profile.manage` | Editar, previsualizar y publicar su propio perfil |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Huella — Propietario`: `huella.access`, `huella.profile.manage`

El rol `Administrator` recibe todos los permisos al sincronizar el catálogo.

## Reglas de servidor (de la ficha)

- Las rutas públicas del perfil son anónimas (`AllowAnonymousExplicit()`) con límite de tasa.
- Un propietario solo accede a su perfil (filtro por `OwnerUserId` en el servidor).
- La administración de Pastel da soporte técnico pero no edita el contenido ordinario; sus acciones privilegiadas se auditan.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/huella/ping` | `huella.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `huella` sin tablas. `HuellaDbContext` usa `HasDefaultSchema("huella")` y su historial de migraciones vive en `huella.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/HuellaDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `huella.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
