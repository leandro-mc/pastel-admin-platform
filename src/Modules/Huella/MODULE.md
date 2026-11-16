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
| `GET/PUT /profile` | Perfil y enlaces (máx. 8; solo `https`; cada uno con `icon` opcional del catálogo cerrado `LinkIcons.Keys`, `null` = el del tipo; otro valor → 400); contacto, ubicación y disponibilidad con interruptor, ocultos por defecto |
| `GET /bank` · `PUT /bank/{notes\|experiences\|projects\|skills\|education\|certifications\|languages}` | Banco completo / reemplazo de una sección |
| `PUT /bank/{experiences\|projects}/{id}/achievements` | Logros de una experiencia o proyecto |
| `POST …/{id}/derive` · `…/ai-package` · `…/ai-run` · `…/ai-result` | Logros por reglas; prompt para una IA externa; propuestas del proveedor configurado; validación del JSON importado |
| `GET/POST /studio/offers` · `GET/DELETE …/{id}` | Ofertas (texto = dato no confiable; máx. 50) con mapa de evidencia y filtros duros |
| `GET/POST /studio/versions` · `GET/DELETE …/{id}` | Versiones de CV (máx. 60) |
| `PUT …/{id}/name` · `/line` · `/public?isPublic=` | Renombrar, editar una línea (pasa por el guardián), marcar CV público |
| `POST …/{id}/ai-package` · `/ai-run` · `/ai-result` | Redacción con IA: prompt para una IA externa, ejecución con el proveedor configurado o importación del JSON; todo pasa por el guardián, nunca Typst |
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
- **Perfil público:** lista blanca (`PublicProfileBuilder`); solo logros `public|both`; sin notas privadas, ofertas ni versiones no públicas.
- **CV:** la IA solo produce JSON. `CvGuardian` rechaza líneas sin `sourceIds` del banco, con cifras que el banco no tiene, frases prohibidas o sobre el tope. `CvLayout.Fit` ajusta por escalera sin llamar a la IA. Una línea rechazada conserva la viñeta original. `TypstCvRenderer` pasa el CV como `data.json` a la plantilla fija `Cv/Templates/cv.typ` (recurso incrustado): los textos se imprimen como texto, nunca se evalúan.
- **IA automática:** el prompt es **idéntico** al que se descarga para una IA externa (`AiPackages`). Proveedores con URL fija y clave en cabecera (`Ai/AiProviders.cs`); el cuerpo de error del proveedor no se reenvía ni se registra. La clave se cifra con AES-256-GCM (`AiKeyProtector`, clave derivada de `Jwt:SigningKey` con separación de dominio y datos asociados perfil+proveedor); solo se muestran sus 4 últimos caracteres. Si el secreto rota, la clave deja de leerse (`huella.ai.key_unreadable`) y se pide de nuevo. El paquete no incluye nombre, correo, teléfono ni enlaces. Tiempo máximo 120 s (nginx da 150 s a `…/ai-run`).
- **Entradas:** límites de longitud, etiquetas HTML y esquemas peligrosos neutralizados (`TextInput`, `LinkPolicy`, `ContactRules`).
- **Auditoría:** `huella.profile.published`, `huella.profile.unpublished`, `huella.link.regenerated` (sin token).

## Datos (esquema `huella`)

`Profile` (único por `OwnerUserId`, `PublicTokenHash` único) · `ProfileLink` · `PrivateNote` · `Experience` · `Project` · `Skill` · `Education` · `Certification` · `LanguageSkill` · `Achievement` + `AchievementSkill` (el logro es la unidad: de ahí salen CV, perfil y futuras funciones) · `JobOffer` · `CvVersion` · `PublishedSnapshot` · `AiCredential` (una fila por proveedor; clave cifrada, `KeyHint`, `IsActive`).
Migraciones: `InitialHuellaSchema`, `AddHuellaProfileModel`, `AddHuellaAiCredentials`, `AddHuellaPublicLinkCipher` y `AddHuellaLinkIcon` (esta con `dotnet ef`; `has-pending-model-changes` sin cambios y las tres aplicadas en PostgreSQL por las pruebas de integración).

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
