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
- **Sello** (`Domain/Seal.cs`, `SealCalculator`): «Verificado» exige tantas verificaciones vigentes de **personas distintas** para la **versión sustantiva actual** como `Agora:Verification:RequiredReviewers`; si no, «Modificada tras la verificación» (hubo verificaciones vigentes de una versión anterior) o «Pendiente de verificación». Una verificación retirada no cuenta.
- **Contenido sustantivo** (`SubstantiveContent.Fingerprint()`): titular, resumen, tipo, «Se sabe / No se sabe / Por qué importa», cuerpo y fuentes. Si cambia, `Article.SubstantiveVersion` sube. Etiquetas, categoría, serie y video no cuentan.
- **Separación de funciones** (`VerificationPolicy`): quien escribió o editó una pieza (`article_contributors`) no puede verificarla (403 `agora.verification.self`), con cualquier cantidad de revisores. Solo se verifican piezas publicadas y una persona verifica una versión una sola vez.
- **Markdown** (`MarkdownSanitizer`): sin HTML crudo, sin scripts ni imágenes remotas, solo enlaces `http`, `https`, `mailto` o ancla. El cliente además renderiza sin HTML.
- **Video** (`YouTubeVideoId`): solo se guarda el id de 11 caracteres; una URL de otro sitio o un id manipulado se rechaza.
- No hay moderación, comentarios, foros ni aprobación previa en el MVP: el autor publica directo; el sello «Verificado» lo da un revisor.

## Configuración

| Clave | Variable de entorno | Valor |
|---|---|---|
| `Agora:Verification:RequiredReviewers` | `Agora__Verification__RequiredReviewers` | Revisores distintos necesarios para «Verificado». Por defecto `1`; se acota entre 1 y 10. Cambiarla no requiere código (AG-VER-02). |

## Endpoints

Todas las rutas cuelgan de `/api/agora`. Las públicas son anónimas (`AllowAnonymousExplicit`), solo ven piezas **publicadas** y llevan el límite de tasa `agora-public` (120 por minuto por IP).

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /home` | Público | Inicio finito: «Hoy en 5 minutos» (hasta 5 elegidas por el equipo), recientes con tope de 12, series, categorías y 5 noticias |
| `GET /taxonomy` | Público | Categorías, series y etiquetas con su cantidad de piezas publicadas |
| `GET /articles` | Público | Filtros `category`, `series`, `tag` (slugs) y `q` (título y etiquetas); paginado; con `series` ordena por posición en la serie |
| `GET /articles/{slug}` | Público | Detalle con fuentes, video, correcciones y sello. Borrador o archivada: 404 |
| `GET /news` | Público | Noticias enlazadas (destacadas primero); filtro `topic` |
| `GET /share/{slug}` | Público | HTML de vista previa (`og:*` y JSON-LD) que lleva a `/agora/p/{slug}`; el sello viaja en la descripción |
| `GET /share/{slug}/card.png` | Público | Tarjeta PNG detrás de `IShareCardRenderer`; 404 `agora.share_card.unavailable` hasta CCR-2 |

Los enums viajan como texto en camelCase (`facts`, `modifiedAfterVerification`).

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
| `agora.article.not_found`, `agora.category.not_found`, `agora.series.not_found`, `agora.news.not_found`, `agora.error_report.not_found`, `agora.verification.not_found` | 404 | No existe lo pedido (o no es público) |
| `agora.verification.self` | 403 | Quien escribió o editó la pieza intenta verificarla |
| `agora.verification.not_published` | 409 | La pieza no está publicada |
| `agora.verification.duplicate` | 409 | La persona ya verificó esta versión |
| `agora.verification.already_withdrawn` | 409 | La verificación ya estaba retirada |
| `agora.article.invalid_state` | 409 | La acción no corresponde al estado de la pieza |
| `agora.daily_pick.limit` | 409 | «Hoy en 5 minutos» ya tiene 5 piezas |
| `agora.daily_pick.not_published` | 409 | Solo las piezas publicadas pueden destacarse |
| `agora.taxonomy.name_taken` | 409 | Ya existe una categoría o serie con ese nombre |
| `agora.share_card.unavailable` | 404 | La tarjeta PNG depende de CCR-2 y aún no está disponible |

## Pendiente

- Interacción de personas registradas, panel editorial y verificación (siguientes bloques de la F1).
- Tarjetas PNG: dependen de CCR-2 (`Pastel.Documents`). Hoy `UnavailableShareCardRenderer`; para activarlas se registra otra implementación de `IShareCardRenderer`.
- Caché HTTP de lecturas públicas: la plataforma fuerza `Cache-Control: no-store` en toda la API (`SecurityHeadersMiddleware`), así que no se puede fijar desde el módulo; es una decisión de zona compartida.
- HTML con metadatos en la ruta pública `/agora/p/{slug}` (AG-SEO-01): requiere que nginx sirva metadatos a rastreadores; es zona compartida. Mientras tanto el enlace para compartir es `/api/agora/share/{slug}`.
