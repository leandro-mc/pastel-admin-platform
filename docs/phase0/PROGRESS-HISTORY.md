# Historial de checkpoints — Fase 0

> Archivo histórico. **No usar este documento como estado actual**: algunos resúmenes de cabecera y siguientes pasos quedaron superados por sesiones posteriores. La fuente de verdad del estado actual es `docs/phase0/PROGRESS.md`. Esta copia conserva los detalles de las sesiones S3/S4 como trazabilidad.

## Bitácora de checkpoints (sesión 3 en adelante)

Formato: último commit conocido antes del trabajo → WP/subobjetivo → cambios → decisiones → validaciones → limitaciones → pendientes → siguiente acción.
El SHA que contiene cada entrada se informa en la entrega, no aquí.

### S3-01 · WP2 · Host
- **Último commit conocido antes:** `81eb62f`.
- **Cambios:** `Pastel.Host` reescrito. `Program.cs` queda en ~25 líneas encadenando `AddPastelObservability`, `AddPastelSecurity`, `AddPastelModules`,
  `UsePastelPipeline`, `MapPastelEndpoints`, `InitializePastelAsync` (todo definido en `Pastel.Platform`). `Pastel.Host.csproj`: referencia a Platform e Identity,
  más referencias por *glob* a `../../Modules/*/Pastel.Modules.*/Pastel.Modules.*.csproj` excluyendo Identity, `*.Tests` y `*.Contracts`, filtradas por `PastelModules`
  (por defecto `*`; acepta `;` o `,`, carpeta o código, sin distinguir mayúsculas). `appsettings*.json` con Serilog, `Auth:*`, `ReverseProxy:*`, `App:PublicBaseUrl`.
  `Dockerfile` con `ARG PASTEL_MODULES` y entrada `Pastel.Host.dll`.
- **Decisiones:** el Dockerfile copia `src/` completo antes de `restore` (el *glob* impide copiar solo los csproj); se pierde parte del caché de capas, se gana coherencia con el subconjunto de módulos.
  Normalización del filtro con `TextInfo.ToTitleCase` (válida porque las carpetas de módulos son una sola palabra en PascalCase).
- **Validaciones ejecutadas:** ninguna de compilación (sin `dotnet` ni NuGet). Solo revisión de lectura.
- **Sin compilar / a verificar por Build:** sintaxis MSBuild del filtro (`ToTitleCase` anidado, transformación de `PastelModuleName`), `dotnet build -p:PastelModules=Identity`
  y `-p:PastelModules=Brisa;Balance`. `Microsoft.AspNetCore.OpenApi` sin versión (versión central en `Directory.Packages.props`).
- **Pendiente WP2:** `PASTEL_MODULES` en `compose.yaml`/`.env.example`, claves de configuración nuevas en compose, revisar `Pastel.Platform` contra el plan §5 (lista de verificación).
- **Siguiente acción:** compose y `.env.example`; luego lista de verificación de §5 contra `Platform`.

### S3-02 · WP2 · Compose, `.env.example` y Dockerfiles
- **Último commit conocido antes:** `98d9d71` (S3-01).
- **Cambios:** `compose.yaml` apunta a `src/Host/Pastel.Host/Dockerfile` y pasa `PASTEL_MODULES` como argumento a `api` y `web`; sustituye `ReverseProxy__TrustedAddress` (IP fija)
  por `ReverseProxy__TrustedNetworks` (subred); añade `App__PublicBaseUrl`, `AllowedHosts` y `Auth__Local__*` por variable. `web/Dockerfile` recibe `ARG/ENV PASTEL_MODULES`.
  `.env.example` documenta las variables nuevas (sin valores reales).
- **Decisiones:** `PASTEL_MODULES` admite comas en compose/.env (el csproj las convierte a `;`). Las IP estáticas de compose se mantienen hasta WP9 (la confianza ya no depende de ellas).
- **Validaciones ejecutadas:** `git diff --check` limpio. No se ejecutó `docker compose config` (Docker no disponible).
- **Pendiente WP2:** verificar §5 contra `Pastel.Platform` (lista de comprobación); `web/Dockerfile` seguirá con `npm install` hasta WP9 (`npm ci`).
- **Siguiente acción:** lista de verificación de WP2 §5 contra el código de `Platform`.

### S3-03 · WP3.1 · Proyecto Identity, dominio y `IdentityDbContext`
- **Último commit conocido antes:** `659c439` (S3-02).
- **Cambios:** se crea `Pastel.Modules.Identity.csproj` (faltaba; `Pastel.slnx` ya lo referenciaba) con `InternalsVisibleTo` para `*.Tests`, `Pastel.IntegrationTests` y `Pastel.ArchitectureTests`.
  Entidades en `Pastel.Modules.Identity.Domain` y `internal`. `AppUser.PasswordHash` pasa a nullable; `AppUser`, `AppRole` y `ModuleDefinition` llevan `uint Version` (`xmin`, `IsRowVersion()`).
  `AuditLog` suma `Module` y `TraceId`; `DetailsJson` es `jsonb`. `IdentityDbContext` (esquema `identity`, tablas `users`, `roles`, `user_roles`, `modules`, `permissions`, `role_permissions`,
  `user_permission_overrides`, `refresh_tokens`, `audit_logs`) y su fábrica de diseño con historial de migraciones en el esquema `identity`.
- **Decisiones:** todo `internal` salvo lo que exija Platform; `ExternalLogin` se agrega en WP5.
- **Validaciones ejecutadas:** ninguna de compilación. **Sin migración:** la genera Build con `dotnet ef`.
- **Sin compilar:** todo el módulo (los demás archivos de Identity aún tienen el contenido original y no compilan con estos tipos).
- **Pendiente WP3:** `IdentityModule`, evaluador de permisos y estado de sesión, auditoría, catálogo/siembra, JWT y política de contraseñas, slices `Features/*`, pruebas movidas.
- **Siguiente acción:** `IdentityModule` + catálogo desde código + `IPermissionEvaluator`/`ICurrentUser`/`IAuditTrail`.

### S3-04 · WP3.2 · Permisos declarados, evaluador único, usuario actual y auditoría
- **Último commit conocido antes:** `54bf758` (S3-03).
- **Cambios (Identity):** `IdentityPermissions` (grupos `dashboard` y `settings`, códigos sin cambios), `IdentityEventIds` (1000–1999), `PermissionEvaluator` reescrito como `IPermissionEvaluator`
  (una consulta por usuario y petición, caché por ámbito, orden módulo→denegación→concesión→rol vía `PermissionDecision`), `CurrentUser : ICurrentUser`, `AuditTrail : IAuditTrail`
  (`Add` en la misma transacción; `WriteAsync` con contexto aparte; `DetailsJson` = `{before, after}`; `TraceId` e IP automáticos).
- **Decisiones:** el evaluador es el único lugar donde se calculan permisos; `/api/auth/me` lo reutilizará.
- **Validaciones ejecutadas:** ninguna de compilación (el SDK ya está instalado, pero NuGet no es accesible).
- **Sin compilar:** todo lo anterior. Los archivos `PrivilegeGuard.cs`, `SessionService.cs`, `JwtTokenService.cs`, `JwtOptions.cs`, `PasswordPolicy.cs`, `DatabaseSeeder.cs` conservan aún el contenido original.
- **Siguiente acción:** `IdentityModule`, `CatalogSyncTask`, `BootstrapAdminTask`, opciones y autenticación JWT.

### S3-05 · WP3.3 · Opciones, JWT, autenticación y catálogo desde código
- **Último commit conocido antes:** `a588c99` (S3-04).
- **Cambios (Identity):** `AuthOptions` (`Auth:Local`, `Auth:Google`, `Auth:Refresh`), `JwtOptions` y `JwtTokenService` con espacios de nombres nuevos (`ITokenService` queda junto al servicio),
  `JwtBearerSetup` (JWT en cookie `__Host-pastel_access`; **una sola proyección** `PastelSessionState` por petición guardada en `HttpContext.Items`; el bloqueo por contraseña ya no invalida sesiones),
  `CatalogSyncTask` (orden 10: grupos y permisos de `IPastelModule`, todo a `Administrator`, roles sugeridos solo si faltan, sin pisar ediciones, transacción serializable).
- **Decisiones:** los módulos de la base son los **grupos de permisos** (`dashboard`, `settings`, `brisa`, …); un módulo no cargado no borra sus filas.
- **Validaciones ejecutadas:** ninguna de compilación.
- **Sin compilar:** todo lo nuevo. Pendientes de reescritura: `PrivilegeGuard.cs`, `SessionService.cs`, `PasswordPolicy.cs`, `DatabaseSeeder.cs`.
- **Siguiente acción:** `BootstrapAdminTask`, `IdentityModule` (+ registro de servicios) y slices de `Features/`.

### S4-01 · WP2 · Cierre: verificación de §5 contra el código real
- **Último commit conocido antes:** `c5a15a7` (S3-05).
- **Método:** lectura de todos los archivos de `Pastel.SharedKernel`, `Pastel.Platform` y `Pastel.Host`, contrastada punto por punto con `FASE-0-REFACTOR-BASE.md` §5.
- **Resultado por punto (evidencia):**
  1. SharedKernel: `Result.cs`, `Error.cs`, `IClock.cs`, `Paging.cs`, `Guard.cs`. Cumple.
  2. Platform: `IPastelModule`, `PastelModuleAttribute`, `PermissionGroup`, `SuggestedRole`, `ModuleLoader` (`Modules/`), `ICurrentUser`, `IPermissionEvaluator` (`Security/Abstractions.cs`),
     `IAuditTrail` (`Auditing/`), `RequirePermission`/`RequireSession`/`AllowAnonymousExplicit` (`Security/EndpointSecurityExtensions.cs`), migrador por orden (`InitializePastelAsync`). Cumple.
  3. Errores: `PastelExceptionHandler` (`IExceptionHandler`) + `AddProblemDetails`; traduce `Result` (`PastelProblem.From`), violación única (`UniqueViolationMap`), concurrencia, 40001/40P01 (503 con `Retry-After`; el reintento acotado está en `TransactionRunner`),
     cancelación (499) e inesperados; `traceId` en cuerpo y `X-Trace-Id` (`TraceIdMiddleware`); no usa `ex.Message`; códigos `platform.*` en `PlatformErrors`. Cumple.
  4. Logs: Serilog JSON (`CompactJsonFormatter`), enriquecedor (`TraceId`, `RequestId`, `UserId`, `Module`, `ClientIp`) y propiedades `Environment`/`Version`; resumen por petición sin cuerpos ni cabeceras;
     `IncludeQueryInRequestPath = false` (excluye la consulta, incluida `/api/auth/google/*`); rangos de `EventId` en `PastelEventIds`. Cumple.
  5. Salud: `/health/live` y `/health/ready` (`ModulesReadyHealthCheck`: base de datos + migraciones pendientes de cada módulo). Cumple.
  6. `POST /api/client-errors` (`ClientErrorsEndpoint`): límite de 8 KB, campos acotados, límite de tasa propio. Cumple.
  7. `Program.cs` de 26 líneas con métodos de extensión. Cumple.
  8. `Pastel.Host.csproj`: referencias por *glob* filtradas por `PastelModules`. Cumple (sintaxis MSBuild por verificar en Build).
  9. Dockerfile y `compose.yaml` con `PASTEL_MODULES` (S3-01/S3-02). Cumple.
- **Corrección hecha:** en `InitializePastelAsync` había una llamada síncrona sobre asíncrona (`.GetAwaiter().GetResult()` dentro de `Where`) al comprobar migraciones pendientes con `Database:ApplyMigrationsAtStartup=false`; ahora se espera con `await`.
- **Observaciones para WP3/WP5 (no son defectos de WP2):** Identity debe llenar `ForcePasswordChangeOptions.AllowedPaths`, registrar `UniqueViolationMap` (correo, nombre de rol) y, en WP5, `PublicBaseUrlOptions.PathPrefixes`.
- **Validaciones ejecutadas:** lectura de código. No se ejecutó compilación (en esta sesión `dotnet` no está instalado y NuGet no es accesible).
- **Siguiente acción:** WP3: `IdentityModule` + `BootstrapAdminTask`.

### S4-02 · WP3.4 · Piezas comunes, `BootstrapAdminTask` e `IdentityModule`
- **Último commit conocido antes:** `dd3ae22` (S4-01).
- **Cambios (Platform):** `IUniqueViolationSource` (cada módulo registra sus índices únicos al crear `UniqueViolationMap`; resuelve la observación de S4-01).
- **Cambios (Identity):** `Common/IdentityErrors` (códigos `identity.*`), `Common/FieldErrors`, `Common/Contracts` (mismos campos JSON que los contratos anteriores; `AuditEntry` suma `module` y `traceId`),
  `Common/UserMapping`; `Security/PasswordPolicy` (regla vigente; WP4 la reemplaza); `Startup/BootstrapAdminTask` (orden 20, crea la cuenta de arranque o restaura el rol y lo audita como `identity.bootstrap.admin_restored`;
  no registra el correo); `IdentityModule` (`[assembly: PastelModule]`, DbContext, opciones validadas, hasher con 600 000 iteraciones, evaluador/usuario actual/auditoría, tareas de arranque, `Member` con `dashboard.view`
  como rol sugerido, rutas permitidas con contraseña temporal: `/api/auth/me`, `/change-password`, `/logout`); `Features/IdentityEndpoints` (punto de enlace, aún sin slices).
- **Decisiones:** (1) la contraseña actual incorrecta en cambio de contraseña pasa de 401 a **400** con `identity.password.current_incorrect` (un 401 dispararía el refresco automático de WP7). (2) `Login` y `Register` respetan `Auth:Local:*` (registro desactivado por defecto, plan §2).
  (3) Los nombres de índice únicos se buscan por fragmento (`users_NormalizedEmail`, `roles_NormalizedName`) porque las columnas siguen con nombre por defecto.
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Sin compilar:** todo lo anterior.
- **Pendiente WP3:** slices (`Login`, `Register`, `Refresh`, `Logout`, `GetCurrentUser`, `ChangePassword`, `GetCsrfToken`, administración de usuarios/roles/módulos/permisos/auditoría), retirar `PrivilegeGuard.cs`, `SessionService.cs` y `DatabaseSeeder.cs` cuando sus slices lo sustituyan, adaptar `SecurityPolicyTests.cs` (movido con `git mv`; lo adapta Build).
- **Siguiente acción:** `Security/SessionCookies` + `SessionIssuer` y los slices de `/api/auth/*`.

### S4-03 · WP3.5 · Infraestructura de sesión y slices `GetCsrfToken`, `Login`, `Register`
- **Último commit conocido antes:** `5ad5555` (S4-02).
- **Cambios (Platform):** `IClock` se registra como `SystemClock` en `AddPastelSecurity` (antes no estaba registrado).
- **Cambios (Identity):** `Security/TokenSecrets` (hash SHA-256 y secretos opacos), `Security/SessionCookies` (mismas cookies y atributos que antes; `Cache-Control: no-store`),
  `Security/SessionIssuer` (emite acceso + refresh en la transacción de quien llama; revoca refresh tokens), `JwtBearerSetup` proyecta **en la misma consulta** el estado de sesión y el resumen de la persona
  (`HttpContext.GetSessionUser()`), de modo que `/api/auth/me` no hace una consulta extra de usuario (meta B1: 2 consultas = estado + permisos).
  Slices: `Features/GetCsrfToken` (`GET /api/auth/csrf`), `Features/Login` (`POST /api/auth/login`), `Features/Register` (`POST /api/auth/register`, 201); manejadores con `Result`, sin `ex.Message`, sin correo en logs (`LogHasher`).
  `Features/IdentityEndpoints` ya enlaza los tres bajo `/api/auth`.
- **Decisiones:** el ingreso de una cuenta sin `PasswordHash` (solo Google) falla con el mismo error genérico; contraseñas de más de 256 caracteres se rechazan antes de calcular el hash; el registro devuelve errores por campo (`identity.register.invalid`).
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Pendiente WP3:** slices `Refresh`, `Logout`, `GetCurrentUser`, `ChangePassword` y toda la administración; retirar `PrivilegeGuard.cs`, `SessionService.cs`, `DatabaseSeeder.cs`.
- **Siguiente acción:** slices `Refresh`, `Logout`, `GetCurrentUser`, `ChangePassword`.

### S4-04 · WP3.6 · Slices `Refresh`, `Logout`, `GetCurrentUser`, `ChangePassword`
- **Último commit conocido antes:** `b9c8849` (S4-03).
- **Cambios (Identity):** `Features/Refresh` (rotación en transacción serializable con `TransactionRunner`; la reutilización de un token rotado revoca todas las sesiones y sube `TokenVersion`; ya no se rechaza por `LockoutEnd`, decisión 4),
  `Features/Logout` (público; revoca el refresh y audita si hay sesión), `Features/GetCurrentUser` (`GET /api/auth/me` con `RequireSession`, usa el resumen de la petición y `IPermissionEvaluator`; respuesta `{ user, permissions }`),
  `Features/ChangePassword` (204, revoca refresh tokens, `TokenVersion++`, auditoría con antes/después sin secretos, limitado por `auth` de tasa). Todo enlazado en `IdentityEndpoints`.
- **Rutas `/api/auth/*` completas:** `csrf`, `login`, `register`, `refresh`, `logout`, `me`, `change-password`. `/api/auth/options` y `/api/auth/google/*` corresponden a WP5.
- **Decisiones:** se mantienen los nombres de acción de auditoría anteriores (`auth.login.*`, `auth.refresh.*`, `user.password.changed`); la ventana de gracia de refresh (S2) queda para WP4.
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Pendiente WP3:** administración (usuarios, roles, permisos, módulos, auditoría) por slices; retirar `PrivilegeGuard.cs`, `SessionService.cs` y `DatabaseSeeder.cs`.
- **Siguiente acción:** slices de usuarios: `ListUsers` (paginado y filtrado en servidor), `CreateUser`, `SetUserRoles`, `GetUserPermissions`, `SetUserPermissions`, `BlockUser`, `UnblockUser`, `ResetUserPassword`.

### S4-05 · WP3.7 · Administración de usuarios (1/2): `ListUsers` y `CreateUser`
- **Último commit conocido antes:** `1539809` (S4-04).
- **Cambios (Identity):** `Common/AdministratorRules` (conteo de administradores activos; el bloqueo por contraseña ya no cuenta), `Common/ResultHttp` (`Result` → respuesta o `problem+json`),
  `Features/ListUsers` (`GET /api/admin/users`: `{ items, page, pageSize, totalCount }`; filtros `search` (ILIKE literal sobre correo y nombre), `role` (nombre) y `status` (`active`|`blocked`); orden por correo; página y tamaño normalizados por `PageRequest`),
  `Features/CreateUser` (`POST /api/admin/users`, 201, contraseña temporal con `MustChangePassword`, auditoría con después).
  Enlazados en `IdentityEndpoints` bajo `/api/admin/users`.
- **Decisiones:** el listado cambia de arreglo a objeto paginado (decisión 2 de PROGRESS); el frontend se adapta en WP7.
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Pendiente WP3:** `SetUserRoles`, `GetUserPermissions`, `SetUserPermissions`, `BlockUser`, `UnblockUser`, `ResetUserPassword`; roles, permisos, módulos y auditoría; retirar `PrivilegeGuard.cs`, `SessionService.cs`, `DatabaseSeeder.cs`.
- **Siguiente acción:** `SetUserRoles` y `GetUserPermissions`/`SetUserPermissions`.

### S4-06 · WP3.8 · Administración de usuarios (2/2)
- **Último commit conocido antes:** `06f6a57` (S4-05).
- **Cambios (Identity):** `Features/SetUserRoles` (`PUT /api/admin/users/{id}/roles` → `{ roles }`; transacción serializable; no deja la plataforma sin administradores activos; `TokenVersion++` y revoca refresh tokens; auditoría con roles antes/después),
  `Features/GetUserPermissions` y `Features/SetUserPermissions` (`/api/admin/users/{id}/permissions`; excepciones antes/después con códigos de permiso; rechaza cuentas Administrator, repetidos, efectos y permisos inexistentes),
  `Features/BlockUser` (serializable; no a sí mismo ni al último administrador activo), `Features/UnblockUser`, `Features/ResetUserPassword` (`{ temporaryPassword, mustChangePassword }`, `Cache-Control: no-store`, la contraseña no se registra ni se audita).
  Todas con los permisos de siempre (`settings.users.read|update|lock|reset_password`). Enlazadas en `IdentityEndpoints`.
- **Decisiones:** sin cambios de contrato JSON; los errores pasan de excepciones (400/404/409 según el tipo) a `Result` con códigos `identity.*`.
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Estado WP3:** rutas `/api/auth/*` y `/api/admin/users/*` completas. Faltan `/api/admin/roles`, `/permissions`, `/modules`, `/audit`.
- **Siguiente acción:** slices de roles (`ListRoles`, `CreateRole`, `SetRolePermissions`) y `ListPermissions`.

### S4-07 · WP3.9 · Roles, permisos, módulos y auditoría por slices
- **Último commit conocido antes:** `f6aba23` (S4-06).
- **Cambios (Identity):** `Features/ListRoles` (una consulta con permisos y cantidad de personas), `CreateRole` (201; nombre validado; duplicado → `identity.role.name_taken` 409), `SetRolePermissions` (204; Administrator conserva todos),
  `ListPermissions`, `ListModules` (solo lectura del catálogo sincronizado), `SetModuleEnabled` (`PATCH`, 204; `settings` no se desactiva; audita antes/después),
  `ListAudit` (`GET /api/admin/audit`: `{ items, page, pageSize, totalCount }`, más recientes primero; filtros `action`, `module`, `actor` (correo), `targetUserId`, `from`, `to`), `Common/LikePattern` (ILIKE literal; también usado por `ListUsers`).
  **`CreateModule` retirado** (comando, endpoint y contrato): no se recrea. Auditoría de roles y módulos con antes/después.
- **Decisiones:** `GET /api/admin/audit` reemplaza el parámetro `take` por `page`/`pageSize` (decisión 2); `AuditEntry` incluye `module` y `traceId`.
- **Validaciones ejecutadas:** `git diff --check`. Sin compilar.
- **Estado WP3:** todas las rutas de `/api/auth/*` (salvo `options` y Google, de WP5) y `/api/admin/*` existen como slices.
- **Pendiente WP3:** retirar `PrivilegeGuard.cs`, `SessionService.cs` y `DatabaseSeeder.cs` (su lógica ya vive en los slices) y revisar referencias colgantes; revisar `SecurityPolicyTests.cs`; auditar el estado real contra los criterios de §6.
- **Siguiente acción:** `git rm` de los tres archivos heredados y auditoría de §6 punto por punto.
