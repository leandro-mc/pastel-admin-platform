# Huella — ficha de producto y MVP

Identidad visual por definir (investigación en curso); icono `Footprints` provisional · esquema `huella` · ruta `/huella` · API `/api/huella`.

## 1. Propósito
Perfil profesional web **del Owner/Superuser de Pastel**, editable en privado y publicable mediante un único enlace para compartir con reclutadores. No existe un perfil de Huella por usuario ni una forma de descubrirlo desde el catálogo, la búsqueda o un directorio. Cualquier persona con el enlace vigente puede verlo sin registrarse.

## 2. Roles y permisos del MVP

| Rol | Quién | Qué puede |
|---|---|---|
| **Owner/Superuser** | Único propietario de la plataforma | Crear/editar su perfil, previsualizar, publicar/despublicar, controlar visibilidad y regenerar el enlace público |
| **Administrator general** | Administración de la plataforma, distinto de Owner | No puede acceder al contenido privado ni editar el perfil de Huella |
| **Visitante público** | Cualquier persona con el enlace vigente, sin cuenta | Ver la última versión publicada y abrir sus enlaces; imprimir/guardar como PDF |

Permisos: `huella.access` (entrar al panel), `huella.profile.manage` (editar y publicar el perfil del Owner). Solo el rol de sistema `Owner/Superuser` recibe esos permisos en la sincronización del catálogo; no se crean roles de Huella personalizados ni se permiten excepciones directas `huella.*` (lo declara `HuellaPermissions` con `PermissionGrantPolicy.OwnerAccountOnly`). Las rutas públicas son anónimas, pero necesitan el token de enlace vigente. El filtro de servidor exige el identificador Owner configurado en el perfil.

## 3. Modelo (esquema `huella`)
`Profile` (un único registro ligado al `OwnerUserId`, `PublicTokenHash` único, nombre, titular, resumen, ubicación y disponibilidad opcionales, interruptores de contacto **todos apagados por defecto**), `ProfileLink`, `PrivateNote`, `Experience`, `Project`, `Skill`, `Education`, `Certification`, `LanguageSkill`, **`Achievement`** (la unidad del banco: versión corta y larga, cifra, fuerza, visibilidad `cv|public|both|never`, habilidades que demuestra), `JobOffer`, `CvVersion` (contenido JSON del CV) y `PublishedSnapshot` (versión publicada inmutable: perfil + CV público, número de versión, `ContentHash`, semilla).

Los logros son la capa que reutilizarán las futuras funciones (carta de recomendación, historial de postulaciones, preparación de entrevistas) sin cambiar el modelo: cada una referencia `Achievement`, `JobOffer` y `CvVersion`.

- **Borrador vs publicado:** el propietario edita el borrador. **Publicar** crea un `PublishedSnapshot`; la página pública lee siempre el último snapshot, nunca el borrador. "Despublicar" retira el perfil público. Vista previa del borrador solo para el propietario.
- **Token de enlace público:** generar al menos 32 bytes criptográficamente aleatorios y codificar con Base64URL. La búsqueda usa el hash; el valor se guarda además **cifrado** (nunca en claro) para que el propietario pueda volver a copiar su enlace las veces que necesite; nunca derivar el token de un nombre, correo, slug o ID. La URL pública será `/huella/p/:token`. El token es una capacidad de lectura: cualquier persona que lo posea puede acceder a la última publicación sin login.
- **Revocación/regeneración:** al regenerar, generar un token nuevo, almacenar el nuevo hash y hacer que el token previo falle inmediatamente. No registrar el token en logs, analítica o telemetría.

## 4. Pantallas

| Ruta | Pantalla | Notas |
|---|---|---|
| `/huella/p/:token` | **Perfil público mediante enlace secreto** | Sin el marco de Pastel (solo el perfil); **siempre en español e inglés**, empieza en inglés y trae selector de idioma y de tema (claro/oscuro); barra superior fija que, al desplazarse, deja a la vista nombre, titular y correo; índice lateral fijo; solo versión publicada; enlaces externos con `rel="noopener noreferrer"`; resaltador de evidencia, impresión y «Ver CV» si la publicación lo incluye; token válido obligatorio y sin login |
| `/huella` | Entrada | Lleva al banco |
| `/huella/banco` | Banco de información | **Material en bruto**: la persona anota todo lo que ha hecho, sin estructura ni cuidar el largo, y la IA lo lee completo para redactar cada CV y el perfil público (nada se copia tal cual). Notas privadas, experiencia, proyectos, habilidades, educación, certificaciones, idiomas y logros opcionales. **Sin botón guardar** (autoguardado); cada sección con buscador, elementos colapsados y confirmación al quitar |
| `/huella/cv` | Crear CV | Oferta → mapa de evidencia y filtros duros → **generar con IA** (nivel, papel e **idioma por generación**: español, inglés o ambos) → versiones → edición validada, reporte, texto ATS, volver a redactar, descarga en PDF o Word (.docx), marcar CV público; el nivel inicial es Junior. No existe un idioma global del CV |
| `/huella/vista-previa` | Vista previa real del borrador | Pestaña nueva con sesión: mismos componentes que el enlace público (CV e impresión incluidos) y un aviso arriba que no se imprime |
| `/huella/ia` | Configurar IA | Proveedor (Gemini, OpenAI o Anthropic), clave de la cuenta del propietario y modelo elegido de la lista real del proveedor |
| `/huella/perfil` | Perfil público | **Contenido del perfil** por secciones (titular, resumen y destacados; trayectoria; proyectos; habilidades; formación e idiomas), cada una con un máximo, redactada por IA desde el banco en español e inglés y **editable en español**: al guardar, la IA reescribe esa sección en inglés; datos y enlaces (cada uno con icono), interruptores de contacto, vista previa, publicar/despublicar, enlace siempre visible para copiar |
| `/huella/pronto/:item` | En preparación | Carta de recomendación, historial de postulaciones, preparación de entrevistas |

## 5. Reglas y detalles
- **Privacidad:** control de qué se muestra; correo y teléfono ocultos salvo elección explícita; validar enlaces (solo `https`, sin credenciales en la URL); no exponer datos internos.
- **CV:** lo redacta la IA a partir del banco **en crudo** y de la oferta, en **una sola solicitud** (elige qué experiencias y proyectos incluir y los redacta dentro del presupuesto de líneas del nivel, en el idioma o idiomas pedidos aunque el banco esté en otro). La IA devuelve **solo JSON** (nunca Typst/LaTeX); los hechos (empresa, fechas, ubicación, contacto) salen del banco y lo que escribe pasa por el guardián (cifras que existan en la experiencia citada, habilidades que el banco mencione, frases prohibidas, topes) y por el ajuste a página. Cada acción de IA tiene los **mismos tres caminos con el mismo prompt**: (1) IA automática con la clave y el modelo del propietario (Gemini, OpenAI o Anthropic), con ventana de progreso y aviso al terminar; (2) descargar el prompt en `.md` o `.txt` para una IA externa; (3) importar su respuesta (archivo o pegada). Sin IA queda un borrador por reglas desde los logros ya derivados. El **PDF** sale de una plantilla Typst fija (CCR-2, `Pastel.Documents`); el **Word** lo escribe el propio servidor; si el motor del PDF no está instalado responde 503 `huella.cv.renderer_unavailable` y quedan el Word y el texto ATS.
- **Privacidad de la IA:** al proveedor va el banco completo tal como lo escribió la persona (relatos, su historia y su voz), la oferta y los límites; nunca nombre, correo, teléfono ni enlaces (los datos de contacto los pone el servidor). Lo que la persona marcó «nunca» o «solo CV/solo perfil» se envía como `doNotUse` para que la IA no lo use. La clave se guarda cifrada y no se vuelve a mostrar.
- **Perfil público:** texto corto y priorizado con un máximo por sección (4 experiencias de hasta 3 viñetas, 3 proyectos, 5 grupos y 20 habilidades, 3 estudios, 4 certificaciones, 5 idiomas, resumen de 420 caracteres), siempre en español e inglés; la IA lo genera sección por sección (una espera a la anterior) o todo en un prompt externo. Editar el español deja el inglés de esa sección «desactualizado» hasta reescribirlo.
- **Vista previa al compartir (importante para reclutadores):** las plataformas de mensajería leen metadatos sin ejecutar JavaScript. El agente debe proponer y registrar en `docs/DECISIONS.md` el método más simple para entregar `title`, `description` y `og:*` del perfil publicado en `/huella/p/:token` (p. ej. el servidor devuelve el HTML de la aplicación con metadatos inyectados), sin añadir un servidor Node. Si requiere cambios en `nginx` o en zonas protegidas, pedir autorización del propietario (zonas compartidas, `AGENTS.md` §8).
- **Público:** endpoints anónimos con límite de tasa y caché; sin cookies de sesión; sin datos del borrador. Requerir token vigente en la ruta, almacenar solo su hash, y mantener el token fuera de logs/referrers.
- **No indexación:** el HTML inicial contiene `<meta name="robots" content="noindex,nofollow,noarchive">` y la respuesta HTML lleva `X-Robots-Tag: noindex, nofollow, noarchive`. No depender solo de `robots.txt`; este documento noindex aplica al perfil público, no a toda la plataforma.
- **Accesibilidad y diseño:** tipografía clara, buen contraste, orden semántico (un `h1`, secciones con `h2`), imprimible.
- Entrada de datos con límites de longitud; texto plano o Markdown mínimo sanitizado.
- Auditoría: publicar, despublicar y regenerar/revocar el enlace público (sin registrar el token en claro).

## 6. Fuera del MVP
Múltiples perfiles o plantillas, temas personalizados, subida de fotografía (requiere almacenamiento de archivos), analítica de visitas, dominio propio por perfil, internacionalización del perfil.

## 7. Criterios de aceptación

### Etapa 1 — app funcional (obligatorio ahora)
- Owner/Superuser crea el perfil, ve la vista previa, publica y obtiene un enlace largo y aleatorio que funciona sin sesión; despublica y el enlace deja de mostrar contenido.
- El perfil público responde con meta robots y `X-Robots-Tag` noindex; los crawlers no deben indexarlo.
- Lo editado después de publicar **no** aparece públicamente hasta una nueva publicación.
- Las **pruebas esenciales** de abajo en verde; `MODULE.md` (backend y frontend) actualizados; el módulo compila y respeta las fronteras entre módulos (pruebas de arquitectura).

### Pruebas esenciales — Etapa 1 (las únicas obligatorias ahora)

Política: `docs/TESTING.md` §1; **no se amplía sin decisión del propietario**. Los resultados esperados se calculan desde esta ficha, no desde el código.

1. Anónimo abre `/huella/p/<token-vigente>` publicado → 200 y contenido de la **última versión publicada**; sin sesión ni cookie de sesión. Token aleatorio de alta entropía; almacenamiento solo de hash.
2. Se edita el borrador después de publicar → la página pública **no cambia** hasta publicar de nuevo.
3. Despublicar → `/huella/p/<token-vigente>` muestra "no disponible" (404 controlado) y no filtra contenido.
4. Token ausente, mal formado, no vigente o revocado → 404 controlado sin filtrar borrador, perfil ni datos del propietario. Regenerar enlace invalida el token previo.
5. Contacto: correo y teléfono ocultos por defecto; solo aparecen si el propietario lo habilita; nunca en el HTML ni en el JSON público cuando están ocultos.
6. Un propietario no puede leer ni editar el perfil de otro (probar con IDs ajenos) → 403/404; sin permiso → 403; anónimo en el panel → 401.
7. Entradas con `<script>`, `<img onerror>`, `javascript:` y enlaces `http://`/con credenciales → neutralizadas o rechazadas; enlaces externos con `rel="noopener noreferrer"`.
8. Regenerar token invalida el anterior; solo el Owner/Superuser puede regenerarlo; el token en claro no aparece en base de datos, logs ni telemetría.

### Diferido a QA — Etapa 2 (no bloquea la entrega de la primera versión)

Se planifican cuando las cinco aplicaciones estén funcionales (`docs/TESTING.md`, `docs/PROGRESS.md` §5):

- Límite de tasa del endpoint público (429 con `Retry-After`) y cabeceras de caché correctas; sin datos del borrador.
- Impresión: la vista imprimible conserva orden, legibilidad y contraste; no imprime botones de edición.
- Metadatos de vista previa (`title`, `description`, `og:*`) presentes en la respuesta inicial del servidor para un perfil publicado, junto con `noindex,nofollow,noarchive` y `X-Robots-Tag`.
- Accesibilidad de la página pública: un solo `h1`, secciones con `h2`, teclado, 320 px, texto "Muy grande".
- Revisión de accesibilidad, impresión, 320 px y claro/oscuro del perfil público y del editor.
- Compilación y pruebas del módulo **aislado** (`PASTEL_MODULES=<módulo>`), con `ci:completo` o antes de desplegar.
