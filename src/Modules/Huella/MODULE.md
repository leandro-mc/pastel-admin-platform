# Huella — ficha técnica (backend)

Estado: **MVP de Etapa 1 implementado** (banco, estudio de CV con PDF, IA automática y externa, perfil público).

- Código `huella` · esquema `huella` · API `/api/huella` · proyecto `Pastel.Modules.Huella`.
- Producto: `docs/modules/HUELLA.md`. Frontend: `web/src/modules/huella/MODULE.md`.

## Permisos y aislamiento

`huella.access` (entrar) y `huella.profile.manage` (editar/publicar) solo para el rol de sistema `Owner/Superuser` (`OwnerAccountOnly`). Sin invitados ni delegación.
Toda lectura/escritura privada pasa por el perfil del Owner de la sesión (`ProfileId`); un identificador de otro perfil responde **404** (nunca 403, para no confirmar su existencia).

## Endpoints (`/api/huella`)

| Ruta | Para qué |
|---|---|
| `GET /profile/content` · `PUT /profile/content/{overview\|experience\|projects\|skills\|credentials}` | Contenido del perfil público (`ProfileContent`: `es` editable, `en` sincronizado) con el estado por sección (`empty`, `ready`, `stale`); la edición valida máximos y toma empresa, fechas e institución del banco |
| `GET/PUT /profile` | Perfil y enlaces (máx. 8; solo `https`; cada uno con `icon` opcional del catálogo cerrado `LinkIcons.Keys`, `null` = el del tipo; otro valor → 400); contacto, ubicación y disponibilidad con interruptor, ocultos por defecto |
| `GET /bank` · `PUT /bank/{notes\|experiences\|projects\|skills\|education\|certifications\|languages}` | Banco completo / reemplazo de una sección |
| `PUT /bank/{experiences\|projects}/{id}/achievements` | Logros de una experiencia o proyecto |
| `POST …/{id}/derive` · `…/ai-package` · `…/ai-run` · `…/ai-result` | Logros por reglas; prompt para una IA externa; propuestas del proveedor configurado; validación del JSON importado |
| `GET/POST /studio/offers` · `GET/DELETE …/{id}` | Ofertas (texto = dato no confiable; máx. 50) con mapa de evidencia y filtros duros; la lista trae el seguimiento y la cobertura de requisitos obligatorios contra el banco de hoy |
| `PUT /studio/offers/{id}/tracking` | Seguimiento: estado (`saved`, `applied`, `interview`, `offer`, `rejected`, `no_response`, `discarded`), fecha de postulación, día de seguimiento y notas (≤ 1000). Volver a `saved` borra la fecha de postulación |
| `GET/POST /studio/versions` · `GET/DELETE …/{id}` | Versiones de CV (máx. 60) |
| `PUT …/{id}/name` · `/line` · `/public?isPublic=` · `/sent?sent=` | Renombrar, editar una línea (pasa por el guardián), marcar CV público, marcar como enviado (si su oferta está «sin postular» pasa a «postulada» con la fecha de hoy y seguimiento a 7 días) |
| `GET /studio/letters` · `GET/DELETE …/{id}` · `PUT …/{id}/content` · `/name` · `/sent?sent=` · `GET …/{id}/pdf` · `/docx` | Cartas de presentación (máx. 60): lectura, edición validada por el guardián (2 a 5 párrafos, 2400 caracteres, cifras solo del banco o de la oferta), envío (pasa su oferta a «postulada»), PDF (`letter.typ`) y Word (`LetterDocx`) |
| `POST /tasks/{cv\|letter\|profile\|profile-translate}/ai-package` · `/ai-run` · `/ai-result` | **Acciones de IA** (`AiTaskHandler`): prompt completo para una IA externa, ejecución con el proveedor configurado (nginx le da 150 s: la ruta termina en `ai-run`) o importación del JSON. `cv` redacta una o dos versiones (idiomas `es`/`en`) desde el banco en crudo, o reemplaza `versionId`; `letter` redacta una carta por idioma para una oferta (`offerId`, `tone` `formal`/`cercano`; `versionId` = la carta a reemplazar) con `LetterAi`; `profile` redacta secciones del perfil (español e inglés); `profile-translate` reescribe el inglés de secciones editadas. Todo pasa por el guardián, nunca Typst |
| `GET …/{id}/pdf` | PDF del CV con Typst (`Pastel.Documents`); `503 huella.cv.renderer_unavailable` si el motor no está instalado |
| `GET …/{id}/docx` | El mismo CV en Word (`Cv/CvDocx.cs`: paquete Open XML escrito a mano, sin dependencias ni motor externo, siempre disponible; abre en Word, Google Docs y LibreOffice) |
| `GET /ai/settings` · `PUT/DELETE /ai/settings/{gemini\|openai\|anthropic}` · `POST …/{provider}/models` | IA automática: proveedor, modelo y clave (escritura; la clave nunca se devuelve) |
| `GET /publication` · `/publication/preview` · `/publication/preview/cv` | Estado (incluye el enlace para el propietario), vista previa del borrador y su CV público |
| `POST /publication/publish` · `/unpublish` · `/link` | Publicar, retirar, regenerar enlace (el token solo viaja en esa respuesta) |
| `GET /public/profile` · `/public/cv` | **Anónimas**; token en la cabecera `X-Huella-Token` |

## Reglas que no se rompen

- **Token:** 32 bytes aleatorios, Base64URL (43 car.). En BD: SHA-256 (búsqueda) y el valor **cifrado** con AES-GCM (`AiKeyProtector`, etiqueta `public-link`) para que el propietario lo recupere en `GET /publication` (campo `token`, solo con `huella.access`). Nunca en claro en BD, rutas de API, logs ni auditoría. Los enlaces creados antes de `AddHuellaPublicLinkCipher` no son recuperables: se regeneran. Regenerar invalida el anterior al instante.
- **404 uniforme** `huella.public.not_found` (ausente, mal formado, despublicado, revocado) con `X-Robots-Tag: noindex, nofollow, noarchive` y `Referrer-Policy: no-referrer`. Límite `huella-public`: 30/min por IP.
- **Publicación:** `PublishedSnapshot` congelado (se conservan 5); lo editado después no aparece hasta publicar de nuevo. `ContentHash` detecta cambios sin publicar. La semilla de la huella son 8 bytes del hash.
- **Perfil público:** lista blanca (`PublicProfileBuilder`) sobre el contenido redactado (`ProfileContent`), no sobre el banco; siempre las dos versiones (si falta una sección en inglés se publica la de español); se descarta lo que el banco ocultó o borró después; sin notas privadas, ofertas ni versiones no públicas. Una publicación anterior al perfil bilingüe responde 404 hasta publicar de nuevo.
- **CV:** la IA solo produce JSON. `AiBank` arma el banco en crudo para el prompt (sin nombre, correo, teléfono ni enlaces; relatos recortados si pasan de 90 000 caracteres, primero los más antiguos) y `CvAiCompose` lo valida: empresa, fechas y contacto salen del banco; `CvGuardian` rechaza viñetas con cifras ajenas a la experiencia o proyecto citado (`sourceIds` = ese id), habilidades que el banco no menciona, frases prohibidas o sobre el tope; `CvLayout.Fit` ajusta por escalera sin llamar a la IA. `TypstCvRenderer` pasa el CV como datos (`data.json`) a una plantilla fija; `CvDocx` escribe el Word.
- **IA automática:** el prompt es **idéntico** al que se descarga para una IA externa (`CvAiCompose`, `ContentAi`, `AiPackages`). Proveedores con URL fija y clave en cabecera (`Ai/AiProviders.cs`); el cuerpo de error del proveedor no se reenvía ni se registra. La clave se cifra con AES-256-GCM (`AiKeyProtector`, clave derivada de `Jwt:SigningKey`) y no se devuelve. Un CV pide una sola solicitud (el banco cabe en el contexto de los modelos actuales); el perfil público se pide una sección a la vez desde la interfaz.
- **Entradas:** límites de longitud, etiquetas HTML y esquemas peligrosos neutralizados (`TextInput`, `LinkPolicy`, `ContactRules`).
- **Auditoría:** `huella.profile.published`, `huella.profile.unpublished`, `huella.link.regenerated` (sin token).

## Datos (esquema `huella`)

`Profile` (único por `OwnerUserId`, `PublicTokenHash` único) · `ProfileLink` · `PrivateNote` · `Experience` · `Project` · `Skill` · `Education` · `Certification` · `LanguageSkill` · `Achievement` + `AchievementSkill` (el logro es la unidad: de ahí salen CV, perfil y futuras funciones) · `JobOffer` · `CvVersion` · `PublishedSnapshot` · `AiCredential` (una fila por proveedor; clave cifrada, `KeyHint`, `IsActive`).
Migraciones: `InitialHuellaSchema`, `AddHuellaProfileModel`, `AddHuellaAiCredentials`, `AddHuellaPublicLinkCipher` y `AddHuellaLinkIcon`, `AddHuellaApplicationTracking` (seguimiento en `job_offers` y `SentAt` en `cv_versions`), `AddHuellaCoverLetters` (tabla `cover_letters`), `AddHuellaPublicContent` (tabla `profile_contents`; quita `PreferredLanguage` de las notas: no hay idioma global) (estas con `dotnet ef`; `has-pending-model-changes` sin cambios y las tres aplicadas en PostgreSQL por las pruebas de integración).

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `huella.resource.not_found` | 404 | Recurso inexistente o de otro perfil |
| `huella.public.not_found` | 404 | Enlace no disponible (un solo mensaje para todos los motivos) |
| `huella.session.required` | 401 | Sin sesión |
| `huella.input.invalid` | 400 | Campos inválidos (`errors` por campo) |
| `huella.publication.empty` | 400 | Falta nombre o titular para publicar |
| `huella.cv.empty_bank` · `huella.letter.empty_bank` · `huella.profile.empty_bank` | 400 | El banco no tiene experiencias ni proyectos para redactar un CV, una carta o el perfil |
| `huella.cv.no_achievements` | 400 | El borrador sin IA necesita al menos un logro derivado |
| `huella.cv.line_rejected` | 400 | El guardián rechazó la línea |
| `huella.cv.not_public` | 404 | La publicación no incluye CV |
| `huella.ai.invalid_json` | 400 | El JSON pegado no es válido |
| `huella.cv.renderer_unavailable` | 503 | El motor de PDF (Typst) no está instalado en el servidor |
| `huella.ai.not_configured` | 409 | Se pidió IA automática sin proveedor configurado |
| `huella.ai.key_unreadable` | 409 | La clave guardada ya no se puede descifrar (cambió el secreto) |
| `huella.ai.key_rejected` · `huella.ai.key_or_model_rejected` · `huella.ai.model_not_found` · `huella.ai.request_rejected` | 400 | El proveedor rechazó la clave, el modelo o la solicitud |
| `huella.ai.quota` | 429 | Límite de uso o saldo de la cuenta del proveedor |
| `huella.ai.unreachable` · `huella.ai.timeout` · `huella.ai.bad_response` · `huella.ai.empty_response` | 503 | Proveedor caído, lento, con respuesta ilegible o vacía |
| `huella.ai.provider_invalid_json` | 400 | La IA respondió algo que no es el JSON esperado (no se cambió nada) |

## Cómo extender (cartas, postulaciones, entrevistas)

Cuelgan de `Achievement`, `JobOffer` y `CvVersion` sin tocar su forma: una carta cita `Achievement.Id`, una postulación referencia `JobOffer` + `CvVersion` (que ya es inmutable en contenido), una entrevista parte de la oferta y de sus logros. Cada función nueva = su carpeta en `Features/` y sus tablas con `ProfileId`.

## Pendiente / no verificado

Llamada real a OpenAI y Anthropic y respuesta real de Gemini con una clave válida (con clave falsa, Gemini respondió 400 y se tradujo bien); metadatos `og:*` en servidor.
