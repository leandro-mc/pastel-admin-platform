# Huella — ficha de producto y MVP

Color `data-module="huella"` (terracota) · icono `Footprints` · esquema `huella` · ruta `/huella` · API `/api/huella`.

## 1. Propósito
Perfil profesional web, **público** y **editable por su propietario**: una tarjeta de presentación ampliada con un único enlace para compartir con reclutadores. Es el módulo más acotado y valida el patrón "edición protegida + publicación pública".

## 2. Roles y permisos del MVP

| Rol | Quién | Qué puede |
|---|---|---|
| **Visitante público** | Cualquier persona, sin cuenta | Ver la versión publicada y abrir sus enlaces; imprimir/guardar como PDF |
| **Propietario** (`Huella — Propietario`) | Usuario con permiso | Crear y editar su perfil, previsualizar, publicar/despublicar, controlar visibilidad |
| **Administrador de Pastel** | Ya existe | Soporte técnico; no edita el contenido ordinario del perfil (acciones privilegiadas auditadas) |

Permisos: `huella.access` (entrar al panel), `huella.profile.manage` (editar y publicar el propio perfil). Las rutas públicas son anónimas. Un propietario solo accede a **su** perfil (filtro por `OwnerUserId`).

## 3. Modelo (esquema `huella`)
`Profile` (propietario, `slug` único, nombre público, titular, resumen, ubicación general opcional, estado de publicación), `ContactPreference` (qué datos de contacto se muestran: correo, teléfono, enlaces; todo **oculto por defecto**), `Experience`, `Education`, `Certification`, `Skill` (con categoría y nivel opcional), `Language`, `Project` (descripción, tecnologías, aporte, resultados, enlaces), `ExternalLink`, `Section` (orden y visibilidad de secciones), `PublishedSnapshot` (versión publicada inmutable, JSON, número de versión, fecha), `CvPreference`.

- **Borrador vs publicado:** el propietario edita el borrador. **Publicar** crea un `PublishedSnapshot`; la página pública lee siempre el último snapshot, nunca el borrador. "Despublicar" retira el perfil público. Vista previa del borrador solo para el propietario.
- **Slug:** minúsculas, números y guiones, 3–40 caracteres, único, con lista de **palabras reservadas** (rutas de plataforma y de módulos, `panel`, `api`, `assets`, etc.).

## 4. Pantallas

| Ruta | Pantalla | Notas |
|---|---|---|
| `/huella/:slug` | **Perfil público** | Móvil y escritorio, lectura rápida, secciones ordenadas, enlaces externos con `rel="noopener noreferrer"`, botón "Descargar CV" |
| `/huella` | Entrada | Con sesión y permiso: panel del propietario; sin sesión: explicación breve y "Ingresar" |
| `/huella/panel` | Editor | Navegación por secciones, guardado explícito con indicador "Guardado/Sin guardar", vista previa lado a lado en escritorio |
| `/huella/panel/publicar` | Publicación | Resumen de cambios desde la última versión, botón Publicar, enlace público para copiar |

## 5. Reglas y detalles
- **Privacidad:** control de qué se muestra; correo y teléfono ocultos salvo elección explícita; validar enlaces (solo `https`, sin credenciales en la URL); no exponer datos internos.
- **CV en PDF (MVP):** hoja de estilos de impresión + botón "Guardar como PDF" (impresión del navegador). Un PDF generado en el servidor queda para una etapa posterior.
- **Vista previa al compartir (importante para reclutadores):** las plataformas de mensajería leen metadatos sin ejecutar JavaScript. El agente debe proponer y documentar en un ADR el método más simple para entregar `title`, `description` y `og:*` del perfil publicado en `/huella/:slug` (p. ej. el servidor devuelve el HTML de la aplicación con metadatos inyectados), sin añadir un servidor Node. Si requiere cambios en `nginx` o en zonas protegidas, solicitarlo por CCR.
- **Público:** endpoints anónimos con límite de tasa y caché; sin cookies de sesión; sin datos del borrador.
- **Accesibilidad y diseño:** tipografía clara, buen contraste, orden semántico (un `h1`, secciones con `h2`), imprimible.
- Entrada de datos con límites de longitud; texto plano o Markdown mínimo sanitizado.
- Auditoría: publicar, despublicar y cambio de slug.

## 6. Fuera del MVP
Múltiples perfiles o plantillas, temas personalizados, subida de fotografía (requiere almacenamiento de archivos), PDF del servidor, analítica de visitas, dominio propio por perfil, internacionalización del perfil.

## 7. Criterios de aceptación
- El propietario crea el perfil completo, ve la vista previa, publica y obtiene un enlace público que funciona sin sesión; despublica y el enlace deja de mostrar contenido.
- Lo editado después de publicar **no** aparece públicamente hasta una nueva publicación.
- Pruebas de integración: permisos (propietario ajeno, anónimo), slug reservado/duplicado, privacidad de contacto, snapshot inmutable.
- Revisión de accesibilidad, 320 px, claro/oscuro, impresión; `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=huella`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

Dev escribe `docs/testing/plans/HUELLA-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente; QA lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. Anónimo abre `/huella/<slug>` publicado → 200 y contenido de la **última versión publicada**; sin sesión, sin cookies.
2. Se edita el borrador después de publicar → la página pública **no cambia** hasta publicar de nuevo.
3. Despublicar → `/huella/<slug>` muestra "no disponible" (404 controlado) y no filtra contenido.
4. Slug reservado (`panel`, `api`, nombres de módulos y de rutas de plataforma), duplicado, con mayúsculas, espacios, menos de 3 o más de 40 caracteres → rechazado con mensaje claro.
5. Contacto: correo y teléfono ocultos por defecto; solo aparecen si el propietario lo habilita; nunca en el HTML ni en el JSON público cuando están ocultos.
6. Un propietario no puede leer ni editar el perfil de otro (probar con IDs ajenos) → 403/404; sin permiso → 403; anónimo en el panel → 401.
7. Entradas con `<script>`, `<img onerror>`, `javascript:` y enlaces `http://`/con credenciales → neutralizadas o rechazadas; enlaces externos con `rel="noopener noreferrer"`.
8. Límite de tasa del endpoint público (429 con `Retry-After`) y cabeceras de caché correctas; sin datos del borrador.
9. Impresión: la vista imprimible conserva orden, legibilidad y contraste; no imprime botones de edición.
10. Metadatos de vista previa (`title`, `description`, `og:*`) presentes en la respuesta inicial del servidor para un perfil publicado.
11. Accesibilidad de la página pública: un solo `h1`, secciones con `h2`, teclado, 320 px, texto "Muy grande".
