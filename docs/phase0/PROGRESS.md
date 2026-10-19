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

- **S1 — Jerarquía de privilegios:** `IPrivilegeGuard` aplicado en SetUserRoles, SetUserPermissions, BlockUser, UnblockUser (ahora con `UnblockUserHandler`), ResetUserPassword, CreateUser, CreateRole y SetRolePermissions. Rol Administrator inmutable (ya no se "fuerza" en silencio: se deniega con `identity.privilege.system_role_immutable`); al promover a administrador se limpian sus excepciones. Cada denegación: 403 `identity.privilege.*`, Warning y auditoría `identity.privilege.denied`. **Falta:** documentar el *break-glass* y la jerarquía en `SECURITY.md`. La invariante del último administrador sigue en `SetUserRoles` y `BlockUser` (transacción serializable); su prueba bajo concurrencia es de Build.
- **Decisión S1:** además de lo literal de §7, un no-Administrator solo agrega a una cuenta roles cuyos permisos ya posee (asignar un rol equivale a conceder sus permisos).
- S2, S3, S4 y D1 backend: pendientes.

## Validación y entrega conocidas

- Validaciones citadas en los últimos checkpoints: `git diff --check`; no consta `dotnet build`, pruebas completas ni ejecución de Docker para WP2/WP3.
- No infieras el estado del entorno de sesiones anteriores; sigue las instrucciones actuales del rol y reporta exactamente qué ejecutaste.
- Cada checkpoint debe enumerar el subobjetivo, archivos/cambios, decisiones, comando y resultado real de cada validación, limitaciones, pendientes y siguiente acción.
- Antes de finalizar una sesión, publica el último estado coherente en esta rama y deja un siguiente paso accionable. El handoff de Dev solo habilita el trabajo posterior de Build/QA; no significa que Fase 0 esté aprobada.
