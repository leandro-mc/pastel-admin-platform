# Fase 0 — Refactor de la base (instrucciones para el Agente 0, rol **Dev**)

Esta fase se ejecuta por responsabilidades y puede haber relevos: el Agente 0 (Dev) implementa el código de aplicación y **puede compilar/probar si su entorno lo permite**; si no, entrega sin compilar y lo declara en `PROGRESS.md`. Después un agente con entorno de compilación realiza Build y las pruebas. En esta etapa, **Build y QA pueden ser la misma sesión/agente** para ahorrar sesiones; debe completar ambas responsabilidades y ejecutar de nuevo las validaciones afectadas tras cualquier corrección. Consulte `docs/testing/plans/FASE-0-TEST-PLAN.md` y `docs/TESTING_STRATEGY.md`.

## 0. Autorización y contexto

- El propietario autoriza expresamente los cambios de arquitectura, tecnología y estructura descritos aquí. Esta autorización **prevalece** sobre las reglas anteriores ("no cambies la arquitectura por iniciativa propia"). Fuera de lo descrito, siguen vigentes.
- **Entrada obligatoria:** `docs/phase0/ANALISIS-ESTADO-DEV.md` (análisis independiente de `dev` en el commit `b705614`). Sus hallazgos S1–S4, B1–B5, T1, F1–F4, D1–D2 y G1–G3 se resuelven aquí, con la prioridad pedida por el propietario: **1) seguridad, 2) migración correcta a Tailwind CSS, 3) gestión de errores y logs**. El análisis es estático: **verifica cada hallazgo en el código antes de actuar** y registra en `PROGRESS.md` los que no se confirmen.
- Estado actual: .NET 10, 4 proyectos por capas, controladores, un `AppDbContext` en `public`; React 19 + Vite 8 + Tailwind 4 **sin router** y con `styles.css` de 2 209 líneas (592 con `@apply`, 0 utilidades en JSX); nginx con CSP estricta; Docker Compose; CI de uso local.
- Documentos ya en el repositorio: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/ERROR_HANDLING_AND_LOGGING.md`, `docs/TESTING_STRATEGY.md`, `docs/testing/**`, `docs/modules/*.md`, `docs/phase0/GOOGLE_OAUTH_SETUP.md`. **Léelos antes de empezar**, además de `docs/SECURITY.md`, `docs/AI_WORKFLOW.md` y el código de `AuthService`, `AdministrationService`, `PermissionAuthorization`, `DatabaseSeeder`, `Program.cs` y `web/src`.
- **Fuera de alcance:** despliegue, Oracle, TLS de producción, CI/CD de despliegue, funcionalidades de módulos, Android, mensajería, mapas. La CI de GitHub sigue siendo de uso local.

## 1. Forma de trabajo

1. Rama `refactor/modular-foundation` desde `dev`. **Nunca abras PR ni integres a `dev` sin autorización explícita del propietario**. Cuando autorice abrir el PR, puedes hacerlo; la autorización para abrirlo no implica por sí sola permiso para fusionarlo.
2. Mantén `docs/phase0/PROGRESS.md` como memoria operativa para relevos, no como informe que se actualiza solo al final del WP. **Actualízalo en cada checkpoint, junto con el código que describe**, cada vez que completes un subobjetivo coherente y antes de publicar el commit. Registra WP/subobjetivo actual, cambios y archivos tocados, qué está completo o parcial, decisiones, validaciones realmente ejecutadas con comandos y resultados, lo no compilado/no ejecutado, bloqueos y la siguiente acción concreta. Debe permitir que otro agente continúe sin el chat. El SHA exacto del nuevo commit se obtiene después de crearlo (`git rev-parse HEAD`) y se comunica en la entrega; no inventes su SHA ni hagas un commit vacío solo para anotarlo.
3. Ejecuta los WP **en orden**. Cada uno deja el código completo y coherente; **no necesitas compilar ni ejecutar nada** (ver los puntos 7 y 8). Las líneas «Aceptación» que hablan de compilar o de pruebas en verde las verifica Build. **Regla obligatoria de checkpoints frecuentes:** divide cada WP en subobjetivos pequeños y, al completar cada uno, actualiza `PROGRESS.md`, crea un commit con el cambio y su progreso, y haz push inmediatamente a `origin/refactor/modular-foundation`. **No esperes a terminar un WP ni a los hitos C2/C3/C4. No trabajes más de 2 minutos sin guardar progreso publicado:** si se cumplen dos minutos desde el último checkpoint, detén la implementación y guarda un checkpoint seguro, aunque sea parcial; actualiza `PROGRESS.md`, crea el commit y haz push antes de continuar. Publica antes de cambiar de tarea/contexto y en cuanto exista riesgo de interrupción por tokens o cierre de sesión. Marca explícitamente lo incompleto y sin validar. Nunca dejes código nuevo sin checkpoint solo porque no compila todavía, pero revisa `git diff --check`, `git status` y el diff preparado; no subas secretos ni archivos ajenos. Mantén commits coherentes y **revisables** (ningún commit de más de ~1 500 líneas cambiadas, salvo bloqueos de dependencias, migraciones generadas o capturas; el PR #21 anterior, de 10 360 líneas, es el contraejemplo). Los hitos formales **C2** (tras WP5), **C3** (tras WP8) y **C4** (final) siguen siendo obligatorios y adicionales a los checkpoints frecuentes; no esperes a nadie entre ellos. **C1** (línea base de pruebas, WP1) lo publica Build.
4. Si algo contradice el código real, sigue el código, corrige el documento y regístralo.
5. Si te bloquea una decisión no resuelta, elige la opción más simple, regístrala en `docs/adr/` y continúa.
6. **Como Dev:** escribes solo código de la aplicación y de herramientas (scripts, configuración). **No escribes pruebas ni el plan de pruebas, ni el informe de aprobación.**
3. Ejecuta los WP **en orden**. Cada uno deja el código completo y coherente; **no necesitas compilar ni ejecutar nada** (ver los puntos 7 y 8). Las líneas «Aceptación» que hablan de compilar o de pruebas en verde las verifica Build. **Regla obligatoria de checkpoints frecuentes:** divide cada WP en subobjetivos pequeños y, al completar cada uno, actualiza `PROGRESS.md`, crea un commit con el cambio y su progreso, y haz push inmediatamente a `origin/refactor/modular-foundation`. **No esperes a terminar un WP ni a los hitos C2/C3/C4. No trabajes más de 15 minutos sin publicar un checkpoint**; publica antes de cambiar de tarea/contexto y en cuanto exista riesgo de interrupción por tokens o cierre de sesión. Si en ese plazo no hay una unidad completa, guarda un checkpoint seguro del avance parcial y marca explícitamente en `PROGRESS.md` lo que está incompleto y sin validar. Nunca dejes código nuevo sin checkpoint solo porque no compila todavía, pero revisa `git diff --check`, `git status` y el diff preparado; no subas secretos ni archivos ajenos. Mantén commits coherentes y **revisables** (ningún commit de más de ~1 500 líneas cambiadas, salvo bloqueos de dependencias, migraciones generadas o capturas; el PR #21 anterior, de 10 360 líneas, es el contraejemplo). Los hitos formales **C2** (tras WP5), **C3** (tras WP8) y **C4** (final) siguen siendo obligatorios y adicionales a los checkpoints frecuentes; no esperes a nadie entre ellos. **C1** (línea base de pruebas, WP1) lo publica Build.
4. Si algo contradice el código real, sigue el código, corrige el documento y regístralo.
5. Si te bloquea una decisión no resuelta, elige la opción más simple, regístrala en `docs/adr/` y continúa.
6. **Como Dev:** escribes solo código de la aplicación y de herramientas (scripts, configuración). **No escribes pruebas ni el plan de pruebas, ni el informe de aprobación.**
7. **Sin compilar:** el propietario retiró la exigencia de compilar. No intentes compilar ni simules resultados. Escribe el código completo y consistente (referencias entre proyectos, `using`, nombres, firmas). Anota en `PROGRESS.md`, por WP, «sin compilar». Si en tu entorno sí puedes compilar o ejecutar algo, hazlo y repórtalo con el comando exacto. **Nunca afirmes que algo compila o pasa si no lo ejecutaste.** Las migraciones de EF **no se escriben a mano**: déjalas a Build (`dotnet ef`); tú dejas el modelo y los `DbContext` listos.
8. **Pruebas:** todo lo que esta fase llame prueba (unitaria, de caracterización, de integración, de arquitectura, E2E, plan) lo escribe Build o QA, no tú. Cuando un WP las nombre, solo prepara el código de producción que las hace posibles (p. ej., `Program` accesible, sembrador `Testing`, manejador remoto falso inyectable, etiquetas accesibles).

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

1. Alias `@/`; instalar las bibliotecas aprobadas (verificar versiones con `npm view`); plugin de Vite `virtual:pastel-modules` filtrado por `PASTEL_MODULES`.
2. **Router** (`createBrowserRouter`): rutas de plataforma (`/`, `/ingresar`, `/cuenta`, `/configuracion/*`) y las de cada manifiesto bajo su `basePath`, con `lazy`. `errorElement` global y por ruta; páginas 403, 404 y de error con código de soporte. Guardas `RequireAuth` y `RequirePermission`. **Cero navegación por estado `screen`** (F3). Filtros y pestañas de Configuración en la URL.
3. **Cliente API** (`core/api`): `ApiError` con `status, code, detail, errors, traceId`; **refresco single-flight ante 401**; reintento solo de lecturas idempotentes; **validación con `zod`** de las respuestas (se acabó `as T`); mensajes de red amigables; conserva CSRF/cookies.
4. **Proveedores:** `AuthProvider`, `QueryClientProvider` (con manejo global de errores inesperados), tema, tamaño de texto, notificaciones.
5. **Shell:** barra superior (marca `Flower2`, selector de módulos, ayuda, cuenta con tema y tamaño de texto), hub, navegación del módulo (inferior en móvil, lateral en escritorio), migas, "Saltar al contenido", foco al `h1` al cambiar de ruta. Con un solo módulo habilitado, `/` redirige a él.
6. **Migrar Identity** a `web/src/modules/identity/`: `ProfilePage` → `/cuenta`; `Settings*` → `/configuracion/*` (`usuarios`, `roles`, `modulos`, `auditoria`, `accesos/:tipo/:id`); `ChangePasswordScreen` como ruta obligatoria; `Dashboard` pasa a ser el hub (sin cifras falsas). Sustituir `useSettingsAdmin` (466 líneas, 23 `useState`) por consultas y mutaciones de TanStack Query con invalidación. Conservar el comportamiento del editor de accesos.
7. **Textos:** normalizar al tono predeterminado de `DESIGN_SYSTEM.md` §8 (sin voseo, salvo que la ficha o instrucciones específicas del módulo autoricen una voz más personal), cadenas en `strings.ts`; corregir también los mensajes del backend y probar la regla predeterminada y sus excepciones documentadas.
8. `core/log` (envoltorio) que reporta errores a `/api/client-errors`; ESLint `no-console`.

## 11. WP8 — Migración correcta a Tailwind CSS y sistema de diseño (prioridad 2)

**Regla:** utilidades de Tailwind en JSX. Los patrones compartidos son **componentes React** con variantes (`class-variance-authority`, `clsx`, `tailwind-merge` mediante un `cn()`), no clases `@apply`. `@apply` queda **solo** para reseteos de elementos, contenido Markdown (`prose`) y selectores complejos inevitables, en `core/design/base.css`.

1. **Medir antes:** crea `scripts/tailwind-audit.mjs` (extrae los literales de `className` y calcula: atributos `className`, utilidades en JSX, clases semánticas definidas y cuántas se usan una sola vez, líneas de CSS y de `@apply`, clases sin uso) y guarda el resultado "antes" y "después" en `PROGRESS.md`. Referencia del análisis: 346 `className`, 0 utilidades, 217 clases semánticas (146 de un solo uso), 2 209 líneas, 592 con `@apply`.
2. **Tokens con Tailwind v4:** `core/design/tokens.css` define los neutros, estados y módulos como variables; `@theme inline` los expone como utilidades (`bg-surface`, `text-fg`, `border-line`, `bg-accent`, `text-accent-strong`, `bg-accent-soft`, …). El color de cada módulo cambia con `data-module` (valores exactos de `DESIGN_SYSTEM.md`, claro y oscuro), así `bg-accent` ya es el color del módulo. Modo oscuro por variables (con `@custom-variant dark` ligado a `data-theme`); `dark:` solo donde sea imprescindible. Verifica la sintaxis contra la documentación vigente de Tailwind v4.
3. **Migración por funcionalidad** (un commit por funcionalidad, no un PR gigante): Auth → Cuenta → Shell/Hub → Configuración (usuarios, roles, módulos, auditoría, editor de accesos). En cada una: las 146 clases de un solo uso pasan a utilidades en el JSX; las ~67 compartidas pasan a componentes de `core/ui`. Capturas antes/después (claro/oscuro, móvil/escritorio) con un script de Playwright (`scripts/screenshots`) para verificar paridad visual.
4. **Kit de UI v0** (`core/ui`, sobre `react-aria-components`): `Button`, `TextField`, `NumberField`, `Select`, `Checkbox`, `RadioGroup`, `DatePicker`, `Dialog`/`ConfirmDialog`, `Toast`, `PageHeader`, `EmptyState`, `Skeleton`, `DataList` (tabla en escritorio, tarjetas en móvil), `Tabs`, `Badge` (icono + texto), `FormField` con react-hook-form. Cada componente con prueba y `vitest-axe`.
5. **Diálogos (F1):** todos los modales pasan al kit (o a `<dialog>` nativo): `Escape` cierra, foco atrapado, foco devuelto al origen, título accesible. Pruebas de teclado.
6. **Accesibilidad (F4):** contraste (incluido `--muted`), foco visible ≥ 3 px, 320 px, zoom 200 %, `prefers-reduced-motion`, objetivos táctiles ≥ 44 px. Inter autoalojada.
7. **Herramientas:** `prettier-plugin-tailwindcss` (orden de clases). Se elimina `web/src/styles.css`.

**Metas medibles (las verifica QA con `tailwind-audit`):**
- `styles.css` eliminado; CSS solo en `core/design/{tokens,base,module-themes}.css` + el archivo de entrada de Tailwind; ningún CSS > 400 líneas.
- `@apply` ≤ 60 líneas en total y solo en `base.css`.
- 0 clases semánticas de componente definidas en CSS (lista de excepciones documentada).
- Todos los componentes de `core/ui` y de Identity usan utilidades; `className` con utilidades en ≥ 95 % de los atributos.
- Sin valores de color sueltos fuera de los tokens; `check-design.mjs` limpio.

**Aceptación (la verifica Build):** lint, build, test y `format:check` verdes; paridad visual documentada. **C3.**

## 12. WP9 — Infraestructura, CI y repositorio (D1, D2, G1–G3)

1. **Reproducibilidad:** `web/Dockerfile` copia `package-lock.json` y usa `npm ci`; CI y documentación también (D2). Dependabot sin cambios de contenido (solo surte efecto desde la rama por defecto; anotarlo).
2. **Docker/compose:** PostgreSQL **fuera** del stack principal (solo en `compose.override.yaml` de desarrollo); `healthcheck` de `api` (con `/health/ready`) y `web`; `cap_drop: [ALL]`; límites de recursos; rotación de logs (`json-file`, `max-size`/`max-file`); `depends_on` con `service_healthy`; sin IP estáticas para la confianza del proxy.
3. **nginx:** compresión y caché de activos con hash; cabeceras de seguridad sin duplicar (decide una única fuente por tipo de respuesta y documéntalo); `X-Forwarded-For` y *real IP* configurables para ir detrás de otro proxy; `Host $http_host`.
4. **CI (`ci.yml`, uso local):** `push` solo a `dev` y `main`; `pull_request` hacia esas ramas al abrir/reabrir, marcar listo para revisión y sincronizar un PR ya listo; los PR en borrador se saltan; `workflow_dispatch` permite ejecución manual en la rama seleccionada una vez que esta versión del workflow también esté en la rama predeterminada (`main`). Los pushes a ramas de trabajo sin PR listo no disparan CI. `concurrency` con cancelación; `timeout-minutes`; trabajos: *backend* (build, test, `dotnet format --verify-no-changes`, `dotnet list package --vulnerable --include-transitive`), *frontend* (`npm ci`, format, lint, build, test, `npm audit --audit-level=high`), *guardrails* (arquitectura, diseño, Tailwind), *aislamiento por módulo* (matriz que borra los demás), *contenedores* (smoke de compose). Acciones con versiones vigentes (verificar). Añade `codeql.yml` (C# y TypeScript) como opcional.
5. **Higiene:** `.editorconfig`, `.gitattributes`, `EnforceCodeStyleInBuild`, `docs/SECURITY.md` con la sección "Cómo reportar una vulnerabilidad", corrección de rutas obsoletas en docs (p. ej. `SettingsPage.tsx`).
6. **Guardarraíles (todos en CI; Dev escribe los scripts y la configuración, Build las pruebas de arquitectura y de Vitest):** pruebas de arquitectura (`Pastel.ArchitectureTests`: fronteras, `internal`, prefijos de permisos, `MODULE.md` y atributo de módulo, endpoints con permiso o `AllowAnonymousExplicit`); ESLint de fronteras por módulo + `jsx-a11y` + `no-console`; `scripts/check-design.mjs` (morado 235°–345°, iconos/emojis de IA, colores sueltos) con sus propias pruebas; Vitest con `vitest-axe`.
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
