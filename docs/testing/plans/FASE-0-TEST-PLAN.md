# Plan de pruebas — Fase 0 (base modular, seguridad, Google, Tailwind, errores y logs)

Autor inicial: orquestador (independiente de Dev). **El agente de QA lo amplía** con los casos de lo que se implementó (a partir de los datos que deja el Agente 0 en `docs/phase0/PROGRESS.md`), pero **no puede quitar ni debilitar** los casos obligatorios. Lo ejecuta un agente de QA distinto (ver `docs/TESTING_STRATEGY.md`).

Prioridad: **O** obligatorio · **I** importante · **D** deseable. Tipos como en `TEST_PLAN_TEMPLATE.md`.

## 1. Cómo ejecutar
Para probar desde una base vacía, use un proyecto Compose aislado con puertos temporales y no elimine el volumen del proyecto de desarrollo. Ejemplo en PowerShell: `$env:ASPNETCORE_ENVIRONMENT="Testing"; $env:WEB_PORT="18080"; $env:POSTGRES_PORT="15435"; $env:APP_PUBLIC_BASE_URL="http://localhost:18080"; docker compose -p pastel-fase0-qa up -d --build`. Al terminar, `docker compose -p pastel-fase0-qa down` (sin `-v`). Cuentas: administrador de arranque + usuarios de prueba creados por el sembrador `Testing` (el Agente 0 los deja en `docs/phase0/PROGRESS.md`; QA los incorpora aquí). Pruebas automatizadas: `dotnet test`, `npm test`, `npm run test:e2e`.

## 2. Estructura y arranque
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-001 | F | O | Arranque desde base vacía | Migraciones de todos los esquemas (`identity`, `brisa`, `balance`, `agora`, `cosecha`, `huella`), semilla, `/health/live` y `/health/ready` en 200 |
| F0-002 | E | O | Detener PostgreSQL con la API arriba | `/health/ready` falla; peticiones devuelven 503 `problem+json` con `traceId`; la API se recupera al volver la base |
| F0-003 | F | O | `dotnet build -p:PastelModules=<m>` y `PASTEL_MODULES=<m> npm run build` para cada módulo | Compila y el bundle contiene solo Identity y ese módulo |
| F0-004 | F | O | Matriz de aislamiento en CI | Cada módulo compila y pasa sus pruebas con los demás eliminados |
| F0-005 | F | O | Hub | Muestra solo los módulos permitidos al usuario; anónimo ve solo lo público |
| F0-006 | S | O | `Testing` seeder con `ASPNETCORE_ENVIRONMENT=Production` | Se niega a ejecutarse (hay prueba automatizada) |

## 3. Seguridad — jerarquía de privilegios (S1)
Actores: **Admin**, **Gestor-usuarios** (rol no administrador con `settings.users.update`, `settings.users.reset_password`, `settings.users.block`), **Gestor-roles** (con `settings.roles.update`).
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-S101 | P | O | Gestor-usuarios asigna rol Administrator a sí mismo | 403 `identity.privilege.escalation`; sin cambios; auditado |
| F0-S102 | P | O | Gestor-usuarios asigna Administrator a otro usuario | 403 |
| F0-S103 | P | O | Admin asigna Administrator a un usuario | 200; auditado con antes/después |
| F0-S104 | P | O | Gestor-usuarios restablece la contraseña de un Administrator | 403; no se genera contraseña temporal |
| F0-S105 | P | O | Gestor-usuarios restablece la contraseña de un usuario normal | 200 y funciona; no puede restablecer la propia por este camino |
| F0-S106 | P | O | Gestor-roles agrega a un rol un permiso que él no posee | 403 (regla "solo concedes lo que tienes") |
| F0-S107 | P | O | Gestor-roles agrega un permiso que sí posee | 200; auditado con permisos añadidos |
| F0-S108 | P | O | Gestor-roles modifica un rol que él mismo tiene | 403 |
| F0-S109 | P | O | Gestor-usuarios se concede a sí mismo permisos por excepción | 403 |
| F0-S110 | P | O | Gestor-usuarios concede por excepción un permiso que no posee, a otro usuario | 403 |
| F0-S111 | P | O | Gestor-usuarios bloquea a un Administrator | 403 |
| F0-S112 | P | O | Cualquier actor se bloquea a sí mismo | 403 |
| F0-S113 | S | O | Dos administradores se bloquean mutuamente a la vez (concurrencia) | Al menos uno queda activo; nunca cero administradores activos |
| F0-S114 | S | O | Quitar el rol Administrator al último administrador | Rechazado con `identity.user.last_admin` |
| F0-S115 | S | I | Reinicio de la API con el administrador de arranque sin rol | El rol se restaura **y queda auditado** (`identity.bootstrap.admin_restored`) |
| F0-S116 | P | O | Cada endpoint de `/api/admin/*` sin permiso, sin sesión y con permiso parcial | 401 / 403 según corresponda (matriz completa automatizada) |

## 4. Seguridad — sesión, refresco y cuentas (S2, S3, S4)
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-S201 | F | O | Sesión abierta > 10 min usando la app | El refresco ocurre solo; el usuario no ve errores 401 |
| F0-S202 | F | O | 5 peticiones simultáneas con el acceso vencido | **Exactamente una** llamada a `/api/auth/refresh`; todas se reintentan con éxito |
| F0-S203 | S | O | Dos pestañas refrescan con la misma cookie dentro de la ventana de gracia | Ambas obtienen sesión válida; **no** se revocan sesiones |
| F0-S204 | S | O | Reutilización de un refresh token fuera de la ventana de gracia | Se revocan todas las sesiones, `TokenVersion` aumenta, evento Warning y auditoría |
| F0-S205 | E | O | Conflicto de serialización simulado en el refresco | Reintento; si se agota 503/409, **nunca 500** |
| F0-S206 | S | O | Refresh fallido definitivo | Pantalla de inicio de sesión con "Su sesión venció" y retorno a la ruta |
| F0-S207 | S | O | Tiempos de respuesta de login con correo inexistente vs. existente con clave errónea | Ambos recorren el cálculo del hash (comprobable con doble de prueba) y devuelven el mismo mensaje y estado |
| F0-S208 | S | O | Bloqueo por intentos fallidos al correo del administrador | El bloqueo afecta solo al inicio por contraseña; el inicio con Google no se ve afectado; hay espera creciente, no solo bloqueo fijo |
| F0-S209 | S | O | Arranque en `Production` con el correo de arranque por defecto (`admin@pastel.local`) o la clave JWT de ejemplo | La aplicación **no arranca** con mensaje claro |
| F0-S210 | S | O | Autorregistro por contraseña con la configuración por defecto | Deshabilitado (404/403); `/api/auth/options` lo indica |
| F0-S211 | V | O | Política de contraseña | Longitud mínima y rechazo de contraseñas comunes; **sin** reglas de composición; el cliente usa la misma política que el servidor |
| F0-S212 | S | I | Un administrador degradado conserva excepciones antiguas | No tienen efecto indebido (se ignoran o se limpian) |
| F0-S213 | S | O | CSRF: escritura sin cabecera / con cabecera inválida | 403; con cabecera válida, 200 |
| F0-S214 | S | O | Cabeceras de seguridad | Presentes **una sola vez** (sin duplicados nginx/API) |

## 5. Google OAuth
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-G01 | F | O | **Manual real:** "Continuar con Google" con cuenta nueva | Crea `Member` sin contraseña, sesión iniciada, vuelve a la ruta pedida |
| F0-G02 | F | O | **Manual real:** cuenta con el correo del administrador de arranque | Se vincula a la cuenta existente; contraseña temporal invalidada; auditado |
| F0-G03 | S | O | `redirect_uri` que envía la aplicación | Coincide exactamente con `App:PublicBaseUrl` + `/api/auth/google/callback` |
| F0-G04 | S | O | `returnUrl` malicioso (`//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:`) | Se ignora y se redirige a `/` |
| F0-G05 | S | O | `state` alterado o ausente en el callback | Rechazado; redirige a `/ingresar?error=failed` |
| F0-G06 | S | O | Correo no verificado por Google | `email_unverified` |
| F0-G07 | S | O | Cuenta bloqueada o inactiva | `account_disabled` con mensaje genérico |
| F0-G08 | F | O | `AllowSignUp=false` y correo nuevo | `signup_closed` |
| F0-G09 | S | O | Tokens de Google | No se almacenan (base, cookies, logs) |
| F0-G10 | L | O | Logs durante el flujo | Sin `code`, `state`, tokens ni correos |
| F0-G11 | F | O | Sin credenciales de Google configuradas | La app arranca; `options.google=false`; el botón no aparece |
| F0-G12 | X | O | Pantalla `/ingresar` | Botón grande y claro, mensajes de error comprensibles por código, teclado completo |

## 6. Errores y logs
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-E01 | E | O | Provocar cada tipo de error (validación, 401, 403, 404, 409 único, 409 concurrencia, 429, 500) | `problem+json` con `code`, `traceId`; mensajes en español con la acción posible; sin detalles internos |
| F0-E02 | E | O | Excepción inesperada simulada | 500 genérico; el log contiene excepción y el mismo `traceId`; la respuesta **no** contiene `ex.Message` |
| F0-E03 | E | O | Correo duplicado bajo concurrencia (dos registros simultáneos) | 409 limpio, no 500 |
| F0-E04 | E | O | Dos administradores editan el mismo rol | El segundo recibe 409 de concurrencia |
| F0-E05 | L | O | Revisar logs de login, refresco, callback, cambio de contraseña | Sin contraseñas, hashes, tokens, cookies, `code`, `state` ni correos completos |
| F0-E06 | L | O | Formato de log | JSON con `TraceId`, `UserId`, `Module`, `ClientIp`; una línea de resumen por petición; sin cuerpos |
| F0-E07 | L | O | Eventos de seguridad (sección 4.5 del estándar) | Cada uno genera log y auditoría con antes/después en `DetailsJson` |
| F0-E08 | L | O | Acceso denegado repetido | Se registra con límite; no inunda el log |
| F0-E09 | F | O | `POST /api/client-errors` | Respeta tamaño y límite de tasa; registra Warning; no guarda en base |
| F0-E10 | F | O | Error de render en una pantalla de un módulo | `errorElement` con código de soporte; el shell y los demás módulos siguen funcionando |
| F0-E11 | F | I | Retención: tokens vencidos | La tarea periódica los elimina; auditoría con retención configurable |
| F0-E12 | F | O | Auditoría y listado de usuarios | Paginación y filtros en el servidor |

## 7. Frontend, Tailwind y accesibilidad
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-W01 | F | O | Navegación | URLs reales por pantalla; recargar y enlaces directos funcionan; atrás/adelante coherentes; cero navegación por estado |
| F0-W02 | F | O | Filtros de Configuración | Persisten en la URL |
| F0-W03 | F | O | **Auditoría Tailwind** (`scripts/tailwind-audit.mjs`, antes y después) | Sin CSS global heredado de conveniencia; clases semánticas solo en `core/design/components/`; `@apply` únicamente en `base.css`; sin morado, símbolos de IA ni colores sueltos. La proporción de utilidades, clases usadas una vez, volumen de `@apply` y líneas por CSS se reportan como métricas informativas, no como bloqueos aislados. |
| F0-W04 | F | O | Paridad visual | Capturas antes/después de las pantallas de Identity: sin regresiones visuales no intencionadas, claro y oscuro |
| F0-W05 | X | O | Diálogos | `Escape` cierra; el foco queda atrapado dentro; vuelve al elemento que abrió; título accesible |
| F0-W06 | X | O | Teclado completo, foco visible ≥ 3 px, enlace "Saltar al contenido", foco al `h1` al cambiar de ruta | Cumple |
| F0-W07 | X | O | 320 px, zoom 200 %, texto "Muy grande", claro y oscuro | Sin pérdida de contenido ni desplazamiento horizontal |
| F0-W08 | X | O | Contraste de tokens (texto 4,5:1; componentes 3:1), incluido `--muted` | Cumple en ambos temas y en los cinco módulos |
| F0-W09 | U | D | Tono de los textos | **Retirado como requisito obligatorio por decisión del propietario (2026-10-21):** el voseo se permite cuando el propietario lo solicite; no hay prueba ni revisión obligatoria |
| F0-W10 | S | O | Prohibiciones de diseño | `scripts/check-design.mjs` sin hallazgos: sin morado (235°–345°), sin iconos/emojis de IA, sin hexadecimales sueltos |
| F0-W11 | F | I | Respuestas de la API | Validadas con `zod` en el borde; una respuesta malformada produce error controlado, no pantalla en blanco |
| F0-W12 | U | O | Tamaño de texto y tema | Se aplican, persisten y no almacenan nada sensible |
| F0-W13 | N | I | Carga | Rutas de módulos con carga diferida; el bundle inicial no incluye módulos que el usuario no abre |

## 8. Infraestructura y repositorio
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-I01 | F | O | `web/Dockerfile`, CI y documentación | Usan `npm ci` con `package-lock.json` |
| F0-I02 | S | O | PostgreSQL en `compose.yaml` | **No** publicado en el stack principal; solo en `compose.override.yaml` de desarrollo |
| F0-I03 | F | O | `healthcheck` en `api` y `web`; `cap_drop: [ALL]`; límites de recursos; rotación de logs de Docker | Presentes |
| F0-I04 | F | O | `AllowedHosts` y red de proxy confiable | Configurables por variable; sin depender de IP fijas del compose |
| F0-I05 | F | I | IP real del cliente detrás de un proxy | La limitación de tasa y la auditoría usan la IP real (probado con cabecera simulada) |
| F0-I06 | F | O | nginx | Compresión y caché de activos con hash; cabeceras sin duplicados |
| F0-I07 | F | O | CI | `workflow_dispatch` manual que exige `confirm_validation=true`, sin triggers de `push` ni `pull_request`; `concurrency` con cancelación, `timeout-minutes`, `dotnet format --verify-no-changes`, auditoría de paquetes .NET y `npm audit` |
| F0-I08 | F | I | `.editorconfig`, `.gitattributes`, `Directory.Packages.props` | Presentes y aplicados |
| F0-I09 | F | O | Secretos | Ningún secreto ni `.env` en el diff; `.env.example` con valores de ejemplo no válidos en producción |

## 9. Regresión de Identity (paridad con `dev`)
| ID | Tipo | P | Caso | Esperado |
|---|---|---|---|---|
| F0-R01 | F | O | Registro (si se habilita), login, logout, cambio de contraseña forzado | Igual que antes |
| F0-R02 | F | O | Administración de usuarios: crear, editar, bloquear, restablecer, roles, excepciones | Igual que antes, con las nuevas reglas de jerarquía |
| F0-R03 | F | O | Roles y permisos, módulos (activar/desactivar), auditoría | Igual que antes; **sin** creación dinámica de módulos |
| F0-R04 | F | O | Editor de accesos de pantalla completa (Heredar / Conceder / Denegar) | Mismo comportamiento y barra de acciones fija |
| F0-R05 | F | O | Lista de endpoints antes y después | Misma superficie (salvo los nuevos de Google, `options` y `client-errors`, y sin `CreateModule`) |

## 10. Cartas exploratorias
1. Intentar escalar privilegios como un gestor con permisos parciales por todos los caminos posibles (UI y API).
2. Dejar la aplicación abierta 30 minutos con varias pestañas y actuar en todas.
3. Romper el inicio de sesión con Google de formas creativas (cancelar, volver atrás, repetir el callback).
4. Recorrer el hub y Configuración solo con teclado y con texto "Muy grande".
5. Provocar errores de red y de servidor y evaluar si los mensajes son claros para una persona no técnica.

## 11. Criterios de salida de la Fase 0
Todos los casos **O** en verde; 0 defectos Críticos/Altos; los Medios, aceptados por el propietario; informe de QA aprobado sobre el SHA final de `refactor/modular-foundation`.
