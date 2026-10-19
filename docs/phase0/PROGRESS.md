# Fase 0 — Estado actual del refactor (rol Dev)

> **Fuente de verdad para el relevo.** Este archivo resume el estado actual y los siguientes pasos; no agregues resúmenes iniciales repetidos. El detalle de sesiones anteriores se conserva en [`PROGRESS-HISTORY.md`](./PROGRESS-HISTORY.md), solo como historial. Si existe una discrepancia, inspecciona el código y actualiza este documento.

Última reconciliación documental: 2026-10-19.

## Repositorio y reglas vigentes

- Repositorio: `leandro-mc/pastel-admin-platform`.
- Rama de trabajo: `refactor/modular-foundation`. Antes de tocar archivos, confirma el HEAD real con `git fetch origin`, `git status --short --branch` y `git log --oneline --decorate -10`.
- Base de integración documentada: `dev` en `7ba6f1c80ad1025acc3333096ff3878b3226b0f4`. No integres cambios nuevos de `dev` por iniciativa propia.
- No abrir PR, hacer merge ni integrar en `dev` sin autorización explícita del propietario. Autorizar un PR no autoriza su merge.
- **Tipo asignado a la tarea actual: Tipo 2.** La cadencia se aplica según `AGENTS.md`: Tipo 1 publica commit + push al menos cada 3 minutos; Tipo 2 publica al completar unidades de trabajo coherentes, sin commits mínimos por cada ajuste. Si una tarea futura no indica tipo, el agente debe preguntar antes de continuar. En ambos casos, revisar el diff, mantener este archivo al día con el avance correspondiente y publicar antes de cambiar de contexto o ante riesgo de interrupción. Sin force push, sin reescribir historia y sin secretos.
- Dev implementa código de producto; no escribe pruebas ni planes de pruebas. No inventes resultados ni afirmes que algo compila si no se verificó. Sigue las instrucciones de `FASE-0-REFACTOR-BASE.md` y declara de forma explícita lo que quedó sin compilar/validar. Build/QA se encarga de pruebas, compilación completa y migraciones EF Core.

## Estado actual por WP

| WP | Estado actual | Qué falta |
|---|---|---|
| WP1 — Línea base de pruebas | **Sin evidencia de cierre en esta bitácora; responsabilidad de Build** | Confirmar el resultado de Build y la integración de la línea base en la rama según la sección 4 del plan. Dev no debe rehacerla. |
| WP2 — SharedKernel, Platform, Host | **Revisión estática registrada como completa** en S4-01 | No se compiló. Build debe verificar los puntos sensibles descritos abajo y validar el proyecto completo. |
| WP3 — Identity | **Código e inicial migration generada; pendiente validación de ejecución** | Build: revisar y aplicar `InitialIdentity` en PostgreSQL, adaptar/ejecutar las pruebas movidas, verificar la traducción EF de `PermissionEvaluator` y probar el límite de ≤ 2 consultas por petición. |
| WP4 — Endurecimiento de seguridad | **Código implementado; pendiente de Build/QA** | S1–S4 y D1 tienen cambios publicados, pero no se han compilado ni ejecutado sus pruebas; ver el estado consolidado más abajo. |
| WP5 — Google OAuth/OIDC | Pendiente; **no iniciado** | Flujo Google, vinculación de cuentas, configuración/proxy y pruebas con proveedor falso. La ruta común `/api/auth/options` existe, pero informa `google: false` hasta WP5. |
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

Se corrigió `Pastel.Modules.Identity.Tests.csproj` para referenciar `Pastel.Modules.Identity`, restaurar el namespace modular y usar versiones centrales de paquetes (commit `373d6dd`). `SecurityPolicyTests.cs` cubre la política actual, la protección AES-GCM de refresh (round-trip y tampering) y el límite por cuenta (commits `baa593d`, `ce4d9e3`). **Ninguna prueba se ha ejecutado**: este entorno no tiene .NET. Build debe comprobar compilación, ampliar/ejecutar las pruebas de concurrencia e integración y resolver cualquier fallo real.

### Cierre de WP3 (auditoría contra §6, 2026-10-18)

Contraste estático punto por punto; **sin compilar**.

1. **Datos:** `IdentityDbContext` con esquema `identity`; `PasswordHash` nulo; `Version` (`uint`, `IsRowVersion`, `xmin`) en usuarios, roles y módulos. Build/usuario generó con EF Core la migración `20261019050514_InitialIdentity` y `IdentityDbContextModelSnapshot.cs` (commit `ff1d8c5`); falta verificar su aplicación real en PostgreSQL.
2. **Slices:** los endpoints originales de autenticación y administración están organizados en `Features/*` (ningún archivo > 150 líneas en la auditoría original). Se agregó después `GET /api/auth/options` para exponer la política única de contraseña; declara `google: false` hasta WP5. Los contratos/cookies preexistentes se conservan.
3. **Permisos y consultas:** `PermissionEvaluator` es la fuente única (autorización y `/api/auth/me`). `OnTokenValidated` carga una vez el estado de sesión y el resumen de la persona en `HttpContext.Items`; `ForcePasswordChange` lo lee de ahí. Resultado: 1 consulta de sesión + 1 de permisos por petición.
4. **Catálogo:** códigos de permiso idénticos a los anteriores; `CatalogSyncTask` idempotente (todo a Administrator, roles sugeridos solo si no existen); `Member` recibe `dashboard.view` por `SuggestedRoles`; `BootstrapAdminTask` audita la creación y la restauración (*break-glass*).
5. `CreateModule` no existe en `src/`.
6. **Auditoría:** `AuditRecord` con antes/después a `DetailsJson`, módulo y `TraceId`; accesos denegados con límite por minuto; `ListUsers` y `ListAudit` paginan y filtran en el servidor.
7. **Referencias colgantes:** no quedan en código de producto tras retirar los tres archivos heredados. En esta sesión se corrigió el csproj de `Pastel.Modules.Identity.Tests` y se eliminaron las referencias de sus pruebas a `Pastel.Application`/`Pastel.Domain`; esto requiere confirmación mediante compilación.

## Siguiente trabajo después de cerrar WP3: WP4

Implementa WP4 según la sección 7 de `FASE-0-REFACTOR-BASE.md`, en el orden indicado:

- **S1 — Jerarquía de privilegios:** guardas en todas las operaciones administrativas; protección de cuentas y rol Administrator; invariante del último administrador; denegaciones 403 con códigos `identity.privilege.*`, logs y auditoría.
- **S2 — Sesiones/refresh:** ventana de gracia configurable para concurrencia legítima, detección de reutilización fuera de la ventana, transacción y reintentos acotados; documentar la decisión en ADR.
- **S3 — Login/registro/bloqueo/configuración:** hash ficticio para correo inexistente, bloqueo con espera creciente solo para contraseña, configuración de producción segura, autorregistro desactivado por defecto y límite por cuenta en el servidor.
- **S4 — JWT/contraseñas/retención:** rechazo de claves conocidas en producción, rotación con `kid`, una política de contraseña tipo NIST como fuente única, limpieza de tokens vencidos y retención de auditoría configurable.

Confirma el código antes de aplicar cada punto. Si un requisito de WP4 depende de un endpoint o contrato que WP5 también menciona (por ejemplo `/api/auth/options`), implementa una única fuente de verdad y documenta la coordinación; no dupliques endpoints ni políticas.

Después continúa WP5–WP10 en orden conforme a la especificación. No adelantes funcionalidades fuera del alcance.

## Estado de WP4 — implementación publicada, sin validación de ejecución

- **S1 — Jerarquía de privilegios (código implementado):** `IPrivilegeGuard` está aplicado a cambios de roles/excepciones, bloqueo/desbloqueo, restablecimiento de contraseña y creación/edición de roles/usuarios. Protege el rol `Administrator`, evita concesiones de permisos no poseídos y conserva la invariante del último administrador mediante transacciones serializables. Las denegaciones generan 403, Warning y auditoría. Los códigos de escalación y último administrador se alinearon con el contrato del plan (`identity.privilege.escalation`, `identity.user.last_admin`); `SetUserRoles` evalúa primero la escalación para que F0-S101 reciba el código esperado. Bloquearse a sí mismo se deniega y audita también para Administrator (F0-S112). `docs/SECURITY.md` documenta la jerarquía y el *break-glass*. Pendiente Build: concurrencia y matriz completa de endpoints.
- **S2 — Refresh con ventana de gracia (código implementado):** `Auth:Refresh:ReuseGraceSeconds` valida 0–60 segundos (10 por defecto). El sucesor se guarda temporalmente cifrado con AES-GCM; repetir el token anterior dentro de la ventana recibe el mismo refresh aún vigente y un access token nuevo; fuera de ventana la reutilización revoca sesiones e incrementa `TokenVersion`. Las revocaciones que no tienen sucesor (logout, cambio de contraseña o bloqueo) no se confunden con robo. Las revocaciones de todas las sesiones limpian enlaces/ciphertexts de la cadena para no clasificar tokens históricos invalidados como una nueva reutilización. ADR: [ADR-0001](../adr/ADR-0001-refresh-token-grace-window.md). La limpieza elimina ciphertexts vencidos cada 30 segundos. Build debe comprobar migración y concurrencia con PostgreSQL real.
- **S3 — Login y límites (código implementado):** `LoginHandler` ejecuta hash PBKDF2 ficticio para una cuenta inexistente o sin contraseña; el bloqueo por contraseña crece de 15 minutos hasta 4 horas tras ciclos repetidos y se reinicia con un ingreso válido. `LoginAccountRateLimiter` limita 10 intentos por identidad normalizada cada 15 minutos (HMAC opaco y máximo 10 000 identidades rastreadas), adicional al límite por IP. El registro local está deshabilitado por defecto. Build debe verificar tiempos, concurrencia, límites y el hash V3 real.
- **S3 — Configuración de Production (código implementado):** `ProductionSecurityValidationTask` corre antes de migraciones y detiene Production ante correo de bootstrap predeterminado, contraseña bootstrap de ejemplo o menor de 16 caracteres, o secretos JWT de ejemplo. `BootstrapAdminTask` restaura el rol Administrator configurado, limpia un bloqueo por contraseña, revoca sesiones anteriores y audita el antes/después. Se documentó el mecanismo en `docs/SECURITY.md`.
- **S4 — Contraseñas (código implementado):** `PasswordPolicy` exige 12–128 caracteres, acepta frases y espacios, rechaza lista embebida de contraseñas comunes, y no aplica reglas de composición. También rechaza entradas comunes con espacios de padding. `GET /api/auth/options` ya expone `google: false` (hasta WP5), `localLogin`, `localRegistration` y `passwordPolicy`; el cliente aún debe consumir la política cuando llegue WP7. No se ha implementado Google OAuth.
- **S4 — JWT (código implementado):** tokens incluyen `kid`; la API valida contra la clave actual y, opcionalmente, la anterior con IDs distintos. Compose y `.env.example` declaran las variables de rotación; no se publican secretos reales.
- **S4 — Retención (código implementado):** `IdentityRetentionService` elimina ciphertexts al vencer la gracia, refresh tokens expirados después del plazo configurable y auditoría antigua según retención configurable (365 días por defecto). Se expusieron variables para plazos e intervalo de limpieza en Compose/`.env.example`.
- **D1 — Proxy e IP del cliente (código revisado):** `AllowedHosts` se configura por entorno; `ReverseProxy:TrustedNetworks` acepta CIDR y ahora falla ante una lista vacía o CIDR inválido en vez de ignorarlo; `UseForwardedHeaders` corre antes de rate limiting y auditoría, por lo que estas capas usan la IP tras validar el proxy. Compose permite seleccionar el entorno y `.env.example` usa Development por defecto para el stack local; Production debe seleccionarse explícitamente para ejecutar las validaciones de secretos. Se validan CIDR vacíos/incorrectos al configurar la plataforma.
- **Validación de WP4:** no se puede declarar completo hasta ejecutar compilación, migración y las pruebas de las secciones 3–4 de `FASE-0-TEST-PLAN.md`. Esta sesión añadió pruebas unitarias para política de contraseñas, protección AES-GCM y limitador por cuenta, pero **no se ejecutaron**. Los escenarios de refresh/login requieren tests de integración y concurrencia; F0-S201/S202/S206 dependen además del frontend single-flight de WP7.
- **Alcance:** WP5 (Google OAuth) no se ha comenzado. `/api/auth/options` solo expone la configuración local y declara Google como no disponible; el flujo OAuth/vinculación de cuentas sigue pendiente para WP5.
- **Commits representativos del trabajo de seguridad:** `630cb38` (hash ficticio/lockout), `8bfecf4` (gracia refresh), `dcaf979`/`6ac0a82` (ADR), `2ffeab5`/`c42fbf3` (límite por cuenta), `79c67be` (validación Production), `07db059`/`147dc6b` (JWT `kid` y rotación), `84572fc`/`5d4463f` (política), `826a69b`/`3a9d413` (retención), `e0d8265`/`1bb7a00` (opciones de autenticación), `45a837b` (validación CIDR), `ed98a0c`/`9410a4b` (entorno Compose configurable), `2dbd9ca`/`47059d` (revocación de cadena refresh), `b7c577a`/`f3cd6fa` (alineación de códigos S1), `3877458`/`8d8cc5c`/`54c1bc0` (bloqueo propio siempre 403 y auditado), `fa99bb2` (clave bootstrap de producción fuerte).
 

## Validación Docker, migración y bloqueos actuales — 2026-10-19

- **Build Docker:** exitoso según la confirmación previa del usuario tras resolver seis incidencias de compilación.
- **Migración inicial de Identity generada:** el usuario ejecutó `dotnet ef migrations add InitialIdentity`; EF informó `Build succeeded` y `Done`. Esto confirma la generación y el build de diseño, no por sí solos la aplicación en PostgreSQL.
- **Archivos publicados:** `src/Modules/Identity/Pastel.Modules.Identity/Persistence/Migrations/20261019050514_InitialIdentity.cs`, `20261019050514_InitialIdentity.Designer.cs` y `IdentityDbContextModelSnapshot.cs`. Commit de migración: [`ff1d8c5`](https://github.com/leandro-mc/pastel-admin-platform/commit/ff1d8c503b3487daa404a101a79471a4d73ac2bd).
- **Arranque local observado por el usuario (2026-10-19):** tras reconstruir la API, los logs dejaron de mostrar la excepción fatal `No se encontraron migraciones de EF Core`. `CatalogSyncTask` sincronizó 2 grupos y 13 permisos; `BootstrapAdminTask` creó la cuenta de arranque; la API registró `Application started`, y `GET /api/auth/csrf` respondió HTTP 200. Esto confirma que la API pudo arrancar y ejecutar estas tareas en esa ejecución.
- **Verificación de migración aún pendiente:** antes de los eventos de arranque, EF registró `Failed executing DbCommand` al consultar `identity."__EFMigrationsHistory"`. El error no detuvo esta ejecución, pero todavía se debe consultar la tabla de historial y las tablas del esquema `identity`; no declarar la migración completamente verificada hasta comprobar `20261019050514_InitialIdentity` allí.
- **Inicio de sesión no validado:** los logs muestran varios POST a `/api/auth/login` con HTTP 401 (`identity.login.invalid_credentials`), incluido un intento para la cuenta de arranque con contraseña incorrecta y otros para una cuenta desconocida. No hay evidencia de un login exitoso. El log avisa que se cambie la contraseña temporal de la cuenta de arranque inmediatamente; no incluir credenciales en la bitácora.
- **Advertencia operativa no bloqueante en Development:** ASP.NET Data Protection está usando un repositorio de claves en memoria/efímero; las claves no sobreviven al reinicio. Resolver almacenamiento persistente y protección de claves antes de considerar el despliegue de producción.
- **Siguiente paso inmediato:** ejecutar `docker compose ps` y consultar con `psql` `identity."__EFMigrationsHistory"` y las tablas del esquema `identity`. Después probar el login con la credencial temporal configurada, cambiarla inmediatamente tras el primer ingreso exitoso y continuar la validación funcional.
- **Validación WP3/WP4 pendiente:** el arranque no sustituye las pruebas automatizadas ni la validación de autorización, consultas de `PermissionEvaluator`, límite de consultas, refresh/concurrencia y seguridad. WP1 sigue pendiente de línea base y reporte C1 sobre `dev@7ba6f1c`; WP2–WP4 requieren verificación de Build/QA.
- WP5 (Google OAuth) no se ha iniciado. No abrir PR, hacer merge ni integrar en `dev` sin autorización explícita del propietario.
