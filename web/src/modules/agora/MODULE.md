# Ágora — ficha técnica (frontend)

Estado: **marcador** (esqueleto generado por `tools/new-module`).

- Código `agora` · ruta `/agora` · icono `Landmark` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `public`; permiso `agora.access`.
- Backend: `src/Modules/Agora/MODULE.md`. Producto: `docs/modules/AGORA.md`.

## Estructura

`manifest.ts` (descubierto por `virtual:pastel-modules`, WP7) · `strings.ts` (todos los textos, trato de usted) · `paths.ts` (rutas y enlaces) · `permissions.ts` · `pages/` (una página por ruta; exportan `Component`).

- `api/`: `schemas.ts` (zod, coincide con los DTO del servidor; los enums viajan como texto camelCase), `keys.ts`, `queries.ts` y `mutations.ts` (TanStack Query; cada mutación invalida lo que cambia).
- `lib/`: `markdown.ts` y `MarkdownView.tsx` (Markdown propio **sin HTML**: el HTML crudo se muestra como texto y solo se aceptan enlaces `http`, `https`, `mailto` y ancla), `video.ts`, `preferences.ts` (modo calma y categorías seguidas de una persona anónima, solo en el navegador) y `format.ts`.
- `components/`: `SealBadge` (sello con ícono y texto, tres estados), `ContentTypeBadge`, `VideoFacade` (no carga YouTube hasta que se pide), `ArticleCard` y `Feedback` (estados, modo calma, paginación).

`react-markdown` y `rehype-sanitize` figuran como aprobadas en `docs/ARCHITECTURE.md` §9.1 pero no están instaladas; por eso el renderizador es propio. Si se instalan, se puede reemplazar `lib/markdown.ts` sin tocar el resto.
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio.

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/agora` | `HomePage`: inicio finito («Hoy en 5 minutos», recientes con tope, cierre «Está al día») | Público |
| `/agora/explorar` | `ExplorePage`: temas, series, etiquetas y búsqueda; los filtros viven en la dirección (`?categoria=&serie=&etiqueta=&q=&pagina=`) | Público |
| `/agora/p/:slug` | `ArticlePage`: pieza completa, fuentes, correcciones y «Cómo sabemos esto» | Público |
| `/agora/actualidad` | `NewsPage`: noticias enlazadas; con el modo calma activo no se muestran | Público |
| `/agora/guardados` | `SavedPage` | Sesión y `agora.saved.manage` (la pantalla guía a iniciar sesión) |
| `/agora/estandares` | `StandardsPage`: qué significa el sello y cómo se corrige | Público |

Una persona sin sesión puede leer todo, seguir temas (en su navegador) y compartir. Guardar, reaccionar y señalar errores piden sesión: se la lleva a iniciar sesión y la acción se retoma al volver (`?accion=guardar|ayudo|fuentes`). El servidor decide siempre con `agora.saved.manage`.

## Pendiente

Todo lo funcional de la ficha de producto. Las clases `bg-accent-soft`, `text-accent-strong`, `text-fg` y `text-muted` las define el sistema de diseño (WP8).
