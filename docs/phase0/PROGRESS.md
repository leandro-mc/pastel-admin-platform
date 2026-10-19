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
| WP3 — Identity | **Implementación principal de endpoints/slices registrada; falta cierre y limpieza** | Eliminar/adaptar legado, revisar referencias y auditar todos los criterios de §6 del plan. No pasar a WP4 hasta dejar WP3 coherente o documentar un bloqueo real. |
| WP4 — Endurecimiento de seguridad | Pendiente | Implementar S1–S4, después de cerrar WP3. |
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

### Bloqueo de cierre confirmado por inspección de archivos

Estos tres archivos todavía existen en la rama y conservan namespaces/usings de las capas anteriores que fueron retiradas. El agente siguiente debe inspeccionar sus referencias y retirar el legado con seguridad:

- `src/Modules/Identity/Pastel.Modules.Identity/Security/PrivilegeGuard.cs` — contiene el antiguo `AdministrationService`, namespace `Pastel.Infrastructure.Services`.
- `src/Modules/Identity/Pastel.Modules.Identity/Security/SessionService.cs` — contiene el antiguo `AuthService`, namespace `Pastel.Infrastructure.Services`.
- `src/Modules/Identity/Pastel.Modules.Identity/Persistence/DatabaseSeeder.cs` — conserva namespace/imports de `Pastel.Infrastructure` y entidades de `Pastel.Domain`.

La bitácora indica que la lógica de esos archivos ya fue reemplazada por los nuevos slices/tareas, pero eso debe confirmarse mediante búsquedas de referencias. Si no quedan consumidores legítimos, elimínalos; si algo sigue siendo necesario, migra la lógica al componente modular correcto antes de borrarlos. No conserves clases heredadas solo para evitar revisar referencias.

### Lista de cierre obligatoria para WP3

1. Revisa `IdentityModule.cs`, `Features/IdentityEndpoints.cs`, los manejadores de slices, `IdentityDbContext`, las tareas de inicio y las opciones de configuración.
2. Busca referencias a `Pastel.Application`, `Pastel.Domain`, `Pastel.Infrastructure`, `AdministrationService`, `AuthService` y `DatabaseSeeder` en el código de producción y en los proyectos. Resuelve las referencias colgantes.
3. Verifica `IdentityModule` y su registro: DbContext, opciones validadas, `IPermissionEvaluator`, `ICurrentUser`, auditoría, tareas de arranque, `UniqueViolationMap` y rutas permitidas cuando se exige cambiar una contraseña temporal.
4. Recorre la sección 6 de `FASE-0-REFACTOR-BASE.md` punto por punto: ruta y método HTTP, contrato/cookies, política de permisos, invariantes de administrador, paginación/filtros, auditoría antes/después, catálogo y ausencia de `CreateModule`.
5. Deja registrado que las pruebas movidas requieren adaptación/ejecución por Build; Dev no escribe ni modifica pruebas como parte de este trabajo.
6. Publica el cierre de WP3 con un checkpoint. Si hay un bloqueo, descríbelo concretamente y no marques WP3 como completo.

## Siguiente trabajo después de cerrar WP3: WP4

Implementa WP4 según la sección 7 de `FASE-0-REFACTOR-BASE.md`, en el orden indicado:

- **S1 — Jerarquía de privilegios:** guardas en todas las operaciones administrativas; protección de cuentas y rol Administrator; invariante del último administrador; denegaciones 403 con códigos `identity.privilege.*`, logs y auditoría.
- **S2 — Sesiones/refresh:** ventana de gracia configurable para concurrencia legítima, detección de reutilización fuera de la ventana, transacción y reintentos acotados; documentar la decisión en ADR.
- **S3 — Login/registro/bloqueo/configuración:** hash ficticio para correo inexistente, bloqueo con espera creciente solo para contraseña, configuración de producción segura, autorregistro desactivado por defecto y límite por cuenta en el servidor.
- **S4 — JWT/contraseñas/retención:** rechazo de claves conocidas en producción, rotación con `kid`, una política de contraseña tipo NIST como fuente única, limpieza de tokens vencidos y retención de auditoría configurable.

Confirma el código antes de aplicar cada punto. Si un requisito de WP4 depende de un endpoint o contrato que WP5 también menciona (por ejemplo `/api/auth/options`), implementa una única fuente de verdad y documenta la coordinación; no dupliques endpoints ni políticas.

Después continúa WP5–WP10 en orden conforme a la especificación. No adelantes funcionalidades fuera del alcance.

## Validación y entrega conocidas

- Validaciones citadas en los últimos checkpoints: `git diff --check`; no consta `dotnet build`, pruebas completas ni ejecución de Docker para WP2/WP3.
- No infieras el estado del entorno de sesiones anteriores; sigue las instrucciones actuales del rol y reporta exactamente qué ejecutaste.
- Cada checkpoint debe enumerar el subobjetivo, archivos/cambios, decisiones, comando y resultado real de cada validación, limitaciones, pendientes y siguiente acción.
- Antes de finalizar una sesión, publica el último estado coherente en esta rama y deja un siguiente paso accionable. El handoff de Dev solo habilita el trabajo posterior de Build/QA; no significa que Fase 0 esté aprobada.
