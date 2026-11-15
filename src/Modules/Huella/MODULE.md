# Huella — ficha técnica (backend)

Estado: **MVP de Etapa 1 implementado** (banco, estudio de CV, perfil público). PDF pendiente de CCR-2.

- Código `huella` · esquema `huella` · API `/api/huella` · proyecto `Pastel.Modules.Huella`.
- Producto: `docs/modules/HUELLA.md`. Frontend: `web/src/modules/huella/MODULE.md`.

## Permisos y aislamiento

`huella.access` (entrar) y `huella.profile.manage` (editar/publicar) solo para el rol de sistema `Owner/Superuser` (`OwnerAccountOnly`). Sin invitados ni delegación.
Toda lectura/escritura privada pasa por el perfil del Owner de la sesión (`ProfileId`); un identificador de otro perfil responde **404** (nunca 403, para no confirmar su existencia).

## Endpoints (`/api/huella`)

| Ruta | Para qué |
|---|---|
| `GET/PUT /profile` | Perfil y enlaces (máx. 8; solo `https`); contacto, ubicación y disponibilidad con interruptor, ocultos por defecto |
| `GET /bank` · `PUT /bank/{notes\|experiences\|projects\|skills\|education\|certifications\|languages}` | Banco completo / reemplazo de una sección |
| `PUT /bank/{experiences\|projects}/{id}/achievements` | Logros de una experiencia o proyecto |
| `POST …/{id}/derive` · `…/ai-package` · `…/ai-result` | Logros por reglas, paquete para IA manual, validación del JSON pegado |
| `GET/POST /studio/offers` · `GET/DELETE …/{id}` | Ofertas (texto = dato no confiable; máx. 50) con mapa de evidencia y filtros duros |
| `GET/POST /studio/versions` · `GET/DELETE …/{id}` | Versiones de CV (máx. 60) |
| `PUT …/{id}/name` · `/line` · `/public?isPublic=` | Renombrar, editar una línea (pasa por el guardián), marcar CV público |
| `POST …/{id}/ai-package` · `/ai-result` | Redacción con IA manual: JSON validado, nunca Typst |
| `GET …/{id}/pdf` | `503 huella.cv.renderer_unavailable` hasta CCR-2 |
| `GET /publication` · `/publication/preview` | Estado y vista previa del borrador |
| `POST /publication/publish` · `/unpublish` · `/link` | Publicar, retirar, regenerar enlace (el token solo viaja en esa respuesta) |
| `GET /public/profile` · `/public/cv` | **Anónimas**; token en la cabecera `X-Huella-Token` |

## Reglas que no se rompen

- **Token:** 32 bytes aleatorios, Base64URL (43 car.); en BD solo SHA-256. No va en rutas de API, logs ni auditoría. Regenerar invalida el anterior al instante.
- **404 uniforme** `huella.public.not_found` (ausente, mal formado, despublicado, revocado) con `X-Robots-Tag: noindex, nofollow, noarchive` y `Referrer-Policy: no-referrer`. Límite `huella-public`: 30/min por IP.
- **Publicación:** `PublishedSnapshot` congelado (se conservan 5); lo editado después no aparece hasta publicar de nuevo. `ContentHash` detecta cambios sin publicar. La semilla de la huella son 8 bytes del hash.
- **Perfil público:** lista blanca (`PublicProfileBuilder`); solo logros `public|both`; sin notas privadas, ofertas ni versiones no públicas.
- **CV:** la IA solo produce JSON. `CvGuardian` rechaza líneas sin `sourceIds` del banco, con cifras que el banco no tiene, frases prohibidas o sobre el tope. `CvLayout.Fit` ajusta por escalera sin llamar a la IA. `ICvRenderer` → `UnavailableCvRenderer` hasta CCR-2.
- **Entradas:** límites de longitud, etiquetas HTML y esquemas peligrosos neutralizados (`InputSafety`).
- **Auditoría:** `huella.profile.published`, `huella.profile.unpublished`, `huella.link.regenerated` (sin token).

## Datos (esquema `huella`)

`Profile` (único por `OwnerUserId`, `PublicTokenHash` único) · `ProfileLink` · `PrivateNote` · `Experience` · `Project` · `Skill` · `Education` · `Certification` · `LanguageSkill` · `Achievement` + `AchievementSkill` (el logro es la unidad: de ahí salen CV, perfil y futuras funciones) · `JobOffer` · `CvVersion` · `PublishedSnapshot`.
Migraciones: `InitialHuellaSchema` y `AddHuellaProfileModel`. **Escritas desde un generador, sin `dotnet ef`:** ejecutar `dotnet ef migrations has-pending-model-changes` antes de integrar.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `huella.resource.not_found` | 404 | Recurso inexistente o de otro perfil |
| `huella.public.not_found` | 404 | Enlace no disponible (un solo mensaje para todos los motivos) |
| `huella.session.required` | 401 | Sin sesión |
| `huella.input.invalid` | 400 | Campos inválidos (`errors` por campo) |
| `huella.publication.empty` | 400 | Falta nombre o titular para publicar |
| `huella.cv.empty_bank` | 400 | Sin logros para generar un CV |
| `huella.cv.line_rejected` | 400 | El guardián rechazó la línea |
| `huella.cv.not_public` | 404 | La publicación no incluye CV |
| `huella.ai.invalid_json` | 400 | El JSON pegado no es válido |
| `huella.cv.renderer_unavailable` | 503 | PDF no disponible (CCR-2) |

## Cómo extender (cartas, postulaciones, entrevistas)

Cuelgan de `Achievement`, `JobOffer` y `CvVersion` sin tocar su forma: una carta cita `Achievement.Id`, una postulación referencia `JobOffer` + `CvVersion` (que ya es inmutable en contenido), una entrevista parte de la oferta y de sus logros. Cada función nueva = su carpeta en `Features/` y sus tablas con `ProfileId`.

## Pendiente / no verificado

IA automática (Gemini) y su política de datos; PDF (CCR-2); metadatos `og:*` en servidor; compilación net10 real, migración y pruebas de integración con PostgreSQL no ejecutadas en el entorno de desarrollo (ver PR).
