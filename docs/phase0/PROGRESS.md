# Fase 0 — Estado actual del refactor (rol Dev)

> **Fuente de verdad para el relevo.** Este archivo resume el estado actual y los siguientes pasos; no agregues resúmenes iniciales repetidos. El detalle de sesiones anteriores se conserva en [`PROGRESS-HISTORY.md`](./PROGRESS-HISTORY.md), solo como historial. Si existe una discrepancia, inspecciona el código y actualiza este documento.

Última reconciliación documental: 2026-10-18.

## Repositorio y reglas vigentes

- Repositorio: `leandro-mc/pastel-admin-platform`.
- Rama de trabajo: `refactor/modular-foundation`. Antes de tocar archivos, confirma el HEAD real con `git fetch origin`, `git status --short --branch` y `git log --oneline --decorate -10`.
- Base de integración documentada: `dev` en `7ba6f1c80ad1025acc3333096ff3878b3226b0f4`. No integres cambios nuevos de `dev` por iniciativa propia.
- No abrir PR, hacer merge ni integrar en `dev` sin autorización explícita del propietario. Autorizar un PR no autoriza su merge.
- Publicar un checkpoint como máximo cada **3 minutos**: revisar el diff, actualizar este archivo en el mismo commit, hacer commit pequeño y push a `origin/refactor/modular-foundation`. Sin force push, sin reescribir historia y sin secretos.
- Dev implementa código de producto; no escribe pruebas ni planes de pruebas. No inventes resultados ni afirmes que algo compila si no se verificó. Sigue las instrucciones de `FASE-0-REFACTOR-BASE.md` y declara de forma explícita lo que quedó sin compilar/validar. Build/QA se encarga de pruebas, compilación completa y migraciones EF Core.

## Estado actual por WP

| WP | Estado actual | Qué falta |
|---|---|---|
| WP1 — Línea base de pruebas | **Sin evidencia de cierre en esta bitácora; responsabilidad de Build** | Confirmar el resultado de Build y la integración de la línea base en la rama según la sección 4 del plan. Dev no debe rehacerla. |
| WP2 — SharedKernel, Platform, Host | **Revisión estática registrada como completa** en S4-01 | No se compiló. Build debe verificar los puntos sensibles descritos abajo y validar el proyecto completo. |
| WP3 — Identity | **Cerrado como código** (auditoría estática contra §6, sin compilar) | Build: generar la migración inicial con `dotnet ef`, adaptar las pruebas movidas, verificar que EF traduce la consulta de `PermissionEvaluator` y escribir la prueba de ≤ 2 consultas por petición. |
| WP4 — Endurecimiento de seguridad | **En curso** (S1 → S4) | Ver «Estado de WP4» abajo. |
| WP5 — Google OAuth/OIDC | Pendiente | Flujo backend, vinculación de cuentas, configuración/proxy, opciones de autenticación y hooks para pruebas de Build. |
| WP6 — Esqueletos/plantilla de módulos | Pendiente | Generador y esqueletos de Brisa, Balance, Ágora, Cosecha y Huella según §9. |
| WP7 — Cimientos de frontend/sesión/errores/shell | Pendiente | Router, cliente API, sesión, errores y shell según §10. |
| WP8 — Tailwind CSS/sistema de diseño | Pendiente | Migración y métricas de auditoría conforme a §11. |
| WP9 — Infraestructura/CI/repositorio | Pendiente | Ajustes restantes de §12, sin salirse del alcance de Fase 0. |
| WP10 — Testabilidad/documentación/datos | Pendiente | Hooks para Build, documentación, ADR y datos de prueba conforme a §13. |

## WP2 — Resultado conocido y limitaciones

S4-01 contrasta estáticamente `Pastel.SharedKernel`, `Pastel.Platform` y `Pastel.Host` contra la sección 5 y registra los criterios como cumplidos. También corrigió una espera síncrona dentro de una ruta asíncrona en `InitializePastelAsync`.

- Evidencia: checkpoint S4-01 en `PROGRESS-HISTORY.md`.
- **No compilado** en el registro de esa sesión; la sintaxis MSBuild del filtrado `PastelModules` y el build por subconjunto de módulos requieren verificación de Build.
- Para Identity sigue siendo relevante revisar el registro de `UniqueViolationMap` y `ForcePasswordChangeOptions.AllowedPaths`. Para OAuth, revisar `PublicBaseUrlOptions.PathPrefixes`.

## WP3 — Avances documentados

La bitácora hasta S4-07 registra:

- Dominio Identity y `IdentityDbContext` bajo el esquema `identity`, catálogo declarado desde los módulos, evaluación de permisos, usuario actual, auditoría, JWT/cookies y tareas de arranque.
- Endpoints/slices para CSRF, login, registro, refresh, logout, usuario actual y cambio de contraseña.
- Administración por slices para usuarios, roles, permisos, módulos y auditoría. Los listados de usuarios/auditoría usan `{ items, page, pageSize, totalCount }` con filtros en el servidor.
- `CreateModule` se retiró y no se debe recrear.
- Las validaciones registradas para estos checkpoints fueron principalmente `git diff --check`; **no hay constancia de compilación completa ni de pruebas ejecutadas**.

### Legado de las capas antiguas (resuelto)

`PrivilegeGuard.cs` (antiguo `AdministrationService`), `SessionService.cs` (antiguo `AuthService`) y `DatabaseSeeder.cs` se **eliminaron** tras comprobar que no tenían consumidores y que su lógica vive en los slices de `Features/*`, `CatalogSyncTask` y `BootstrapAdminTask` (único método sin reemplazo: `CreateModule`, retirado a propósito). Sin compilar; solo búsqueda de referencias.

Pendiente para Build en `Pastel.Modules.Identity.Tests`: la carpeta aún usa `RootNamespace` `Pastel.Application.Tests`, una `ProjectReference` a `Pastel.Application` y `using Pastel.Application.Contracts`/`Pastel.Domain.Entities`. Es código de pruebas: lo adapta Build, no Dev.

### Cierre de WP3 (auditoría contra §6, 2026-10-18)

Contraste estático punto por punto; **sin compilar**.

1. **Datos:** `IdentityDbContext` con esquema `identity`; `PasswordHash` nulo; `Version` (`uint`, `IsRowVersion`, `xmin`) en usuarios, roles y módulos. La migración **no existe**: la genera Build.
2. **Slices:** 23 endpoints en `Features/*` (ningún archivo > 150 líneas). Rutas y métodos idénticos a los controladores de `dev@b705614` (`/api/auth/*`, `/api/admin/*`, incluido `PATCH /api/admin/modules/{moduleId}`); cookies `__Host-pastel_*` sin cambios.
3. **Permisos y consultas:** `PermissionEvaluator` es la fuente única (autorización y `/api/auth/me`). `OnTokenValidated` carga una vez el estado de sesión y el resumen de la persona en `HttpContext.Items`; `ForcePasswordChange` lo lee de ahí. Resultado: 1 consulta de sesión + 1 de permisos por petición.
4. **Catálogo:** códigos de permiso idénticos a los anteriores; `CatalogSyncTask` idempotente (todo a Administrator, roles sugeridos solo si no existen); `Member` recibe `dashboard.view` por `SuggestedRoles`; `BootstrapAdminTask` audita la creación y la restauración (*break-glass*).
5. `CreateModule` no existe en `src/`.
6. **Auditoría:** `AuditRecord` con antes/después a `DetailsJson`, módulo y `TraceId`; accesos denegados con límite por minuto; `ListUsers` y `ListAudit` paginan y filtran en el servidor.
7. **Referencias colgantes:** no quedan en código de producto (se verificaron namespaces `Pastel.*`, tipos clave y versiones centrales de paquetes). Solo el proyecto de pruebas conserva `Pastel.Application`/`Pastel.Domain` (tarea de Build).

## Siguiente trabajo después de cerrar WP3: WP4

Implementa WP4 según la sección 7 de `FASE-0-REFACTOR-BASE.md`, en el orden indicado:

- **S1 — Jerarquía de privilegios:** guardas en todas las operaciones administrativas; protección de cuentas y rol Administrator; invariante del último administrador; denegaciones 403 con códigos `identity.privilege.*`, logs y auditoría.
- **S2 — Sesiones/refresh:** ventana de gracia configurable para concurrencia legítima, detección de reutilización fuera de la ventana, transacción y reintentos acotados; documentar la decisión en ADR.
- **S3 — Login/registro/bloqueo/configuración:** hash ficticio para correo inexistente, bloqueo con espera creciente solo para contraseña, configuración de producción segura, autorregistro desactivado por defecto y límite por cuenta en el servidor.
- **S4 — JWT/contraseñas/retención:** rechazo de claves conocidas en producción, rotación con `kid`, una política de contraseña tipo NIST como fuente única, limpieza de tokens vencidos y retención de auditoría configurable.

Confirma el código antes de aplicar cada punto. Si un requisito de WP4 depende de un endpoint o contrato que WP5 también menciona (por ejemplo `/api/auth/options`), implementa una única fuente de verdad y documenta la coordinación; no dupliques endpoints ni políticas.

Después continúa WP5–WP10 en orden conforme a la especificación. No adelantes funcionalidades fuera del alcance.

## Estado de WP4 (en curso)

- **S1 — Jerarquía de privilegios:** `IPrivilegeGuard` aplicado en SetUserRoles, SetUserPermissions, BlockUser, UnblockUser, ResetUserPassword, CreateUser, CreateRole y SetRolePermissions. Rol Administrator inmutable; al promover a administrador se limpian sus excepciones. Cada denegación responde 403 `identity.privilege.*`, genera Warning y auditoría `identity.privilege.denied`. **Documentación agregada** en `docs/SECURITY.md` para la jerarquía y el *break-glass* (commit `b83a052`). La invariante del último administrador se protege en `SetUserRoles` y `BlockUser` con transacción serializable; su prueba bajo concurrencia queda para Build. La implementación aún requiere compilación y revisión automatizada.
- **Decisión S1:** además de lo literal de §7, un no-Administrator solo agrega a una cuenta roles cuyos permisos ya posee (asignar un rol equivale a conceder sus permisos).
- **S3 (avance parcial, commit `630cb38`):** `LoginHandler` realiza una verificación PBKDF2 ficticia cuando la cuenta no existe o no tiene hash; el bloqueo de contraseña crece desde 15 minutos hasta 4 horas conforme a ciclos repetidos y se reinicia tras un login válido. Esto reduce la enumeración temporal y reemplaza el bloqueo fijo. **Sin compilar ni ejecutar pruebas**; Build debe verificar que el hash ficticio V3 coincide con las opciones del `PasswordHasher` y revisar tiempos/error paths. Pendiente S3: límite por cuenta en servidor y validación fail-fast de la configuración de producción.
- **S2 — Gracia de refresh implementada en código** (commits `208952e`, `7d79c5a`, `e77a3f1`, `8368efd`, `34ef687`, `8bfecf4`; ADR `dcaf979`): la fila de refresh conserva hash del sucesor, fin de gracia y ciphertext AES-GCM temporal; una repetición dentro de la gracia recibe el mismo refresh vigente más un access token nuevo; la reutilización posterior a la ventana revoca sesiones. `ReuseGraceSeconds` se valida entre 0 y 60. **No compilado**; Build debe generar la migración inicial (no a mano) y comprobar concurrencia, expiración, logout y cambio de contraseña.
- **S3 — Login avanzado parcialmente** (commits `630cb38`, `2ffeab5`, `c42fbf3`, `0c88339`, `9563195`): hash ficticio para cuentas inexistentes/sin contraseña, bloqueo exponencial desde 15 minutos hasta 4 horas tras ciclos repetidos y limitador por cuenta (HMAC del correo, 10 intentos/15 min, además del límite por IP). **No compilado ni probado**; Build debe validar el hash V3 del PasswordHasher, concurrencia del limitador y el comportamiento genérico de respuesta.
- **S3 — código implementado parcialmente/por validar:** además del login ficticio y bloqueo creciente, `LoginAccountRateLimiter` aplica 10 intentos por identidad normalizada cada 15 minutos (clave HMAC opaca, máximo 10 000 entradas rastreadas) además del límite por IP; `ProductionSecurityValidationTask` (orden -100) impide que Production migre/inicie con correo de bootstrap predeterminado o secretos de ejemplo. El *break-glass* y la jerarquía se documentaron en `SECURITY.md` (commit `b83a052`). Falta verificación de Build para tiempos, concurrencia, límites y arranque seguro.
- **S4 — backend implementado en código, pendiente de validación:** `PasswordPolicy` ahora exige 12–128 caracteres, permite frases/espacios y rechaza una lista embebida de contraseñas comunes sin imponer composición. JWT emite `kid`, valida clave actual y anterior (identificadores configurables) y Compose expone las variables de rotación. `IdentityRetentionService` limpia refresh tokens expirados hace más del plazo configurado, elimina ciphertexts de gracia vencidos y aplica retención configurable de auditoría (365 días por defecto). Se agregó `Identity:Retention` a appsettings y Compose.
- **WP4 todavía NO está validado ni se debe marcar como terminado:** no se ha ejecutado compilación ni pruebas. El endpoint general `/api/auth/options` y su consumo en frontend se dejan para la coordinación prevista en WP5/WP7; no implementar OAuth todavía.
- **D1 backend:** el límite por IP existente y el límite nuevo por cuenta están; queda revisar/validar la configuración de proxy confiable, `AllowedHosts` y la IP usada en auditoría/rate limiting.

## Validación y entrega conocidas

- **Build de esta sesión bloqueado por el entorno disponible:** al intentar inspeccionar el entorno no se encontró `dotnet`, ni `docker`, ni caché local de paquetes; tampoco hay resolución DNS hacia `github.com` (por tanto no es posible clonar/restaurar NuGet desde esta sesión). No se pudo ejecutar `dotnet build`, `dotnet test`, `dotnet ef` ni `docker compose`. No se afirma que el código compile.
- WP1 sigue pendiente de ejecutar sobre el SHA base `dev@7ba6f1c` y fusionar su resultado en la rama; requiere un runner/entorno Build con .NET 10, NuGet y Docker. WP3 requiere la migración inicial de EF Core y adaptar `src/Modules/Identity/Pastel.Modules.Identity.Tests` (sigue referenciando las capas antiguas); no escribir migraciones manualmente.
- Validaciones de código en esta sesión fueron revisión estática del contenido remoto de GitHub; no equivalen a compilación o pruebas. No infieras el estado del entorno de sesiones anteriores; reporta cada comando y resultado real.
- Cada checkpoint debe enumerar el subobjetivo, archivos/cambios, decisiones, comando y resultado real de cada validación, limitaciones, pendientes y siguiente acción.
- Antes de finalizar una sesión, publica el último estado coherente en esta rama y deja un siguiente paso accionable. El handoff de Dev solo habilita el trabajo posterior de Build/QA; no significa que Fase 0 esté aprobada.
