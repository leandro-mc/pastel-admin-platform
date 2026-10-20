# Fase 0 — Refactor de la base (instrucciones para el agente responsable de código, rol **Dev**)

Esta fase se ejecuta por responsabilidades y puede haber relevos: el Agente 0 (Dev) implementa el código de aplicación y **puede compilar/probar si su entorno lo permite**; si no, entrega sin compilar y lo declara en `PROGRESS.md`. Después un agente con entorno de compilación realiza Build y las pruebas. En esta etapa, **Build y QA pueden ser la misma sesión/agente** para ahorrar sesiones; debe completar ambas responsabilidades y ejecutar de nuevo las validaciones afectadas tras cualquier corrección. Consulte `docs/testing/plans/FASE-0-TEST-PLAN.md` y `docs/TESTING_STRATEGY.md`.

## 0. Autorización y contexto

- El propietario autoriza expresamente los cambios de arquitectura, tecnología y estructura descritos aquí. Esta autorización **prevalece** sobre las reglas anteriores ("no cambies la arquitectura por iniciativa propia"). Fuera de lo descrito, siguen vigentes.
- **Entrada obligatoria:** `docs/phase0/ANALISIS-ESTADO-DEV.md` (análisis independiente de `dev` en el commit `b705614`). Sus hallazgos S1–S4, B1–B5, T1, F1–F4, D1–D2 y G1–G3 se resuelven aquí, con la prioridad pedida por el propietario: **1) seguridad, 2) migración correcta a Tailwind CSS, 3) gestión de errores y logs**. El análisis es estático: **verifica cada hallazgo en el código antes de actuar** y registra en `PROGRESS.md` los que no se confirmen.
- Estado actual: .NET 10, 4 proyectos por capas, controladores, un `AppDbContext` en `public`; React 19 + Vite 8 + Tailwind 4 **sin router** y con `styles.css` de 2 209 líneas (592 con `@apply`, 0 utilidades en JSX); nginx con CSP estricta; Docker Compose; CI de uso local.
- Documentos ya en el repositorio: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ERROR_HANDLING_AND_LOGGING.md`, `docs/TESTING_STRATEGY.md`, `docs/testing/**`, `docs/modules/*.md`, `docs/phase0/GOOGLE_OAUTH_SETUP.md`. **Léelos antes de empezar**, además de `docs/SECURITY.md`, `docs/AI_WORKFLOW.md` y el código de `AuthService`, `AdministrationService`, `PermissionAuthorization`, `DatabaseSeeder`, `Program.cs` y `web/src`.
- **Fuera de alcance:** despliegue, Oracle, TLS de producción, CI/CD de despliegue, funcionalidades de módulos, Android, mensajería, mapas. La CI de GitHub sigue siendo de uso local.


## 1. Forma de trabajo

Antes de iniciar cada tarea, el orquestador debe indicar el **tipo de agente**. Tipo 1 y Tipo 2 son cadencias de guardado; no son roles funcionales (Dev/Build/QA). Si falta la clasificación, pregunta y no continúes con cambios de implementación hasta recibirla.

1. Trabaja en la rama existente `refactor/modular-foundation`. **Nunca abras PR ni integres a `dev` sin autorización explícita del propietario**. Autorizar la apertura del PR no autoriza por sí solo el merge.
2. **Cadencia de commits por tipo:** Tipo 1 debe publicar commit + push con progreso coherente al menos cada 3 minutos, contando desde el último checkpoint publicado. Tipo 2 no tiene un límite fijo de 3 minutos: publica commits periódicos al cerrar unidades de trabajo coherentes y revisables, evitando commits mínimos por cada ajuste. En ambos casos, actualiza `PROGRESS.md` en el mismo commit cuando registre el avance, y publica antes de cambiar de tarea/contexto o ante riesgo de interrupción por tokens, tiempo o cierre de sesión. El tipo debe haber sido indicado por el orquestador; si no, pregunta antes de continuar.
3. Cada checkpoint incluye la actualización correspondiente de `docs/phase0/PROGRESS.md` **en el mismo commit que el código descrito**. Registra WP y subobjetivo, cambios/archivos, estado (completo/parcial), decisiones, validaciones realmente ejecutadas y sus comandos/resultados, lo que no se compiló/ejecutó, bloqueos y el siguiente paso concreto. No inventes el SHA del commit actual dentro del propio archivo; después de publicar, comunica el SHA resultante en la entrega. El progreso debe permitir que otro agente continúe sin este chat.
4. Flujo obligatorio de checkpoint: revisa `git status`, `git diff --check` y el diff; prepara solo archivos revisados y pertinentes; actualiza `PROGRESS.md`; crea un commit pequeño y coherente; publica inmediatamente con `git push origin refactor/modular-foundation`; confirma que el push terminó y anota el SHA. No incluyas secretos ni archivos ajenos. **No dejes código nuevo sin publicar por esperar a compilar**, pero declara honestamente si está parcial, sin compilar o sin validar. No uses force push ni reescribas historial compartido.
5. Los checkpoints formales **C2** (tras WP5), **C3** (tras WP8) y **C4** (final) son adicionales a los checkpoints frecuentes; no esperes a esos hitos para guardar. **C1** (línea base de pruebas, WP1) lo publica Build.
6. Ejecuta los WP en orden. Cada WP debe dejar código completo y coherente; Dev no necesita compilar (ver puntos 7 y 8). Build verifica las líneas de aceptación que requieren compilación o pruebas.
7. Si algo contradice el código real, confirma el comportamiento, sigue el código y registra/corrige la documentación pertinente.
8. Si una decisión no está resuelta, elige la opción más simple, regístrala en `docs/adr/` y continúa, salvo que cambie sustancialmente el alcance o la seguridad; en ese caso, documenta el bloqueo.
9. **Como Dev:** escribe código de aplicación, scripts y configuración. No escribas pruebas, planes de pruebas ni informes de aprobación; corresponden a Build/QA.
10. **Sin compilar:** el propietario retiró la exigencia de compilar para Dev. No intentes compilar ni simules resultados. Anota por WP «sin compilar» en `PROGRESS.md`. Si el entorno sí permite compilar o ejecutar algo, hazlo y reporta el comando exacto. Nunca afirmes que algo compila o pasa si no lo ejecutaste. Las migraciones de EF no se escriben a mano: déjalas a Build (`dotnet ef`); deja preparados el modelo y los `DbContext`.
11. **Pruebas:** las pruebas unitarias, de caracterización, integración, arquitectura, E2E y los planes los escribe Build o QA. Cuando un WP las nombre, prepara el código de producción que necesitan (por ejemplo, `Program` accesible, sembrador `Testing`, manejador remoto falso inyectable y etiquetas accesibles).
12. Mantén los commits revisables (evita más de ~1.500 líneas cambiadas por commit, salvo dependencias, migraciones generadas o capturas). No agrupes el WP completo en un único commit gigante.

## 2. Decisiones ya tomadas (no reabrir)

| Tema | Decisión |
|---|---|
| Estructura | Monolito modular + vertical slices (`docs/ARCHITECTURE.md`). Las capas nominales desaparecen (resuelve B2) |
| API | Minimal APIs por módulo; los controladores actuales pasan a slices |
| Base de datos | Esquema por módulo; `public` actual pasa a `identity`. **Sin datos que conservar** (solo desarrollo): regenerar la migración (la genera Build con `dotnet ef`) y reiniciar la base local |
| Módulos dinámicos | Vienen del código (`IPastelModule`); se elimina la creación desde UI/API; se conserva activar/desactivar y consultar catálogo |
| Autenticación | Google (código + PKCE) como método principal; contraseña local solo para el administrador de arranque y cuentas creadas por administración; autorregistro con contraseña **desactivado** por defecto |
| Frontend | React Router v7 (modo datos), TanStack Query, react-hook-form + zod, react-aria-components |
| **Estilos** | **Utilidades de Tailwind en JSX** (opción 1 del análisis, sección 3). Los patrones compartidos son **componentes React** (`core/ui`), no clases `@apply`. Tokens con `@theme` de Tailwind v4 |
| **Errores y logs** | Estándar de `docs/ERROR_HANDLING_AND_LOGGING.md`: `Result` + `problem+json` con `code` y `traceId`, `IExceptionHandler` único, Serilog JSON, auditoría separada |
| Paleta | Shell neutro; el verde actual pasa a ser el color de Brisa; la paleta "Brisa" antigua desaparece como concepto de plataforma |
| Tono | Español de Costa Rica; sin voseo por defecto; el módulo puede autorizar una voz más personal en su ficha/instrucciones específicas; trato de usted o impersonal como regla general |
| Modelo de pruebas | Dev y QA separados (`docs/TESTING_STRATEGY.md`) |

## 3. Estructura objetivo

```
src/Host/Pastel.Host/  (antes src/Pastel.Api)
src/BuildingBlocks/{Pastel.SharedKernel,Pastel.Platform}/
src/Modules/Identity/{Pastel.Modules.Identity,Pastel.Modules.Identity.Tests}/
src/Modules/{Brisa,Balance,Agora,Cosecha,Huella}/...      (esqueletos, WP6)
tests/{Pastel.ArchitectureTests,Pastel.IntegrationTests,e2e}/
tools/new-module/   scripts/{check-design.mjs,tailwind-audit.mjs}
web/src/{app,core,modules}/...
```
Desaparecen `Pastel.Domain`, `Pastel.Application`, `Pastel.Infrastructure` y `tests/Pastel.Application.Tests` (su contenido migra a Identity y a pruebas nuevas). Usa `git mv`.

---

## 4. WP1 — Red de seguridad (antes de mover nada) — T1 · **la ejecuta Build, no Dev**

Dev empieza directamente en WP2. Build ejecuta WP1 **sobre el SHA base** (el `dev` anterior al refactor) en un *worktree* aparte, rama `build/fase0-linea-base`, y al terminar Dev incorpora estas pruebas a la rama del refactor y las adapta (referencia a `Pastel.Host`).

1. `Directory.Packages.props` (gestión central, versiones alineadas) lo añade Dev en WP2. Build añade `Testcontainers.PostgreSql`, `Microsoft.AspNetCore.Mvc.Testing` y `NetArchTest.Rules` al crear sus proyectos de prueba.
2. `tests/Pastel.IntegrationTests/Foundation/`: fábrica `WebApplicationFactory<Program>` + PostgreSQL real (Testcontainers; el CI tiene Docker).
3. **Pruebas de caracterización** del comportamiento actual correcto: registro y login; bloqueo tras fallos; refresh con rotación; detección de reutilización; CSRF; cambio de contraseña invalida sesiones; `MustChangePassword` bloquea la API; autorización por permiso (concedido, denegado, excepción, módulo deshabilitado); administración sin permiso → 403; `/api/auth/me` con permisos efectivos; regla del último administrador.
4. **Pruebas de comportamiento seguro esperado** de S1 y S2 (casos F0-S101…S116 y F0-S201…S206 del plan) escritas ahora y marcadas `Skip` con motivo "WP4"; se activan en WP4.
5. Registra la lista de endpoints (método, ruta, política) del SHA base en el informe de build.

**Aceptación (la verifica Build):** verdes sobre el SHA base, con los comandos reales en el informe de build. **C1.**

## 5. WP2 — `SharedKernel`, `Platform`, `Host` y plataforma de errores/logs

1. `Pastel.SharedKernel`: `Result`/`Result<T>` con `Error`, `IClock`, paginación, `Guard`.
2. `Pastel.Platform`: `IPastelModule`, `PastelModuleAttribute`, `PermissionGroup`, `SuggestedRole`, `ModuleLoader`, `ICurrentUser`, `IPermissionEvaluator`, `IAuditTrail`, `RequirePermission(code)`, `AllowAnonymousExplicit()`, migrador por orden.
3. **Errores (estándar completo en `ERROR_HANDLING_AND_LOGGING.md` §2):** `IExceptionHandler` + `AddProblemDetails` que reemplaza `ExceptionHandlingMiddleware` (B3): traduce `Result`, violación única, concurrencia, serialización/interbloqueo con reintento acotado, cancelación e inesperados; `traceId` en cuerpo y cabecera `X-Trace-Id`; nunca `ex.Message`. Catálogo de códigos transversales `platform.*`.
4. **Logs (§4):** Serilog JSON a consola, enriquecimiento (`TraceId`, `UserId`, `Module`, `ClientIp`, `Environment`, `Version`), una línea de resumen por petición **sin cuerpos ni cabeceras**, exclusión de la cadena de consulta en `/api/auth/google/*`, niveles y rangos de `EventId`.
5. **Salud:** `/health/live` y `/health/ready` (base de datos + migraciones de cada módulo) (B4).
6. `POST /api/client-errors` (límites de la sección 3 del estándar).
7. `Pastel.Host`: renombrar `Pastel.Api`; `Program.cs` reducido a llamadas a métodos de extensión (`AddPastelSecurity`, `AddPastelObservability`, `AddPastelModules`, …) en lugar de 152 líneas mezcladas (B2).
8. `Pastel.Host.csproj`: referencias por *glob* a `../../Modules/*/Pastel.Modules.*/Pastel.Modules.*.csproj` (sin `*.Tests`/`*.Contracts`) filtradas por `PastelModules` (por defecto `*`; Identity siempre). La verificación de `dotnet build -p:PastelModules=Identity` es de Build.
9. Dockerfiles y `compose.yaml`: argumento `PASTEL_MODULES` hacia backend y frontend.

**Aceptación (la verifica Build):** compila; WP1 sigue verde; pruebas nuevas de la traducción de errores y de la redacción de logs (F0-E01…E09).

## 6. WP3 — Módulo Identity

Mueve todo lo de seguridad a `src/Modules/Identity/Pastel.Modules.Identity`.
1. **Datos:** `IdentityDbContext` con `HasDefaultSchema("identity")`; **nueva** migración inicial generada con EF (no a mano); `PasswordHash` pasa a nullable; token de concurrencia (`xmin`) en entidades editables (B4).
2. **Slices:** `Features/<VerboSustantivo>/` (Login, Register, Refresh, Logout, GetCurrentUser, ChangePassword, ListUsers, CreateUser, SetUserRoles, …), archivos ≤ ~200 líneas. **Mantén rutas, contratos JSON y cookies** (`/api/auth/*`, `/api/admin/*`).
3. **Permisos:** un único `IPermissionEvaluator` (módulo habilitado → denegación individual → concesión individual → rol) usado por el manejador de autorización **y** por `/api/auth/me` (hoy duplicados). **Meta B1:** una proyección única del estado de sesión (activo, versión de token, cambio de contraseña obligatorio) por petición, en `HttpContext.Items`, usada por `OnTokenValidated` y `ForcePasswordChange`, más una consulta de permisos: **máximo 2 consultas por petición autenticada**, verificado con una prueba que cuente consultas.
4. **Catálogo desde código:** `IdentityModule` declara los grupos `dashboard` y `settings` con los permisos actuales (**no cambies códigos existentes**). Sincronización genérica e idempotente de los módulos cargados (módulos y permisos faltantes, todo a `Administrator`, `SuggestedRoles` solo si no existen, nunca pisar ediciones). `Member` recibe `dashboard.view`.
5. Retirar `CreateModule` (comando, endpoint y diálogo); conservar listar, ver permisos y activar/desactivar.
6. **Auditoría (B5):** `IAuditTrail` con módulo de origen, `TraceId` y **`DetailsJson` con antes/después**; auditar accesos denegados (con límite); listados de auditoría y de usuarios **paginados y filtrados en el servidor**.
7. Mueve con `git mv` las pruebas unitarias existentes a `Pastel.Modules.Identity.Tests` (Build las adapta y ejecuta).

**Aceptación (la verifica Build):** WP1 verde (sin las que esperan WP4); misma lista de endpoints (salvo `CreateModule`); migración desde base vacía correcta.

## 7. WP4 — Endurecimiento de seguridad (prioridad 1)

Implementa los cambios de código de seguridad; Build activa las pruebas `Skip` de WP1. Cada punto cita el hallazgo.

**S1 — Jerarquía de privilegios** (`IPrivilegeGuard` en Identity, aplicado en todas las acciones de administración):
1. Quien **no** es Administrator no puede: asignar/quitar el rol Administrator; actuar (restablecer contraseña, bloquear, cambiar roles o excepciones) sobre una cuenta Administrator; actuar sobre **sí mismo** en roles, excepciones, restablecimiento y bloqueo; conceder (a un rol o por excepción) un permiso que **no posee**; modificar un rol que **él mismo tiene**.
2. El rol Administrator es de sistema e inmutable. Se conserva la invariante del último administrador activo (transacción serializable) y se prueba bajo concurrencia.
3. Toda denegación: 403 con `code` `identity.privilege.*`, Warning y auditoría. Los éxitos se auditan con antes/después.
4. El sembrador que devuelve el rol Administrator al correo de arranque **audita** el evento (`identity.bootstrap.admin_restored`) y lo documenta como *break-glass* en `SECURITY.md`.
5. Las excepciones de un usuario promovido a administrador se ignoran o se limpian.

**S2 — Refresco de sesión:**
1. Frontend (en WP7): refresco automático ante 401 con **una sola petición en vuelo** (*single-flight*); si falla, ir a `/ingresar` con "Su sesión venció" y retorno.
2. Backend `RefreshAsync`: **ventana de gracia** configurable (`Auth:Refresh:ReuseGraceSeconds`, por defecto 10) para uso concurrente legítimo (dos pestañas); fuera de ella se mantiene la detección de reutilización (revocar sesiones, incrementar `TokenVersion`). Reintento acotado ante fallo de serialización (40001); nunca 500. Documenta el diseño en un ADR.

**S3 — Bloqueo, enumeración y registro:**
1. Login: calcular siempre el hash (hash ficticio si el correo no existe) para igualar tiempos; mismo mensaje y estado.
2. Bloqueo **solo del inicio por contraseña**, con espera creciente en lugar de bloqueo fijo; Google no se ve afectado; el bloqueo de un administrador no impide el *break-glass* documentado.
3. En `Production`, **no arrancar** si el correo de arranque es el valor por defecto (`admin@pastel.local`) o si la clave JWT es la de ejemplo.
4. Autorregistro por contraseña desactivado por defecto (`Auth:Local:SelfRegistrationEnabled=false`); el registro por Google se controla con `Auth:Google:AllowSignUp`.
5. Límite por cuenta en el servidor además del de nginx (que es por IP y comparte NAT).

**S4 — Detalles:**
1. Rechazar en producción las claves JWT conocidas (placeholders de `.env.example`) y admitir **rotación con `kid`** (clave actual + anterior).
2. Política de contraseñas al estilo NIST 800-63B: longitud mínima 12, máxima ≥ 64, frases permitidas, lista embebida de contraseñas comunes; **sin reglas de composición**. Una sola fuente de verdad: el cliente la lee de `/api/auth/options` (se elimina la duplicación de `App.tsx`).
3. Limpieza periódica de refresh tokens vencidos (>30 días) y retención de auditoría configurable (B5).

**D1 backend:** `AllowedHosts` configurable por variable; red de proxy confiable por **subred** (no IP fija); IP real del cliente validada para límites de tasa y auditoría.

**Aceptación (la verifica Build):** todas las pruebas de las secciones 3 y 4 del plan de la Fase 0 pasan.

## 8. WP5 — Google OAuth 2.0 / OIDC

### 8.1 Flujo (backend)
- Paquete `Microsoft.AspNetCore.Authentication.Google` alineado con 10.0.x. Esquemas `Google` (remoto, `SignInScheme="ExternalCookie"`) y `ExternalCookie` (cookie `__Host-pastel_ext`, `HttpOnly`, `Secure`, `SameSite=Lax`, 5 min). `Scope`: `openid email profile`. `SaveTokens=false`. PKCE activo (verifica). `CallbackPath=/api/auth/google/callback`.
- GET públicos con límite de tasa: `/api/auth/google/start?returnUrl=…` → valida `returnUrl` → `Challenge`; `/api/auth/google/complete` → toma la identidad del `ExternalCookie`, aplica la lógica de 8.2, emite **las mismas cookies de sesión**, limpia la cookie externa y redirige; `GET /api/auth/options` → `{ google, localLogin, localRegistration, passwordPolicy }`.
- `returnUrl`: solo rutas relativas internas (empiezan por `/`, no `//` ni `/\`), sin esquema ni host, primer segmento conocido; si no, `/`.
- Errores: redirigir a `/ingresar?error=<codigo>` (`google_denied`, `email_unverified`, `account_disabled`, `signup_closed`, `failed`); el frontend los traduce a mensajes claros.

### 8.2 Reglas de cuenta
Tabla `identity.external_logins` (`id`, `user_id`, `provider`, `provider_subject`, `email_at_link`, `email_verified`, `created_at`, `last_login_at`; único `(provider, provider_subject)`).

| Situación | Resultado |
|---|---|
| Vínculo existente por `sub` | Iniciar sesión (cuenta activa y no bloqueada) |
| Sin vínculo, correo no verificado | `email_unverified` |
| Sin vínculo, existe cuenta con ese correo | **Vincular**; invalidar contraseña temporal (`PasswordHash` nulo, `MustChangePassword=false`, `TokenVersion++`, revocar refresh tokens); auditar `auth.google.linked` |
| Sin vínculo, correo nuevo y `AllowSignUp` | Crear `Member` sin contraseña; auditar `auth.google.registered` |
| Sin vínculo, correo nuevo y no `AllowSignUp` | `signup_closed` |
| Cuenta inactiva/bloqueada | `account_disabled` (mensaje genérico) |

### 8.3 Configuración y red
- Claves: `Authentication:Google:ClientId`, `Authentication:Google:ClientSecret`, `Auth:Google:AllowSignUp` (true), `Auth:Local:Enabled` (true), `Auth:Local:SelfRegistrationEnabled` (false), `App:PublicBaseUrl`. Variables en `.env.example` y `compose.yaml` sin valores reales; en desarrollo `user-secrets`. Sin credenciales, Google se desactiva y la app arranca.
- **nginx:** `proxy_set_header Host $http_host;` y `X-Forwarded-Host $http_host` (con `$host` se pierde el puerto y el `redirect_uri` no coincide con el registrado). `XForwardedHost` habilitado solo desde el proxy confiable. Rutas de Google dentro del límite de tasa. **Prueba** de que el `redirect_uri` coincide con `App:PublicBaseUrl` + `/api/auth/google/callback`.
- Comportamiento conocido: tras volver de Google, las cookies `SameSite=Strict` no viajan en esa primera carga del HTML; no afecta, porque la SPA consulta `/api/auth/me` con `fetch` del mismo sitio. Para probar local usar Chrome, Edge o Firefox.

### 8.4 Frontend de acceso
Pantalla `/ingresar`: botón principal **"Continuar con Google"** (botón y "G" oficiales), y debajo, enlace discreto "Ingresar con correo y contraseña" que despliega el formulario (solo si `localLogin`). Mensaje por código de error. Volver a la ruta protegida (`returnUrl`) tras iniciar sesión.

### 8.5 Pruebas (las escribe Build; Dev deja el manejador remoto falso inyectable)
Con un manejador remoto falso (sin llamar a Google): vínculo existente; vinculación con invalidación de contraseña temporal; alta con `AllowSignUp` activo/inactivo; correo no verificado; cuenta bloqueada; `returnUrl` malicioso; `state` inválido; Google desactivado; no se guardan tokens; atributos de cookies; auditoría; **logs sin `code`, `state` ni tokens**. La verificación con Google real es manual (guía del propietario en `GOOGLE_OAUTH_SETUP.md`).

**Aceptación (la verifica Build):** pruebas verdes. **C2.**

## 9. WP6 — Esqueletos de módulos y plantilla

1. `tools/new-module/new-module.ps1` (+ `.sh`) con `Codigo` y `Nombre`: backend (proyecto, `<M>Module.cs`, `<M>Permissions.cs`, `Errors.cs`, `<M>DbContext` con esquema, migración inicial vacía, `.Tests`), frontend (`manifest.ts`, `MODULE.md`, `strings.ts`, `pages/`), `MODULE.md` backend, registro en `Pastel.slnx`.
2. Genera **brisa, balance, agora, cosecha, huella**. Cada esqueleto: declara `<codigo>.access` y los permisos y roles sugeridos de su ficha (`docs/modules/<M>.md`, "Roles y permisos"), expone `GET /api/<codigo>/ping`, tiene esquema y migración aplicados, y una página de marcador con su color, icono y nombre. Balance se llama **Balance** (el nombre antiguo "SaldApp" no se usa en código ni interfaz).
3. Los esqueletos son **lo único** que se registra en archivos compartidos (`Pastel.slnx`, temas, manifiestos, permisos), para que en la Oleada 1 cada agente solo escriba en su carpeta.

## 10. WP7 — Frontend: cimientos, sesión, errores y shell

> **Prioridad UX actualizada por CCR-003 (2026-10-19):** el shell y el acceso deben recuperar el lenguaje visual original y el modelo de subapps. La migración de estilos no autoriza a simplificar la interfaz ni a reemplazar la página inicial por un hub de tarjetas. Fuente funcional y visual: `docs/product/PASTEL-PRODUCT-AND-UX.md` y `docs/DESIGN_SYSTEM.md`.

1. Alias `@/`; instalar las bibliotecas aprobadas (verificar versiones con `npm view`); plugin de Vite `virtual:pastel-modules` filtrado por `PASTEL_MODULES`.
2. **Router** (`createBrowserRouter`): rutas de plataforma (`/`, `/ingresar`, `/cuenta`, `/configuracion/*`) y las de cada manifiesto bajo su `basePath`, con `lazy`. `errorElement` global y por ruta; páginas 403, 404 y de error con código de soporte. Guardas `RequireAuth` y `RequirePermission`. **Cero navegación por estado `screen`** (F3). Filtros y pestañas de Configuración en la URL.
3. **Cliente API** (`core/api`): `ApiError` con `status, code, detail, errors, traceId`; **refresco single-flight ante 401**; reintento solo de lecturas idempotentes; **validación con `zod`** de las respuestas (se acabó `as T`); mensajes de red amigables; conserva CSRF/cookies.
4. **Proveedores:** `AuthProvider`, `QueryClientProvider` (con manejo global de errores inesperados), tema, tamaño de texto, notificaciones.
5. **Shell (actualizado por CCR-003):** marca floral; selector desplegable con icono de actualización en la sidebar y tarjeta de la app activa debajo; la barra superior no repite el nombre de la app. Conserva ayuda, cuenta, preferencias, footer, navegación lateral en escritorio y navegación táctil en móvil; migas, "Saltar al contenido" y foco al `h1`. `/` conduce a Ágora, no a un hub de tarjetas. Workspace solo aparece para el privilegio global confirmado; las apps disponibles siguen las reglas del catálogo.
6. **Migrar Identity** a `web/src/modules/identity/`: `ProfilePage` → `/cuenta`; `Settings*` → `/configuracion/*` (`usuarios`, `roles`, `modulos`, `auditoria`, `accesos/:tipo/:id`); `ChangePasswordScreen` como ruta obligatoria; conservar la jerarquía visual original del dashboard, perfil, usuarios y permisos. El catálogo de apps no sustituye el inicio de Ágora. Sustituir `useSettingsAdmin` (466 líneas, 23 `useState`) por consultas y mutaciones de TanStack Query con invalidación. Conservar el comportamiento del editor de accesos.
7. **Textos:** normalizar al tono predeterminado de `DESIGN_SYSTEM.md` §8 (sin voseo, salvo que la ficha o instrucciones específicas del módulo autoricen una voz más personal), cadenas en `strings.ts`; corregir también los mensajes del backend y probar la regla predeterminada y sus excepciones documentadas.
8. `core/log` (envoltorio) que reporta errores a `/api/client-errors`; ESLint `no-console`.

## 11. WP8 — Recuperación visual + sistema de diseño Tailwind CSS 4 (prioridad máxima, CCR-003)

**Objetivo:** recuperar la calidad visual anterior antes de construir más componentes o continuar la fase. No se acepta una migración de estilos que reduzca la jerarquía, los controles o la identidad del producto.

**Diagnóstico de partida:** el PDF «Degradación de la interfaz.pdf» ofrece seis comparativas Antes/Ahora; el código de la interfaz anterior sigue disponible en `dev` (`web/src/styles.css`, `components/AuthScreen.tsx`, `Dashboard.tsx`, `WorkspaceLayout.tsx`, `ProfilePage.tsx` y páginas de configuración). La reimplementación de `refactor/modular-foundation` eliminó la composición anterior; no es una limitación demostrada de Tailwind.

1. **Fuente de verdad y decisiones:** seguir `docs/product/PASTEL-PRODUCT-AND-UX.md`, `docs/DESIGN_SYSTEM.md` y CCR-003. La selección de apps, privilegio global, catálogo y reglas de Huella/Cosecha siguen las decisiones confirmadas: Owner/Superuser distinto de Administrator, Huella exclusiva del Owner y retorno tras login basado en returnUrl/última app. La funcionalidad de Huella y el catálogo persistente de apps siguen pendientes hasta contar con entidades/API/migraciones y pruebas.
2. **Acceso/registro:** recuperar composición editorial de dos columnas, mensaje de marca, beneficios, ilustración floral sutil, tarjeta de formulario, mostrar/ocultar contraseña, selector de tema y footer. Mantener las rutas, `returnUrl`, errores y proveedores disponibles desde `/api/auth/options`.
3. **Shell/app:** marca floral; selector de app en la sidebar con icono de actualización y tarjeta de la app activa debajo; navegación lateral y móvil, ayuda, cuenta, tema, tamaño de texto y footer. La barra superior no repite el nombre de la app. `/` conduce a Ágora, nunca a una cuadrícula central de tarjetas. Pulsar la marca devuelve al inicio de la app activa.
4. **Pantallas:** recuperar bienvenida/inicio, cuenta/seguridad, directorio de usuarios, roles, permisos, formularios y diálogos a partir de la referencia anterior, preservando APIs y datos actuales. Mejorar la organización de permisos para distinguir agrupaciones, herencia y efectos. No crear datos ficticios ni simular persistencia aún no implementada.
5. **Tailwind 4 + CSS gobernado:** utilidades en JSX para layout, spacing, responsive y estados comunes; componentes compartidos en `core/ui`; tokens obligatorios para colores/temas; se permite CSS pequeño en `core/design/components/*.css` para composiciones complejas de marca. CSS de componentes usa tokens, no colores sueltos; sin CSS global disperso. `@apply` sigue limitado a `core/design/base.css`.
6. **Auditoría:** adaptar `scripts/tailwind-audit.mjs` para permitir clases semánticas exclusivamente en `core/design/components/`, exigir que se usen y mantener límite de 400 líneas por archivo CSS; utilidades en ≥ 95 % de los atributos `className`; `@apply` ≤ 60 líneas en `base.css` y cero fuera. `check-design.mjs` sigue bloqueando morados, símbolos de IA y valores de color fuera de tokens.
7. **Kit UI:** extraer patrones compartidos en `core/ui` después de restaurar las composiciones representativas. Como mínimo: botones, campos, selectores, checkbox, diálogo, toast/alerta, encabezados, paneles, tabs, badges y estados de carga/vacío/error. Los componentes incluyen sus estados accesibles; no empezar por un kit genérico que borre la identidad de cada pantalla.
8. **Accesibilidad:** contraste, foco visible ≥ 3 px, teclado, objetivos táctiles ≥ 44 px, 320 px, zoom 200 %, `prefers-reduced-motion`, etiquetas y errores asociados, componentes react-aria donde corresponda. Inter autoalojada.
9. **Evidencia visual:** comparar con el PDF y el código antiguo disponible en `dev`. Guardar capturas en claro/oscuro, escritorio/móvil de login/registro, inicio, usuarios, permisos/roles y cuenta. Build/QA debe recorrer los flujos en navegador; el propietario valida el resultado. CI verde por sí solo no implica aceptación visual.
10. **Framework:** mantener Tailwind por ahora. Solo considerar otra tecnología tras una comparación documentada de una pantalla representativa (fidelidad, accesibilidad, mantenibilidad, legibilidad de JSX, tamaño CSS y experiencia de agentes).

8. **Ámbitos aprobados (Owner/Administrator):** `Owner/Superuser` y `Administrator` son roles de sistema diferentes; solo el bootstrap establece/restaura Owner. Ambos reciben `platform.workspace.access`, pero Administrator conserva permisos de plataforma (`dashboard.view`, `settings.*`) y no puede asignar permisos reservados ni permisos funcionales de otra app desde Workspace. Cosecha solo la concede Owner; `huella.*` solo pertenece a Owner. Los guardas del servidor son obligatorios. Los roles de app no aparecen/editables como roles de Workspace y guardar accesos globales no puede eliminar membresías de app existentes.
9. **Acceso y retorno tras login:** `returnUrl` interno seguro tiene prioridad; si no existe, la primera entrada abre Ágora y las posteriores recuerdan la última app de producto usada. La preferencia actual vive en el navegador; no se sincroniza entre dispositivos.
10. **Huella:** la ficha define un token público opaco de alta entropía (mínimo 32 bytes aleatorios), hash almacenado, regenerable/revocable, snapshot publicado solamente y `noindex,nofollow,noarchive` en meta y `X-Robots-Tag`. El módulo sigue siendo un esqueleto; no reportar este flujo como implementado hasta añadir entidades/API/migración, vista pública y pruebas de seguridad.

**Criterios medibles (los verifica Build/QA):**
- La página raíz no es el hub de tarjetas; Ágora es la entrada por defecto y no removible.
- Se restauran composición y controles originales en acceso, shell, cuenta y administración.
- (\geq)95 % de atributos `className` con utilidades; las clases semánticas aparecen solo en `core/design/components/` y todas se usan.
- No hay CSS > 400 líneas; `@apply` ≤ 60 líneas y solo en `base.css`; sin colores sueltos ni morados/símbolos de IA.
- Capturas claras y legibles en temas claro/oscuro, escritorio y móvil, más recorrido de teclado/zoom.

**Aceptación (Build/QA y propietario):** build, lint, tests, auditorías y validación visual documentada; no declarar paridad visual sin comparativas. **C3 actualizado por CCR-003.**

## 12. WP9 — Infraestructura, CI y repositorio (D1, D2, G1–G3)

1. **Reproducibilidad:** `web/Dockerfile` copia `package-lock.json` y usa `npm ci`; CI y documentación también (D2). Dependabot sin cambios de contenido (solo surte efecto desde la rama por defecto; anotarlo).
2. **Docker/compose:** PostgreSQL **fuera** del stack principal (solo en `compose.override.yaml` de desarrollo); `healthcheck` de `api` (con `/health/ready`) y `web`; `cap_drop: [ALL]`; límites de recursos; rotación de logs (`json-file`, `max-size`/`max-file`); `depends_on` con `service_healthy`; sin IP estáticas para la confianza del proxy.
3. **nginx:** compresión y caché de activos con hash; cabeceras de seguridad sin duplicar (decide una única fuente por tipo de respuesta y documéntalo); `X-Forwarded-For` y *real IP* configurables para ir detrás de otro proxy; `Host $http_host`.
4. **CI (`ci.yml`, manual únicamente):** el workflow implementado declara solo `workflow_dispatch` y exige `confirm_validation=true`; no tiene triggers automáticos de `push` ni `pull_request`. Se mantiene deliberadamente así para evitar ejecuciones por cada checkpoint. El propietario autoriza el despacho integral después de completar el lote, revisar el diff y ejecutar localmente las comprobaciones posibles. `concurrency` cancela ejecuciones obsoletas y cada trabajo tiene `timeout-minutes`. Jobs implementados: *backend* (restore, auditoría NuGet, `dotnet format --verify-no-changes`, build Release y pruebas unitarias existentes), *frontend* (`npm ci`, `npm audit --audit-level=high`, Prettier, ESLint, build y auditorías diseño/Tailwind), *database-integration*, *container-build* (configuración Compose + build + smoke del esquema/salud) y *module-isolation* (matriz backend/frontend por subapp). El workflow opcional `.github/workflows/codeql.yml` también es manual y requiere `confirm_scan=true`; usa CodeQL v4 para C# y JavaScript/TypeScript. **Pendiente para considerar WP9 completo:** Build debe crear/ejecutar `Pastel.ArchitectureTests` y cerrar las guardas de frontera/accesibilidad/Vitest-axe indicadas en el punto 6; esas comprobaciones no deben considerarse implementadas por el mero hecho de que el workflow exista. Ningún workflow se despachó en esta tanda.
5. **Higiene:** `.editorconfig`, `.gitattributes`, `EnforceCodeStyleInBuild`, `docs/SECURITY.md` con la sección "Cómo reportar una vulnerabilidad", corrección de rutas obsoletas en docs (p. ej. `SettingsPage.tsx`).
6. **Guardarraíles (todos en CI; Dev escribe los scripts/configuración, Build las pruebas de arquitectura y Vitest):** `Pastel.ArchitectureTests` debe cubrir fronteras de backend, tipos `internal`, prefijos de permisos, `MODULE.md`, atributo de módulo y endpoints con permiso o `AllowAnonymousExplicit`; actualmente es pendiente de Build. ESLint ya prohíbe imports de una subapp hacia `@/app`/otra subapp y de `core`/shell directamente hacia `@/modules`; `scripts/check-module-boundaries.mjs` complementa esto con imports relativos y `ProjectReference` cruzados en backend. `no-console` sigue activo. La integración de `jsx-a11y`, Vitest, `vitest-axe` y el scaffold Playwright requiere la aprobación de [CCR-006](../requests/CCR-006-frontend-accessibility-and-test-tooling.md) para modificar dependencias, y que Build regenere/valide el lockfile. `scripts/check-design.mjs` controla morados 235°–345°, iconos/emojis de IA, colores sueltos y `@apply`, con ocho pruebas Node existentes. Vitest con `vitest-axe` y las pruebas de componentes aún deben implementarse por Build; no se presenta esa cobertura como existente.
7. **Scaffold E2E:** lo prepara Build (`tests/e2e` con Playwright, `@axe-core/playwright`, configuración, utilidad de inicio de sesión local por API y una prueba de humo); Dev solo deja las dependencias en `web/package.json`. Más E2E es trabajo de QA.

**Aceptación (la verifica Build):** todos los trabajos de CI en verde. Pendiente fuera de alcance (anótalo en el informe): TLS, dominio y `AllowedHosts` de producción.

## 13. WP10 — Testabilidad, documentación y datos para pruebas

1. **Sembrador `Testing`:** usuarios de prueba por rol con inicio local, solo en `Development`/`Testing`; **se niega a ejecutarse en `Production`** (Build escribe la prueba).
2. **Datos para pruebas:** en `docs/phase0/PROGRESS.md`, sección «Datos para pruebas»: cuentas de prueba (nombres y claves **de prueba**), comandos de arranque y qué implementaste, para que QA amplíe `docs/testing/plans/FASE-0-TEST-PLAN.md`. No edites ni debilites los casos obligatorios.
3. **Documentos:** `README.md` (arranque, estructura, comandos, cómo probar Google), `docs/SECURITY.md` (OAuth, vinculación, jerarquía de privilegios, *break-glass*, límites), `docs/AI_WORKFLOW.md` (protocolo en paralelo, Dev/Build/QA, CCR, `PROGRESS.md`), `docs/SPLIT_GUIDE.md` (desplegar un solo módulo), ADR 0001–0008 (`docs/adr/`: monolito modular, stack/router, Google OAuth, esquemas y migraciones, paleta, compilación por subconjunto, Tailwind, errores y logs).
4. `MODULE.md` backend y frontend de cada módulo (≤ 120 líneas, estado "marcador").
5. Elimina referencias obsoletas (`Pastel.Api`, `Pastel.Application`, paleta Brisa, `screen`, `npm install`).

## 14. Definición de terminado de Dev (puerta hacia Build)

- [ ] WP2–WP10 completos como código de aplicación (WP1 es de Build); sin exigencia de compilar.
- [ ] `PROGRESS.md` declara, por WP, qué se compiló o ejecutó y qué no.
- [ ] Hallazgos del análisis: cada uno resuelto, descartado con evidencia o diferido con motivo en `PROGRESS.md` (tabla S1–S4, B1–B5, T1, F1–F4, D1–D2, G1–G3).
- [ ] Cinco esqueletos de módulo implementados y registrados en el hub (Build verifica que compilan, migran y que la compilación aislada por módulo funciona).
- [ ] Google OAuth implementado, con un manejador remoto falso inyectable para las pruebas de Build.
- [ ] Metas de Tailwind cumplidas (sección 11) con el "antes/después" medido.
- [ ] Estándar de errores y logs implementado; sin datos sensibles en logs.
- [ ] Sin morado ni símbolos de IA; tono predeterminado sin voseo y excepciones de voz solo cuando estén autorizadas por el módulo.
- [ ] Código preparado para `docker compose up` desde base vacía (lo comprueba Build); sin `.env` ni secretos en el diff.
- [ ] «Datos para pruebas» completos en `PROGRESS.md` y **sin informe de aprobación propio**.

## 15. Informe final de Dev

Rama y SHA; resumen por WP; tabla de hallazgos del análisis (resuelto / descartado / diferido); árbol resultante; endpoints antes/después; métricas `tailwind-audit` antes/después; resultados reales de los comandos ejecutados y la lista de lo no compilado ni ejecutado; decisiones y ADR; CCR o deudas; pasos manuales para el propietario (credenciales de Google, prueba real, capturas); riesgos. **Cierra con:** "Listo para Build sobre el SHA <sha>".

## 16. Lo que NO debes hacer
Funcionalidades de módulos (solo marcadores). Desplegar o tocar Oracle. Cambiar códigos de permisos existentes ni el modelo de sesión/CSRF. Almacenar tokens en el navegador. Añadir bibliotecas fuera de la lista aprobada sin CCR. Usar morado o símbolos de IA. Escribir pruebas. Afirmar que algo compila o pasa sin haberlo ejecutado. Declarar la fase aprobada.

## 17. Relevo a Build (agente con entorno de compilación)

Tras el «Listo para Build» de Dev, un agente Build trabaja en la rama `refactor/modular-foundation` (Dev ya terminó: no hay trabajo simultáneo).

1. Ejecuta WP1 en `build/fase0-linea-base` (sección 4), valida que queda en verde sobre el SHA base y fusiona esa rama en `refactor/modular-foundation`.
2. Restaura y compila toda la solución, el frontend y las imágenes. Corrige **errores de compilación y de configuración** en el código de producto con el mínimo cambio, en commits `fix(build): …` agrupados por causa.
3. Genera con `dotnet ef` las migraciones iniciales de cada esquema y levanta el stack desde base vacía.
4. Escribe y ejecuta las pruebas que Dev no escribió: unitarias (`*.Tests`, Vitest), de arquitectura (`Pastel.ArchitectureTests`), F0-E01…E09, las de Google con manejador falso y el scaffold E2E con prueba de humo. Activa las pruebas `Skip` de WP4.
5. Si una prueba falla: si el código no cumple lo especificado, corrígelo. Si la especificación y el código chocan, o el arreglo cambia el diseño o el comportamiento acordado, **no lo cambies**: regístralo en `docs/requests/CCR-<n>-<tema>.md` y sigue.
6. Informe `docs/testing/reports/FASE-0-BUILD-<fecha>.md`: comandos exactos, resultados reales, correcciones por causa, pruebas añadidas y lo no ejecutado. **No declares la fase aprobada.** Cierra con: «Listo para QA: ejecutar `docs/testing/plans/FASE-0-TEST-PLAN.md` sobre el SHA <sha>».

Build y QA pueden ser la misma sesión/agente para ahorrar sesiones en esta etapa. Si se combinan, deben completarse ambas responsabilidades y repetirse las validaciones afectadas tras cualquier corrección de código.
