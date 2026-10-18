# Ágora — ficha de producto y MVP

Color `data-module="agora"` (azul grisáceo) · icono `Landmark` · esquema `agora` · ruta `/agora` · API `/api/agora`.

## 1. Propósito y principio editorial
Divulgación humanística y de actualidad, centrada en Costa Rica, para ayudar a comprender hechos, procesos y decisiones públicas. **Facilitar la comprensión y el criterio propio**, no decir qué pensar. La confianza se construye mostrando **fuentes, contexto y estado de verificación**.

## 2. Roles y permisos del MVP

| Rol | Quién | Qué puede |
|---|---|---|
| **Visitante público** | Sin cuenta | Leer, explorar por categoría/serie/etiqueta, buscar por título, ver videos y noticias enlazadas |
| **Persona registrada** | Cualquier cuenta (rol `Member`) | Todo lo anterior + **guardar** piezas y seguir categorías |
| **Autor/editor** (`Ágora — Autor`) | Propietario y colaboradores | Crear, editar, publicar y despublicar piezas; gestionar categorías, series, fuentes, videos y noticias enlazadas |
| **Revisor especialista** (`Ágora — Revisor`) | Especialistas | Revisar una pieza y **verificarla** (o retirar la verificación) con nota |
| **Administrador de Pastel** | Ya existe | Todo |

**Decisión de alcance:** no hay moderador, comentarios ni foros en el MVP (requieren moderación y normas operativas; pertenecen a la etapa "Comunidad"). **Tampoco hay flujo de aprobación previa:** el autor publica directamente. La diferencia de confianza se muestra con el **sello "Verificado"**, que solo aparece cuando un revisor especialista lo otorga.

Permisos: `agora.access` (solo para el panel editorial), `agora.content.manage` (autor), `agora.content.review` (revisor), `agora.saved.manage` (registrado: guardar). Lo público no requiere permiso. Quien edita el contenido no puede otorgarse su propia verificación (regla del servidor).

## 3. Modelo (esquema `agora`)
`Category`, `Series`, `Tag`, `Article` (pieza: título, `slug`, resumen, cuerpo Markdown, categoría, serie y orden, etiquetas, periodo/fechas relevantes, estado Borrador/Publicada/Archivada, fechas de publicación y actualización, autor), `Source` (por pieza: título, autor o entidad, fecha, URL, tipo de fuente, nota de contexto), `VideoEmbed` (id de YouTube validado, título, nota), `NewsLink` (actualidad: titular, medio, fecha, URL, nota de contexto, tema, destacado), `Verification` (pieza, revisor, fecha, alcance revisado, nota, estado Vigente/Retirada, versión de la pieza verificada), `Correction` (pieza, fecha, texto visible de la corrección), `SavedArticle` (usuario, pieza), `FollowedCategory` (usuario, categoría).

- **Sello "Verificado":** se muestra solo con una `Verification` vigente **para la versión actual del contenido sustantivo**. Si la pieza cambia de forma material después de verificarse, el sello se reemplaza por "Modificada tras la verificación" hasta nueva verificación (el revisor decide). El sello explica en una frase qué significa y quién verificó y cuándo.
- Una pieza sin sello se publica igualmente, con la etiqueta neutra "Pendiente de verificación".

## 4. Pantallas

| Ruta | Pantalla | Notas |
|---|---|---|
| `/agora` | **Inicio público** | Piezas destacadas, categorías y series, bloque "Actualidad" con enlaces a noticias |
| `/agora/c/:categoria`, `/agora/s/:serie` | Listados | Filtros y búsqueda por título en la URL |
| `/agora/p/:slug` | **Pieza** | Resumen, video (fachada), cuerpo, fuentes, sello de verificación, correcciones, guardar |
| `/agora/guardados` | Mis guardados | Registrado |
| `/agora/editorial` | Panel editorial | Lista de piezas por estado; botón "Nueva pieza" |
| `/agora/editorial/piezas/:id` | Editor | Markdown con vista previa, fuentes, video, categoría/serie, publicar/archivar |
| `/agora/editorial/revision` | Cola de revisión | Revisor: piezas sin verificar o modificadas |
| `/agora/editorial/actualidad` | Noticias enlazadas | Alta/edición de enlaces |

## 5. Reglas y detalles
- **Videos de YouTube:** se incrustan desde `youtube-nocookie.com` mediante **fachada** (miniatura + botón; el iframe se carga al pulsar), con `loading="lazy"` y título accesible. Validar el id; no alojar videos. La CSP de `nginx` hoy bloquea marcos externos: solicitar por CCR el `frame-src https://www.youtube-nocookie.com` y la política de imágenes necesaria para las miniaturas.
- **Contenido Markdown:** renderizado con sanitización estricta (sin HTML crudo, sin scripts); enlaces externos con `rel="noopener noreferrer"`.
- **Noticias:** solo se enlazan (medio, titular, fecha, URL y contexto propio); no se copia el texto ajeno.
- **Distinción de tipo de contenido:** campo "Tipo" (Hechos documentados · Análisis/interpretación · Opinión) visible en cada pieza.
- **SEO y vista previa al compartir:** las páginas públicas necesitan `title`, `description` y `og:*` sin ejecutar JavaScript; documentar en un ADR el método más simple (mismo enfoque que Huella; coordinar por CCR, no duplicar trabajo).
- **Búsqueda:** MVP con filtro por título/etiqueta; búsqueda de texto completo en etapa posterior.
- **Endpoints públicos:** anónimos, con límite de tasa y caché corta; nunca devuelven borradores ni piezas archivadas.
- Auditoría: publicar, archivar, verificar, retirar verificación, correcciones.

## 6. Fuera del MVP
Foros, comentarios, reportes y moderación; flujo formal de aprobación previa; reputación; líneas de tiempo y relaciones entre temas; historial completo de versiones; panel analítico; búsqueda avanzada; cobertura internacional estructurada.

## 7. Criterios de aceptación
- Un autor crea una pieza con fuentes y video, la publica y un visitante anónimo la lee en `/agora/p/:slug`; sin sello aparece "Pendiente de verificación".
- Un revisor verifica la pieza y el sello aparece con su nombre y fecha; al editar el contenido sustantivo el sello pasa a "Modificada tras la verificación".
- Un autor no puede verificar su propia pieza; un registrado puede guardar y ver sus guardados; un anónimo no ve borradores.
- Pruebas de integración por rol, sanitización de Markdown, validación de id de YouTube, estados públicos.
- Accesibilidad y 320 px; `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=agora`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

Dev escribe `docs/testing/plans/AGORA-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente; QA lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. Matriz por rol (anónimo, registrado, autor, revisor, administrador) sobre cada acción de la sección 2; **un autor no puede verificar su propia pieza** (403 `agora.verification.self`).
2. Borradores y piezas archivadas nunca aparecen en listados, búsqueda, página de pieza ni respuestas públicas.
3. Sello: una pieza sin verificación muestra "Pendiente de verificación"; tras verificar, "Verificado por <nombre> el <fecha>"; tras editar contenido sustantivo, "Modificada tras la verificación"; el revisor puede retirar o renovar.
4. Markdown malicioso (`<script>`, `<img onerror>`, `[x](javascript:…)`, HTML crudo, iframes) → sanitizado; el contenido legítimo se conserva.
5. Video: solo se acepta un identificador de YouTube válido; una URL arbitraria o un identificador manipulado → rechazado; la fachada no carga el iframe hasta pulsar; el iframe usa `youtube-nocookie.com`.
6. Fuentes: cada pieza muestra sus fuentes con enlace externo seguro; una pieza sin fuentes se marca de forma visible para el autor (aviso, no bloqueo).
7. Registrado guarda y quita guardados; anónimo que intenta guardar → 401 y el frontend lo lleva a iniciar sesión conservando la acción.
8. Noticias enlazadas: solo metadatos y enlace; URL inválida rechazada.
9. Endpoints públicos: límite de tasa, caché corta y sin datos privados; metadatos de vista previa en la respuesta inicial.
10. Accesibilidad de lectura: estructura de encabezados, contraste, teclado, 320 px, texto "Muy grande"; el sello no depende solo del color.
