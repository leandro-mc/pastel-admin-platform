# Huella — ficha técnica (frontend)

Estado: **MVP de Etapa 1**. Código `huella` · ruta `/huella` · icono `Footprints` · acceso `permission` (`huella.access`, solo Owner/Superuser).
Backend: `src/Modules/Huella/MODULE.md`. Producto: `docs/modules/HUELLA.md`.

## Rutas

| Ruta                   | Página                                                                                                         | Acceso                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `/huella`              | Redirige a `banco`                                                                                             | Owner con permiso             |
| `/huella/banco`        | Banco de información: notas, experiencia, proyectos, habilidades, educación, certificaciones, idiomas y logros | Owner                         |
| `/huella/cv`           | Crear CV: ofertas, mapa de evidencia, generación, versiones, edición validada, reporte, texto ATS, IA y PDF    | Owner                         |
| `/huella/perfil`       | Datos del perfil, enlaces, vista previa, publicar/despublicar, enlace                                          | Owner                         |
| `/huella/ia`           | Configurar IA: proveedor (Gemini, OpenAI, Anthropic), clave y modelo cargado desde el proveedor                | Owner                         |
| `/huella/pronto/:item` | «En preparación»: carta de recomendación, postulaciones, entrevistas (sin acciones falsas)                     | Owner                         |
| `/huella/p/:token`     | **Perfil público** (`platformRoutes`, `session: false`)                                                        | Quien tenga el enlace vigente |

## Estructura

`manifest.ts` · `strings.ts` (todos los textos) · `api/schemas.ts` (zod en el borde) · `api/hooks.ts` (TanStack Query; claves `huellaKeys`) · `pages/` · `components/` · `lib/` (huella generativa y resaltador: funciones puras con prueba).

## Reglas

- Solo se importa de `@/core/*`. Los datos viven en el servidor; no hay `localStorage`.
- El token del enlace público viaja en la cabecera `X-Huella-Token`, nunca en la ruta de la API. Al publicar o regenerar, el servidor lo entrega **una sola vez**; la UI lo guarda en memoria y lo pierde al salir.
- La página pública añade `robots: noindex, nofollow, noarchive` y `referrer: no-referrer`; los enlaces externos usan `rel="noopener noreferrer"` y solo `http(s)`.
- Las guardas se hacen en el servidor; la UI solo oculta lo que no corresponde.
- **CSS propio:** `components/public-profile.css` es la única excepción a «sin CSS propio». El perfil público es una identidad de lectura (papel, tinta, marcador amarillo; sin morado ni degradados) que las utilidades del sistema no expresan; se limita a `.hp` y no afecta al resto del panel.
- **PDF:** se descarga con `api.blob` (misma sesión y refresco que el resto de la API), no con un enlace directo. Si `pdfAvailable` es falso, la UI ofrece el texto ATS y explica que el PDF no está disponible en ese servidor.
- **IA (`components/AiWorkbench.tsx`):** tres caminos con las mismas reglas: (1) «Mejorar con …» usa el proveedor activo; (2) «Descargar .md/.txt» o «Copiar» entrega el **mismo prompt** que recibe el proveedor, para pegarlo en una IA externa; (3) importar la respuesta desde un archivo (`.json`, `.txt`, `.md`, máx. 60 000 caracteres) o pegada. El servidor valida todo; lo rechazado se lista. Sin iconografía de IA.
- **Clave de IA:** el campo es de contraseña, no se guarda en el navegador y la API nunca la devuelve (solo sus 4 últimos caracteres). Las llamadas `ai-run` usan un tiempo máximo de 150 s (`timeoutMs`).

## Pruebas

`web/tests/components/huella.test.tsx`: resaltador (tildes, palabra completa, límites), huella determinista, enlaces seguros, contacto ausente cuando el servidor no lo envía, evidencia declarada como «sin evidencia».

## Pendiente

Tema propio de Huella en `module-themes.css` (zona compartida: propuesta en el PR), metadatos `og:*` (servidor/nginx), revisión visual en navegador real (320 px, claro/oscuro, impresión).
