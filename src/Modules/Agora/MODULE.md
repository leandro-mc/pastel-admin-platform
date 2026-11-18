# Ágora — ficha técnica (backend)

Estado: **marcador** (esqueleto generado por `tools/new-module`; sin funcionalidad de producto todavía).

- Código: `agora` · esquema de base de datos `agora` · API `/api/agora` · proyecto `Pastel.Modules.Agora`.
- Producto: `docs/modules/AGORA.md` (fuente de verdad funcional). Frontend: `web/src/modules/agora/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `agora.access` | Entrar al panel editorial (lo público no requiere permiso) |
| `agora.content.manage` | Autor: crear, editar, publicar y despublicar piezas; categorías, series, fuentes, videos y noticias enlazadas |
| `agora.content.review` | Revisor: verificar una pieza o retirar la verificación, con nota |
| `agora.saved.manage` | Persona registrada: guardar piezas y seguir categorías |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Ágora — Autor`: `agora.access`, `agora.content.manage`
- `Ágora — Revisor`: `agora.access`, `agora.content.review`

El rol `Administrator` no recibe los permisos de esta app al sincronizar el catálogo (solo `Owner/Superuser`); ver `docs/SECURITY.md`.

## Reglas de servidor (de la ficha)

- Las rutas públicas se marcan con `AllowAnonymousExplicit()` y llevan límite de tasa.
- Quien edita una pieza no puede otorgarse su propia verificación (regla del servidor).
- No hay moderación, comentarios, foros ni aprobación previa en el MVP: el autor publica directo; el sello «Verificado» lo da un revisor.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/agora/ping` | `agora.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `agora` (tablas en snake_case, ids Guid v7 asignados por el servidor, fechas en UTC, sin claves foráneas hacia otros esquemas). `AgoraDbContext` usa `HasDefaultSchema("agora")` y su historial vive en `agora.__EFMigrationsHistory`.

| Tabla | Contenido |
|---|---|
| `categories`, `series`, `tags`, `article_tags` | Taxonomía de las piezas |
| `articles` | Pieza: titular, «En 20 segundos», tipo (`Facts`/`Analysis`/`Opinion`), «Se sabe / No se sabe / Por qué importa», cuerpo Markdown ya sanitizado, estado (`Draft`/`Published`/`Archived`), `SubstantiveVersion`, `DailyPickOrder` (1 a 5, «Hoy en 5 minutos») y `xmin` como token de concurrencia |
| `article_contributors` | Quién escribió o editó la pieza (no puede verificarla) |
| `sources`, `video_embeds`, `corrections` | Fuentes, video (solo el id de YouTube) y correcciones visibles |
| `verifications` | Revisión de una persona: alcance, nota, estado (`Active`/`Withdrawn`) y versión sustantiva que avaló |
| `news_links` | Noticias enlazadas con contexto propio |
| `saved_articles`, `followed_categories`, `reactions`, `error_reports` | Interacción de personas registradas |

Migraciones: `InitialAgoraSchema` (esquema vacío) y `AddAgoraContentModel` (todas las tablas).
**Por verificar:** `AddAgoraContentModel`, su `Designer` y el `ModelSnapshot` se escribieron a mano (el entorno de desarrollo no tenía `dotnet`). Antes de integrar, Build debe ejecutar `dotnet ef migrations has-pending-model-changes` (o regenerarla con `dotnet ef migrations add`) y aplicarla a una base real.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `agora.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
