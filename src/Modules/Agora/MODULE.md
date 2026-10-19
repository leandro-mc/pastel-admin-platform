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

El rol `Administrator` recibe todos los permisos al sincronizar el catálogo.

## Reglas de servidor (de la ficha)

- Las rutas públicas se marcan con `AllowAnonymousExplicit()` y llevan límite de tasa.
- Quien edita una pieza no puede otorgarse su propia verificación (regla del servidor).
- No hay moderación, comentarios, foros ni aprobación previa en el MVP: el autor publica directo; el sello «Verificado» lo da un revisor.

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/agora/ping` | `agora.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `agora` sin tablas. `AgoraDbContext` usa `HasDefaultSchema("agora")` y su historial de migraciones vive en `agora.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/AgoraDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `agora.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
