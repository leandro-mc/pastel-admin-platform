# Estado de requisitos de Fase 0 (Build/QA, 2026-10-21)

Rama `refactor/modular-foundation`. Cada fila se clasifica con evidencia real; **no hay informe de QA aprobado** y la Fase 0 sigue abierta.

**Evidencia ejecutada por el propietario (Windows, Docker, PostgreSQL; HEAD `e3d91fe`, 2026-10-25):** `test-backend` 51/51; `test-database` **46/46**; `test-frontend` completo (Vitest 21/21); `qa-phase0-stack.ps1` **10/10** y `-ModuleIsolation` (F0-003); y las dos pruebas manuales de Google. **Ejecutado por Build/QA en Linux:** pruebas de frontend y del hook, y la plantilla de nginx contra un API simulado.

## Resumen

- Obligatorios (79): APROBADO: 55, APROBADO PARCIAL: 4, POR VERIFICAR: 0, PENDIENTE: 0, BLOQUEADO: 0, DIFERIDO: 20.
- Todos (86, sin contar 1 descartado): APROBADO: 56, APROBADO PARCIAL: 5, POR VERIFICAR: 0, PENDIENTE: 0, BLOQUEADO: 0, DIFERIDO: 25.
- Criterio de salida (§11 del plan): **cumplido con diferidos**: todo lo esencial está aprobado con evidencia; los diferidos y los aprobados parciales quedan documentados para la siguiente planificación de pruebas (decisión del propietario, 2026-10-24).

Leyenda: **DIFERIDO** (no esencial según la política de pruebas esenciales; queda documentado para la siguiente planificación) · **DESCARTADO** (retirado por decisión del propietario) · **APROBADO** (evidencia ejecutada o inspección estática de configuración) · **APROBADO PARCIAL** · **POR VERIFICAR** (código o prueba escritos por Build/QA sin entorno; el propietario debe ejecutarlos) · **PENDIENTE** (sin prueba o sin ejecución) · **BLOQUEADO** (depende de una acción real del propietario).

## Matriz

| ID | P | Estado | Evidencia / pendiente |
|---|---|---|---|
| F0-001 | O | APROBADO | `qa-phase0-stack.ps1` (propietario, 2026-10-25): `health/live` y `health/ready` del API en 200 (consultados dentro del contenedor), esquemas migrados desde base vacía (Identity con 11 tablas, el resto con su historial de migraciones) y `GET /api/auth/options` en 200. |
| F0-002 | O | APROBADO | `qa-phase0-stack.ps1` (propietario, 2026-10-25): con la base detenida `health/ready` del API responde 503, el login devuelve 503 `problem+json` con `traceId`, `health/live` sigue en 200 y la API se recupera al volver la base. |
| F0-003 | O | APROBADO | `qa-phase0-stack.ps1 -ModuleIsolation` (propietario, 2026-10-24): las 10 imágenes (api y web) de Identity + agora, brisa, balance, cosecha y huella se construyen. No se inspeccionó el contenido del bundle. |
| F0-004 | O | DIFERIDO | El job `module-isolation` de CI no se despacha por regla; F0-003 ya cubre el aislamiento por módulo en local. |
| F0-005 | O | DIFERIDO | Requiere E2E/manual con sesiones de distinto permiso. Diferido por la política de pruebas esenciales. |
| F0-006 | O | APROBADO | `Testing_seed_fails_fast_when_enabled_in_production` (unitaria, 42/42) y semilla solo-Member verificada en PostgreSQL. |
| F0-S101 | O | APROBADO | Prueba `S101…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S102 | O | APROBADO | Prueba `S102…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S103 | O | APROBADO | Prueba `S103…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S104 | O | APROBADO | Prueba `S104…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S105 | O | APROBADO | Prueba `S105…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S106 | O | APROBADO | Prueba `S106…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S107 | O | APROBADO | Prueba `S107…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S108 | O | APROBADO | Prueba `S108…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S109 | O | APROBADO | Prueba `S109…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S110 | O | APROBADO | Prueba `S110…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S111 | O | APROBADO | Prueba `S111…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S112 | O | APROBADO | Prueba `S112…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S113 | O | APROBADO | Prueba `S113…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S114 | O | APROBADO | Prueba `S114…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S115 | I | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-S116 | O | APROBADO | Prueba `S116…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S201 | O | DIFERIDO | Requiere E2E con tiempo (>10 min) o reloj controlable. Diferido por la política de pruebas esenciales. |
| F0-S202 | O | APROBADO | `api-client.test.ts`: 5 peticiones simultáneas con 401 → exactamente 1 refresco y 5 reintentos exitosos; verificada por mutación (sin deduplicación falla con «esperaba 1, recibió 5»). Ejecutada por Build/QA en Linux; la repetirá `test-frontend.ps1`. |
| F0-S203 | O | APROBADO | `SessionRefreshTests` en verde: ventana de gracia y dos pestañas simultáneas. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-S204 | O | APROBADO | `SessionRefreshTests` en verde: reutilización fuera de la gracia revoca todo, audita y registra Warning sin tokens. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-S205 | O | APROBADO | `SessionRefreshTests` en verde: conflicto simulado reintentado; agotado, 409/503 y nunca 500. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-S206 | O | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-S207 | O | APROBADO PARCIAL | Misma respuesta y estado para correo inexistente y clave errónea (integración 11/11). Falta demostrar que ambos recorren el cálculo del hash. |
| F0-S208 | O | APROBADO PARCIAL | Limitador por cuenta sin afectar a otras (unitaria). Falta: Google no afectado y espera creciente. |
| F0-S209 | O | APROBADO | `ProductionSecurityValidationTaskTests`: 9 casos nuevos en verde (Identity 45/45 en `test-backend.ps1`, 51/51 en total), salida del propietario 2026-10-23. |
| F0-S210 | O | APROBADO | Integración: registro rechazado con CSRF válido y `/auth/options` coherente. |
| F0-S211 | O | APROBADO | Servidor: unitaria de política + política en `/auth/options`. Cliente: `login-options.test.tsx` (rechaza 11 de 12, sin reglas de composición, sigue la política recibida). Ejecutada por Build/QA en Linux. |
| F0-S212 | I | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-S213 | O | APROBADO | Integración: sin cabecera 403 `platform.csrf_invalid`; con cabecera válida el login responde 200. |
| F0-S214 | O | APROBADO | `qa-phase0-stack.ps1` (propietario, 2026-10-25): sin cabeceras duplicadas en `/` ni en `/api/auth/options` tras el cambio en nginx. |
| F0-G01 | O | APROBADO | Verificado a mano por el propietario (2026-10-24): entra con Google como usuario básico. El 503 inicial coincidía con haber reiniciado la base en la misma corrida; con `-SkipFaultInjection` la prueba posterior no lo mostró. |
| F0-G02 | O | APROBADO | Verificado a mano con cuenta real (propietario, 2026-10-25) y confirmado en la base: una sola cuenta de arranque con roles Administrator y Owner/Superuser, vínculo Google creado, contraseña invalidada y auditoría `auth.google.linked`. La anomalía anterior se debía a un correo mal transcrito (`Imc…` en lugar de `lmc…`), no a un defecto. |
| F0-G03 | O | APROBADO | `G03…` en verde: `redirect_uri` = `App:PublicBaseUrl` + callback, `state`, PKCE y sin secreto. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G04 | O | APROBADO | Unitaria `ReturnUrl…` con `//evil`, `https://evil`, `/\evil`, `javascript:` y variantes codificadas. |
| F0-G05 | O | APROBADO | `G05…` en verde: `state` alterado, ausente o cancelado → `/ingresar?error=…` sin sesión. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G06 | O | APROBADO | `G06…` en verde: correo no verificado rechazado sin crear nada. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G07 | O | APROBADO | `G07…` en verde: cuentas inactivas con código genérico `account_disabled`. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G08 | O | APROBADO | `G08…` en verde: registro cerrado rechaza y abierto crea solo `Member`. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G09 | O | APROBADO | `G09…` en verde: `SaveTokens=false`, sin columnas de tokens ni cookies de tokens. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G10 | O | APROBADO | `G10…` en verde: logs con niveles de producción sin `code`, `state`, secreto ni correos. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-G11 | O | APROBADO | Backend: esquema Google desactivado sin credenciales y `options.google=false` (propietario). Frontend: `login-options.test.tsx` (sin botón con `google=false`, con enlace a `/api/auth/google/start` si es `true`). Ejecutada por Build/QA en Linux. |
| F0-G12 | O | DIFERIDO | Manual/E2E. Diferido por la política de pruebas esenciales. |
| F0-E01 | O | APROBADO | `ErrorContractTests` en verde: 400, 401, 403, 404, 409 y 429 con `problem+json`, `code`, `traceId` y sin detalles internos (el 500 en E02). `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-E02 | O | APROBADO | `LoggingPipelineTests` en verde: 500 genérico y excepción registrada con el mismo `traceId`. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-E03 | O | APROBADO | `ErrorContractTests` en verde tras corregir la prueba (dos sesiones): una alta y un 409. `test-database` 46/46 (propietario, 2026-10-25). |
| F0-E04 | O | APROBADO | En verde tras corregir el defecto real (`SetRolePermissionsHandler` serializable con reintento): sin 500 y resultado consistente. `test-database` 46/46 (propietario, 2026-10-25). |
| F0-E05 | O | APROBADO | `LoggingPipelineTests` en verde: sin contraseñas, hash, cookies, JWT ni correos en los logs. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-E06 | O | APROBADO | `LoggingPipelineTests` en verde: una línea JSON por petición con `TraceId`, `Module` y `UserId`, sin cuerpo. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-E07 | O | DIFERIDO | Sin prueba automatizada. Diferido por la política de pruebas esenciales. |
| F0-E08 | O | APROBADO | `LoggingPipelineTests` en verde tras la corrección de producción (`PastelProblem.LogSuppressedItem`): 30 denegaciones → 1 log y 1 auditoría. `test-database` 44/46 (salida del propietario, 2026-10-24). |
| F0-E09 | O | DIFERIDO | Sin prueba automatizada. Diferido por la política de pruebas esenciales. |
| F0-E10 | O | DIFERIDO | Sin prueba automatizada. Diferido por la política de pruebas esenciales. |
| F0-E11 | I | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-E12 | O | DIFERIDO | Paginación/filtros existen en el servidor (`ListUsersQuery`); sin prueba. Diferido por la política de pruebas esenciales. |
| F0-W01 | O | DIFERIDO | Requiere E2E; solo existe `login.smoke.spec.ts`. Diferido por la política de pruebas esenciales. |
| F0-W02 | O | DIFERIDO | Requiere E2E. Diferido por la política de pruebas esenciales. |
| F0-W03 | O | APROBADO | `tailwind-audit`: restricciones estructurales cumplidas (métricas informativas; `app-shell.css` 684 líneas). |
| F0-W04 | O | DIFERIDO | Manual: capturas antes/después en claro y oscuro. Diferido por la política de pruebas esenciales. |
| F0-W05 | O | APROBADO PARCIAL | `dialog.test.tsx` (4/4 en jsdom): nombre accesible, axe, foco atrapado, Escape y retorno de foco al elemento que lo abrió. Falta confirmarlo en navegador real (E2E/manual). |
| F0-W06 | O | DIFERIDO | Manual/E2E. Diferido por la política de pruebas esenciales. |
| F0-W07 | O | DIFERIDO | Manual/E2E. Diferido por la política de pruebas esenciales. |
| F0-W08 | O | DIFERIDO | Sin prueba de contraste. Diferido por la política de pruebas esenciales. |
| F0-W09 | D | DESCARTADO | Retirado como requisito obligatorio por decisión del propietario (2026-10-23): el voseo se permite cuando el propietario lo solicite; reglas y guarda automatizada eliminadas. No cuenta en los totales. |
| F0-W10 | O | APROBADO | `check-design` sin hallazgos y 8/8 pruebas de las guardas. |
| F0-W11 | I | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-W12 | O | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-W13 | I | APROBADO PARCIAL | El build genera un chunk por pantalla. El bundle principal (519 kB) supera el aviso de 500 kB. |
| F0-I01 | O | APROBADO | Inspección estática: `web/Dockerfile` usa `npm ci`; `test-frontend` lo ejecutó. |
| F0-I02 | O | APROBADO | Inspección estática: PostgreSQL solo en `compose.override.yaml` y ligado a 127.0.0.1. |
| F0-I03 | O | APROBADO | Inspección estática: `healthcheck` en api y web, `cap_drop: ALL`, `mem_limit`/`cpus`, rotación de logs. |
| F0-I04 | O | APROBADO | Inspección estática: `ALLOWED_HOSTS`, `REVERSE_PROXY_TRUSTED_NETWORKS` y `NGINX_TRUSTED_PROXY_CIDR` por variable. |
| F0-I05 | I | DIFERIDO | Sin prueba. Diferido por la política de pruebas esenciales. |
| F0-I06 | O | APROBADO | gzip y caché inmutable (inspección estática) y cabeceras sin duplicados (F0-S214, propietario). |
| F0-I07 | O | APROBADO | Inspección estática de `ci.yml` (solo `workflow_dispatch` con `confirm_validation`, `concurrency`, `timeout-minutes`); format/NuGet/npm audit ejecutados vía scripts. |
| F0-I08 | I | APROBADO | `.editorconfig`, `.gitattributes` y `Directory.Packages.props` presentes y aplicados. |
| F0-I09 | O | APROBADO PARCIAL | Solo `.env.example` versionado y sin secretos en los diffs. Falta ejecutar los tests de S209 que garantizan que los valores de ejemplo no arrancan en Production. |
| F0-R01 | O | DIFERIDO | Sin ejecución (regresión). Diferido por la política de pruebas esenciales. |
| F0-R02 | O | DIFERIDO | Sin ejecución (regresión). Diferido por la política de pruebas esenciales. |
| F0-R03 | O | DIFERIDO | Sin ejecución (regresión). Diferido por la política de pruebas esenciales. |
| F0-R04 | O | DIFERIDO | Sin ejecución (regresión). Diferido por la política de pruebas esenciales. |
| F0-R05 | O | APROBADO | Superficie igual a `dev` salvo lo permitido (options, Google, client-errors; sin `CreateModule`) más dos adiciones (`GET /api/admin/users/{id}` y `GET /ping` por módulo) **aceptadas por el propietario el 2026-10-23**. Comparación estática; `GET /api/admin/users/{id}` queda cubierto por la matriz S116. |

## Observaciones frente al plan

- El plan habla de `settings.users.block`; el código usa `settings.users.lock`. Las pruebas usan el código vigente.
- El código incorpora el rol `Owner/Superuser` y reglas por ámbito (los roles de Workspace solo admiten permisos `settings.*`) que el plan no describe. Las pruebas S101 a S116 las respetan; conviene ampliar el plan.
- El voseo se permite cuando el propietario lo solicite (decisión del 2026-10-23): F0-W09 queda retirado y se flexibilizaron las reglas de `AGENTS.md`, `DESIGN_SYSTEM.md`, el documento base de Fase 0 y la guía de errores.
- **Hallazgos del análisis de código (2026-10-23):**
  - El `redirect_uri` de Google se toma de `App:PublicBaseUrl` (lo reescribe `PublicBaseUrlMiddleware`), como pide el plan.
  - Agotados los reintentos, un conflicto de serialización responde **503** con `Retry-After` (no 409).
  - En Development (`Microsoft.AspNetCore` en Information) ASP.NET registraría la URL del callback con `code` y `state`; en producción esa categoría está en Warning. Conviene dejarla en Warning también en Development.
  - F0-E08 reveló un defecto real: cada 403 por permisos generaba una advertencia aunque el log de acceso denegado ya estaba limitado a una vez por minuto. Corregido en `PastelProblem`/`PastelAuthorizationResultHandler` (por verificar).
  - El registro no contempla la selección de apps y no existen membresías (ver `PROGRESS.md`, «Revisión de la selección de apps»; fuera de Fase 0).
- **Hallazgos de la ejecución del 2026-10-24:**
  - Defecto real (F0-E04): las ediciones simultáneas de un rol se fundían en una mezcla; corregido con transacción serializable y reintento. `SetUserPermissionsHandler` y `CreateRole` tienen el mismo patrón y quedan en el backlog.
  - Defecto real (F0-S214): cinco cabeceras de seguridad salían duplicadas en `/api/*`; corregido en `deploy/nginx/default.conf.template`.
  - Defecto de las pruebas propias: el script comprobaba `/health/*` por nginx, que devuelve el `index.html` de la SPA; y E03 compartía un cliente HTTP. Ambos corregidos.
  - Tras reiniciar la base, la primera petición que reutiliza una conexión vieja del pool puede responder 503. Mitigación pendiente en el backlog: estrategia de reintento de EF Core (`EnableRetryOnFailure`) compatible con las transacciones manuales.
  - F0-G02 con cuenta real: la anomalía se debía a un correo mal transcrito (`Imc…` con i mayúscula en lugar de `lmc…` con ele); con el correo correcto la cuenta de arranque se vinculó y entró como administrador. No era un defecto.
- Huella, catálogo persistente, membresías de Cosecha y feed de Ágora quedan fuera de Fase 0 por decisión del propietario (2026-10-21).
- Las pruebas de frontend nuevas (`api-client`, `dialog`, `login-options`) y la guarda de voseo se ejecutaron en Linux por Build/QA; `test-frontend.ps1` las repetirá en Docker.
- Las pruebas `PrivilegeHierarchyTests` mantienen ≈8 inicios de sesión: el limitador de autenticación admite 12 por minuto y por IP y TestServer comparte IP. No añada pruebas con inicios de sesión nuevos sin reutilizar actores.

## Entrega y cierre de la etapa (2026-10-25)

- **Rama y SHA final:** `refactor/modular-foundation` en `e3d91fe`. Commits de esta tarea: `386a8b9` (formateo y pre-commit), `ef01c30` (normalización de archivos generados, del propietario), `a98b1de` (jerarquía de privilegios y arranque en Production), `3f45113` (frontend y guarda de voseo, después retirada), `a8c1c7d` (voseo flexible y script de stack aislado), `3d3ca6e` (Google, sesiones, errores y logs) y `e3d91fe` (defectos de concurrencia y cabeceras, política de pruebas esenciales).
- **Pruebas ejecutadas:** backend 51/51, PostgreSQL 46/46, frontend completo, stack aislado 10/10, aislamiento por módulo (5 módulos, api y web) y verificación manual de Google (cuenta nueva y vinculación a la cuenta de arranque).
- **Defectos reales corregidos:** ediciones simultáneas de un rol que se fundían (F0-E04), cabeceras de seguridad duplicadas en `/api/*` (F0-S214) y advertencia por cada acceso denegado repetido (F0-E08).
- **Automatización de formato:** ver `docs/testing/FORMAT-AUTOMATION.md` (instalación con `.\scripts\install-hooks.ps1`; el hook corrige lo seguro y detiene el commit con instrucciones cuando no puede).
- **Confirmaciones:** no se incorporaron archivos `.csn` (0 rastreados y 0 en el historial; `.gitignore` los excluye y el hook los bloquea), no hay secretos en el árbol (exploración con los patrones del hook: 0 hallazgos; solo `.env.example` está versionado) y `dev` (`7ba6f1c`) y `main` (`012966d`) no se modificaron. No se abrió ningún PR.
- **Pendiente de la etapa:** nada esencial. Quedan 20 requisitos obligatorios **diferidos** y los aprobados parciales (detalle en la matriz) como backlog de la siguiente planificación de pruebas.

**Backlog diferido (siguiente planificación de pruebas):** F0-E07, E09, E10, E11, E12, F0-S201, S206, S207/S208 completos, recorridos en navegador (F0-005, W01, W02, W06 a W08, W12, R01 a R04), revisión visual (W04), `SetUserPermissionsHandler` y `CreateRole` serializables, reintento de EF Core ante conexiones caídas (el primer request tras reiniciar la base puede responder 503), nivel de `Microsoft.AspNetCore` en Warning también en Development y el job `module-isolation` de CI.

## Comandos de verificación

```powershell
git pull
.\scripts\test-backend.ps1
.\scripts\test-database.ps1
.\scripts\test-frontend.ps1
.\scripts\qa-phase0-stack.ps1
```

Para limpiar un stack de QA que se dejó en marcha con `-KeepRunning`, use el comando que imprime el propio script.
