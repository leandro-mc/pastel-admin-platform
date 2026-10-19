# Fase 0 — Estado actual del refactor (rol Dev)

> **Fuente de verdad para el relevo.** Este archivo resume el estado actual y los siguientes pasos; no agregues resúmenes iniciales repetidos. El detalle de sesiones anteriores se conserva en [`PROGRESS-HISTORY.md`](./PROGRESS-HISTORY.md), solo como historial. Si existe una discrepancia, inspecciona el código y actualiza este documento.

Última reconciliación documental: 2026-10-19 (hora local de Costa Rica; los logs de prueba están en UTC).

## Repositorio y reglas vigentes

- Repositorio: `leandro-mc/pastel-admin-platform`.
- Rama de trabajo: `refactor/modular-foundation`. Antes de tocar archivos, confirma el HEAD real con `git fetch origin`, `git status --short --branch` y `git log --oneline --decorate -10`.
- Base de integración documentada: `dev` en `7ba6f1c80ad1025acc3333096ff3878b3226b0f4`. No integres cambios nuevos de `dev` por iniciativa propia.
- No abrir PR, hacer merge ni integrar en `dev` sin autorización explícita del propietario. Autorizar un PR no autoriza su merge.
- **Tipo de agente por tarea:** el orquestador lo indica en cada asignación; no se infiere del progreso anterior. Para el siguiente agente de la cadena de desarrollo, el propietario asignó **Tipo 1**: checkpoint con commit + push coherente al menos cada 3 minutos e incluir `PROGRESS.md` según `AGENTS.md`. Sigue aplicando la prohibición de force push, reescritura de historia compartida y publicación de secretos.
- Dev implementa código de producto; no escribe pruebas ni planes de pruebas. No inventes resultados ni afirmes que algo compila si no se verificó. Sigue las instrucciones de `FASE-0-REFACTOR-BASE.md` y declara de forma explícita lo que quedó sin compilar/validar. Build/QA se encarga de pruebas, compilación completa y migraciones EF Core.

## Estado actual por WP

| WP | Estado actual | Qué falta |
|---|---|---|
| WP1 — Línea base de pruebas | **Sin evidencia de cierre en esta bitácora; responsabilidad de Build** | Confirmar el resultado de Build y la integración de la línea base en la rama según la sección 4 del plan. Dev no debe rehacerla. |
| WP2 — SharedKernel, Platform, Host | **Revisión estática registrada como completa** en S4-01 | No se compiló. Build debe verificar los puntos sensibles descritos abajo y validar el proyecto completo. |
| WP3 — Identity | **21/21 pruebas locales confirmadas (16 unitarias + 5 de integración, 0 fallidas y 0 omitidas)** | Build/QA mantiene pendiente la cobertura adicional de caracterización/autorización, traducción SQL de `PermissionEvaluator` y presupuesto de ≤ 2 consultas por petición. Esto no cambia el siguiente WP de desarrollo. |
| WP4 — Endurecimiento de seguridad | **Implementación de producto registrada; cobertura integrada completa pendiente** | Build/QA: completar la matriz S1–S4 y registrar sus resultados. El runner señala brechas de cobertura de QA; no es una instrucción para el agente Dev ni impide que continúe el siguiente WP de desarrollo. |
| WP5 — Google OAuth/OIDC | **En curso (Dev, Tipo 1).** Hecho: tabla `external_logins` (entidad + `DbContext`). Ver «WP5 — Bitácora» |  Continuar implementación según §8, leyendo primero `AGENTS.md` y esta bitácora. Dejar el proveedor remoto falso inyectable para Build/QA; la validación de QA queda como responsabilidad separada. `/api/auth/options` informa `google: false` hasta que se implemente WP5. |
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

Se corrigió `Pastel.Modules.Identity.Tests.csproj` para referenciar `Pastel.Modules.Identity`, restaurar el namespace modular y usar versiones centrales de paquetes (commit `373d6dd`). `SecurityPolicyTests.cs` cubre la política de contraseñas, decisiones de permisos, protección AES-GCM de refresh y límite por cuenta (commits `baa593d`, `ce4d9e3`). El usuario confirmó la compilación local de toda la solución y **16/16 pruebas unitarias aprobadas**, además de **4/4 smoke tests de integración aprobados** en la base dedicada. Se agregó ahora una quinta prueba de integración que verifica la migración inicial y la ausencia de migraciones pendientes; **esta prueba nueva aún no se ha ejecutado localmente**. Falta ampliar la validación de concurrencia, autorización y escenarios de seguridad; no marcar WP3/WP4 como completos por estas pruebas básicas.

### Cierre de WP3 (auditoría contra §6, 2026-10-18)

Contraste estático punto por punto; **sin compilar**.

1. **Datos:** `IdentityDbContext` con esquema `identity`; `PasswordHash` nulo; `Version` (`uint`, `IsRowVersion`, `xmin`) en usuarios, roles y módulos. Build/usuario generó con EF Core la migración `20261019050514_InitialIdentity` y `IdentityDbContextModelSnapshot.cs` (commit `ff1d8c5`); el 2026-10-19 el usuario confirmó su fila en `identity."__EFMigrationsHistory"` con `ProductVersion` `10.0.13`.
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
- **Validación de WP4:** no se puede declarar completo hasta ejecutar las pruebas de las secciones 3–4 de `docs/testing/plans/FASE-0-TEST-PLAN.md`. La ejecución local más reciente de `dotnet test Pastel.slnx` terminó con compilación exitosa y **20/20 pruebas correctas, 0 errores y 0 omitidas**: 16 unitarias y 4 smoke tests de integración. El arnés confirma HTTP 200 para salud, CSRF y opciones de autenticación, y 401 para administración anónima. No cubre aún la matriz integrada completa de permisos, refresh/login, concurrencia ni el frontend single-flight de WP7.
- **Alcance:** WP5 (Google OAuth) no se ha comenzado. `/api/auth/options` solo expone la configuración local y declara Google como no disponible; el flujo OAuth/vinculación de cuentas sigue pendiente para WP5.
- **Commits representativos del trabajo de seguridad:** `630cb38` (hash ficticio/lockout), `8bfecf4` (gracia refresh), `dcaf979`/`6ac0a82` (ADR), `2ffeab5`/`c42fbf3` (límite por cuenta), `79c67be` (validación Production), `07db059`/`147dc6b` (JWT `kid` y rotación), `84572fc`/`5d4463f` (política), `826a69b`/`3a9d413` (retención), `e0d8265`/`1bb7a00` (opciones de autenticación), `45a837b` (validación CIDR), `ed98a0c`/`9410a4b` (entorno Compose configurable), `2dbd9ca`/`47059d` (revocación de cadena refresh), `b7c577a`/`f3cd6fa` (alineación de códigos S1), `3877458`/`8d8cc5c`/`54c1bc0` (bloqueo propio siempre 403 y auditado), `fa99bb2` (clave bootstrap de producción fuerte).
 

## Validación Docker, migración y bloqueos actuales — 2026-10-19

- **Build Docker:** exitoso según la confirmación previa del usuario tras resolver seis incidencias de compilación.
- **Migración inicial de Identity generada y aplicada:** el usuario ejecutó `dotnet ef migrations add InitialIdentity`; EF informó `Build succeeded`. El 2026-10-19, la consulta por stdin a PostgreSQL devolvió una fila en `identity."__EFMigrationsHistory"`: `20261019050514_InitialIdentity | 10.0.13`. La aplicación de la migración inicial queda confirmada.
- **Archivos publicados:** `src/Modules/Identity/Pastel.Modules.Identity/Persistence/Migrations/20261019050514_InitialIdentity.cs`, `20261019050514_InitialIdentity.Designer.cs` y `IdentityDbContextModelSnapshot.cs`. Commit de migración: [`ff1d8c5`](https://github.com/leandro-mc/pastel-admin-platform/commit/ff1d8c503b3487daa404a101a79471a4d73ac2bd).
- **Arranque local observado por el usuario (2026-10-19):** tras reconstruir la API, los logs dejaron de mostrar la excepción fatal `No se encontraron migraciones de EF Core`. `CatalogSyncTask` sincronizó 2 grupos y 13 permisos; `BootstrapAdminTask` creó la cuenta inicial; la API registró `Application started` y `GET /api/auth/csrf` respondió HTTP 200. En una comprobación posterior, `docker compose ps` mostró la API `Up` y la base de datos `healthy`.
- **Tablas observadas:** la consulta a `information_schema.tables` devuelve 10 tablas bajo el esquema `identity`, entre ellas `__EFMigrationsHistory`, `users`, `roles`, `permissions`, `refresh_tokens` y tablas de relaciones/auditoría.
- **Inicio de sesión no validado:** los logs compartidos muestran intentos a `/api/auth/login` que respondieron HTTP 401 (`identity.login.invalid_credentials`), incluido un intento para la cuenta inicial con contraseña incorrecta y otros para una cuenta desconocida. No hay evidencia de login exitoso. Tras entrar con la cuenta inicial, cambiar su contraseña temporal inmediatamente; no registrar credenciales en esta bitácora.
- **Advertencia de Development:** ASP.NET Data Protection usa un repositorio de claves en memoria/efímero, por lo que las claves no sobreviven al reinicio. Resolver persistencia y protección de claves antes de producción.
- **Build y pruebas .NET confirmadas por el usuario (2026-10-19):** `dotnet test Pastel.slnx` con `PASTEL_TEST_CONNECTION_STRING` hacia `pastel_integration_tests` terminó con **21 correctas, 0 errores y 0 omitidas**; compilación correcta. Recuento informado: 16 unitarias + 5 de integración (incluye la aserción de `20261019050514_InitialIdentity` aplicada y sin migraciones pendientes). Este resultado corresponde a la ejecución del usuario; el script automatizador agregado en este checkpoint todavía no fue ejecutado en este entorno.
- **Arnés de integración:** `tests/Pastel.IntegrationTests` usa `WebApplicationFactory<Program>` y exige que `PASTEL_TEST_CONNECTION_STRING` apunte exactamente a `pastel_integration_tests`; sin la variable, las pruebas HTTP/PostgreSQL quedan omitidas. `IdentityApiFactory` reemplaza explícitamente el registro de `IdentityDbContext`, evitando que la prueba use por accidente la base `pastel`. La última ejecución reportada valida cinco pruebas de integración, incluida la migración inicial. El runner recrea la base dedicada para que la comprobación empiece desde cero.
- **Automatización (alcance corregido, 2026-10-19):** `scripts/Validate-PreWP5.ps1` comprueba Compose, inicia solo PostgreSQL, recrea exclusivamente `pastel_integration_tests`, configura la cadena de conexión sin imprimir secretos, y ejecuta restore, formato .NET, build y tests Release con TRX. Construye únicamente la imagen Docker de la API. No instala dependencias, no revisa formato, no compila ni ejecuta lint/pruebas del frontend: este permanece fuera de alcance hasta sus WPs correspondientes (WP7/WP8). No levanta la API ni elimina/recrea la base de desarrollo `POSTGRES_DB` ni el volumen. La base de pruebas se conserva al final y se vuelve a recrear en la próxima ejecución.
- **Hallazgo de formato backend (2026-10-19):** la ejecución local del propietario mostró diagnósticos `error WHITESPACE` en `ListRolesEndpoint.cs`, `ListUsersHandler.cs`, `SetUserPermissionsHandler.cs` y `JwtBearerSetup.cs`, aunque el script los rotuló como correctos. Se ajustó el runner para que estos diagnósticos hagan fallar el chequeo de formato; no se afirma que los archivos ya estén corregidos.
- **Error de análisis de PowerShell reportado por el usuario:** la primera versión de `Validate-PreWP5.ps1` falló con `ParserError` alrededor del mensaje que comprobaba el binding de loopback, y aparecieron errores en cascada. Se corrigió ese mensaje para construirlo mediante `-f`, se retiraron caracteres no ASCII del `.ps1` para evitar mojibake en Windows PowerShell 5.1 sin BOM, se simplificaron textos con comillas anidadas y se inicia el servicio `db` antes de resolver su puerto publicado. Esta nueva versión todavía requiere que el usuario la ejecute localmente; no se afirma que ya pasó el parser.
- **Cobertura QA pendiente:** el runner exige anotaciones `Trait("RequirementId", "...")` para casos WP3/WP4 aún no representados, incluyendo F0-S101–F0-S116, F0-S203–F0-S205, F0-S207, bloqueo de contraseña, F0-S209–F0-S214 y las verificaciones SQL/presupuesto de consultas para `PermissionEvaluator`. La suite existente no contiene toda esa matriz. El runner debe evidenciar esa brecha hasta que Build/QA agregue y ejecute las pruebas reales; las etiquetas por sí solas no demuestran cobertura. Esto es estado de QA separado: **el agente Dev que inicia WP5 no recibe la tarea de escribir ni ejecutar pruebas**. La parte de F0-S208 que comprueba el efecto del bloqueo sobre Google se completa con el flujo implementado y la validación de QA.
- **Flujo de relevo:** no se mantienen prompts específicos por WP dentro del repositorio. El prompt de asignación se entrega por chat; los documentos persistentes de contexto siguen siendo `AGENTS.md` y `docs/phase0/PROGRESS.md`. El siguiente agente Dev continúa la próxima tarea de desarrollo incompleta que indique el progreso, con el tipo indicado por el orquestador. Build/QA conserva separadamente la responsabilidad de las pruebas y validaciones pendientes.
- **WP1/C1 y pruebas adicionales:** su evidencia de cierre continúa pendiente de Build/QA según el plan. No alterar el estado de estos elementos por inferencia ni atribuir sus tareas al agente Dev de WP5.
- **Siguiente paso de desarrollo:** sincronizar los cambios publicados según el flujo normal del repositorio, leer `AGENTS.md` y esta bitácora, y comenzar WP5. Build/QA mantiene su trabajo pendiente de validación separado. No abrir PR ni integrar en `dev`/`main` sin autorización explícita del propietario.

## WP5 — Bitácora (Dev, Tipo 1; sin compilar)

Sesión iniciada sobre `origin/refactor/modular-foundation` `0959ff1`. El trabajo local previo de esta sesión (reescrituras de Identity) quedó superado por el remoto y se resguardó en la rama local `backup/dev-superado-local` (no publicada).

- [x] **Modelo de datos (§8.2):** `ExternalLogin` y `identity.external_logins` (`id`, `user_id`, `provider`, `provider_subject`, `email_at_link`, `email_verified`, `created_at`, `last_login_at`; único `(provider, provider_subject)` y único `(user_id, provider)`). **Pendiente Build:** generar la migración con `dotnet ef` (Dev no escribe migraciones).
- [ ] Autenticación: esquemas `ExternalCookie` y `Google`, registro condicionado a credenciales.
- [ ] Slices `GoogleStart` y `GoogleComplete` con reglas de cuenta, `returnUrl` seguro y errores por redirección.
- [ ] `/api/auth/options` con `google` real.
- [ ] Configuración: `.env.example`, `compose.yaml`, nginx (`Host`/`X-Forwarded-Host`, límite de tasa), `SECURITY.md`.
