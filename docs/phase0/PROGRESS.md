# Fase 0 — Progreso del Agente 0 (rol Dev)

Rama: `refactor/modular-foundation`. Base: `origin/dev`. Este archivo permite retomar el trabajo sin el chat.

## Sincronización con `dev`
- `dev` = `7ba6f1c` (PR #24 fusionado). Integrado en esta rama con merge `e1fa940`, sin conflictos. No se reinició la fase.
- Reglas vigentes tras PR #24 (leídas en `AGENTS.md`, `docs/AI_WORKFLOW.md`, `docs/TESTING_STRATEGY.md`, `docs/phase0/FASE-0-REFACTOR-BASE.md`):
  - Dev implementa código de aplicación. Si su entorno compila, debe compilar y reportar; si no, publica sin compilar y lo declara. No escribe pruebas, planes ni migraciones (Build usa `dotnet ef`).
  - WP1 (red de seguridad) lo ejecuta Build. Dev empieza en WP2.
  - Checkpoints de push libres en esta rama; no disparan CI. Puntos formales: C2 (tras WP5), C3 (tras WP8) y C4 (final).
  - **No abrir PR ni integrar a `dev` sin autorización explícita.** Build y QA pueden ser una sola sesión.
  - Tono: sin voseo por defecto; solo se permite si la ficha del módulo lo autoriza. Ninguna ficha actual lo autoriza.
  - CI (WP9): `push` solo a `dev`/`main`; `pull_request` (opened, reopened, ready_for_review, synchronize) saltando borradores; `workflow_dispatch`; `concurrency` con cancelación.
    `dev` ya trae esa base en `.github/workflows/ci.yml`; WP9 la conserva y añade los trabajos nuevos.
- Todo lo marcado «sin compilar» no se compiló ni se ejecutó con `dotnet build` completo (ver «Entorno»).

## Entorno de este agente
- SDK .NET 10.0.112 instalado por `apt`. NuGet (`api.nuget.org`) y Docker no son accesibles: no se pueden restaurar paquetes.
- Verificación parcial usada: `Pastel.SharedKernel` compila completo (0 advertencias, 0 errores). El resto se revisa compilando
  sin paquetes y descartando los errores por tipos de EF Core, Npgsql y Serilog ausentes (0 errores restantes en `Pastel.Platform`).
- Decisiones que Build debe verificar al compilar: `ForwardedHeadersOptions.KnownIPNetworks` y `System.Net.IPNetwork` (.NET 10),
  `RequestLoggingOptions.IncludeQueryInRequestPath` (Serilog.AspNetCore 9), versiones de paquetes de `Directory.Packages.props`
  (Serilog.AspNetCore 9.0.0, Serilog.Formatting.Compact 3.0.0, Authentication.Google 10.0.13), `IsRowVersion()` sobre `uint` para `xmin`.

## Estado por WP
| WP | Estado | Compilación |
|---|---|---|
| WP1 | Fuera de alcance de Dev (lo hace Build) | n/a |
| WP2 | En curso. `SharedKernel`, `Platform` y `Host` (`Program.cs`, csproj, appsettings, Dockerfile) escritos. Falta compose/.env/nginx de `PASTEL_MODULES`, `docs` y revisión final | SharedKernel: compilado. Platform: solo revisión parcial |
| WP3 | En curso. Archivos movidos con `git mv` a `src/Modules/Identity/Pastel.Modules.Identity/`; **su contenido aún es el original y debe reescribirse** | Sin compilar |
| WP4–WP10 | Pendientes | — |

## Estructura actual (checkpoint 1)
- `src/BuildingBlocks/Pastel.SharedKernel`: `Result`, `Error`, `PagedResult`, `IClock`, `Guard`.
- `src/BuildingBlocks/Pastel.Platform`: contrato `IPastelModule`, cargador de módulos, errores `problem+json`, traductor de excepciones,
  autorización por permiso, CSRF, cabeceras, URL pública, límites de tasa, Serilog, salud, `POST /api/client-errors`, `TransactionRunner`.
- `src/Host/Pastel.Host`: renombrado desde `Pastel.Api`; `Program.cs`, `Pastel.Host.csproj` y configuración **aún sin reescribir**.
- `src/Modules/Identity/`: archivos del backend anterior movidos (entidades, `DbContext`, sembrador, JWT, políticas); pendientes de reescritura.
- Se eliminaron `Pastel.Domain`, `Pastel.Application`, `Pastel.Infrastructure` (incluye las migraciones antiguas: Build regenera).
- `Pastel.slnx` ya apunta a los proyectos nuevos; varios csproj aún no existen o están sin actualizar.

## Decisiones tomadas (registrar en ADR en WP10)
1. Respuesta CSRF inválido: pasa de 400 a **403** con código `platform.csrf_invalid` (el plan F0-S213 lo exige). El modelo CSRF no cambia.
2. Contrato de listados: `GET /api/admin/users` y `/api/admin/audit` pasan de arreglo a `{ items, page, pageSize, totalCount }` (paginación en servidor, B5).
3. Los permisos efectivos se calculan en una sola consulta por petición; el estado de sesión se carga una vez en `HttpContext.Items`.
4. El bloqueo por fallos de contraseña solo afecta el ingreso con contraseña (no invalida sesiones existentes ni cuenta para «último administrador»).
5. `IPastelModule.MapRootEndpoints` (método por defecto) permite a Identity conservar `/api/auth` y `/api/admin`.
6. Tablas de Identity en esquema `identity` con nombres en `snake_case`; columnas por defecto salvo `external_logins` (según la Fase 0).

## Hallazgos del análisis (verificados en el código base)
| Hallazgo | Estado |
|---|---|
| S1 jerarquía de privilegios (sin guardas en roles, bloqueo, restablecimiento, permisos) | Confirmado; pendiente WP4 |
| S2 refresco, S3 (login sin hash para correo inexistente, bloqueo fijo 15 min que invalida sesiones) | Confirmado; pendiente WP4 |
| S4 contraseñas | Confirmado; pendiente WP4 |
| B2 `Program.cs` de 152 líneas mezclado | En resolución (WP2) |
| B3 consultas repetidas por petición | En resolución (WP3) |
| B5 auditoría sin antes/después, listados sin paginar | En resolución (WP3) |
| Resto (T1, F1–F4, D1–D2, G1–G3) | Pendiente |

## Datos para pruebas
Pendiente (WP10).

## Checkpoints publicados
| Fecha | SHA | Contenido |
|---|---|---|
| checkpoint 1 | `145637f` | Estructura movida con `git mv`, SharedKernel y Platform |
| checkpoint 2 | (merge de `dev` 7ba6f1c) | Integración de reglas actualizadas |

## Próximo paso
Reescribir contenido de Identity (WP3) y el Host (WP2), luego WP4 y WP5; publicar C2.

---

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
