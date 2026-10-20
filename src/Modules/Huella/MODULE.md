# Huella — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `huella` · esquema de base de datos `huella` · API `/api/huella` · proyecto `Pastel.Modules.Huella`.
- Producto: `docs/modules/HUELLA.md` (fuente de verdad funcional). Frontend: `web/src/modules/huella/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `huella.access` | Entrar al panel de edición (las rutas públicas no requieren permiso) |
| `huella.profile.manage` | Editar, previsualizar y publicar su propio perfil |

No hay rol sugerido `Huella — Propietario`. Los permisos `huella.access` y `huella.profile.manage` se conceden únicamente al rol de sistema `Owner/Superuser` desde `CatalogSyncTask`; no se conceden por rol personalizado ni excepción individual. `Administrator` general no recibe permisos `huella.*` ni permisos de negocio de las apps.

## Reglas de servidor (de la ficha)

- La única ruta pública será `/huella/p/:token`; es anónima, requiere un token aleatorio de alta entropía y tiene límite de tasa.
- El modelo almacena únicamente el hash del token. Regenerar el enlace rota el token y revoca el anterior.
- Perfil público: `noindex,nofollow,noarchive` en meta robots y `X-Robots-Tag`; no confiar únicamente en `robots.txt`.
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

El módulo sigue siendo un esqueleto sin tablas de dominio ni funcionalidad de perfil. Faltan la entidad Profile ligada al OwnerUserId, snapshot de publicación, token/hash, flujo de regeneración/revocación, ruta HTML pública, cabeceras/meta noindex y pruebas de seguridad según `docs/modules/HUELLA.md`.
