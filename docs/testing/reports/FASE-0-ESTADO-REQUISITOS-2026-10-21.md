# Estado de requisitos de Fase 0 (Build/QA, 2026-10-21)

Rama `refactor/modular-foundation`. Cada fila se clasifica con evidencia real; **no hay informe de QA aprobado** y la Fase 0 sigue abierta.

**Evidencia ejecutada por el propietario (Windows, Docker, PostgreSQL; HEAD `3f45113`, 2026-10-23):** `test-backend` (NuGet sin vulnerabilidades, build Release 0/0, formato correcto, 51/51), `test-database` (26/26 PostgreSQL sobre base recreada) y `test-frontend` (Prettier, ESLint, `tsc`+Vite, Vitest+axe 21/21, fronteras, check-design, auditoría Tailwind). **Ejecutado por Build/QA en Linux:** pruebas de frontend (Vitest) y del hook. **Inspección estática** (sin ejecutar): configuración de Compose, nginx y CI.

## Resumen

- Obligatorios (79): APROBADO: 31, APROBADO PARCIAL: 6, POR VERIFICAR: 0, PENDIENTE: 40, BLOQUEADO: 2.
- Todos (86, sin contar 1 descartado): APROBADO: 32, APROBADO PARCIAL: 7, POR VERIFICAR: 0, PENDIENTE: 45, BLOQUEADO: 2.
- Criterio de salida (§11 del plan): **no cumplido** (faltan casos obligatorios en verde, E2E, contenedores y verificación manual de Google).

Leyenda: **DESCARTADO** (retirado por decisión del propietario) · **APROBADO** (evidencia ejecutada o inspección estática de configuración) · **APROBADO PARCIAL** · **POR VERIFICAR** (código o prueba escritos por Build/QA sin entorno; el propietario debe ejecutarlos) · **PENDIENTE** (sin prueba o sin ejecución) · **BLOQUEADO** (depende de una acción real del propietario).

## Matriz

| ID | P | Estado | Evidencia / pendiente |
|---|---|---|---|
| F0-001 | O | APROBADO PARCIAL | Identity: migración aplicada sobre base recreada (11/11 PostgreSQL). Faltan los otros 5 esquemas, la semilla completa y `/health/ready`: requiere stack Compose aislado. |
| F0-002 | O | PENDIENTE | Requiere Compose aislado y detener PostgreSQL (comandos abajo). |
| F0-003 | O | PENDIENTE | Sin ejecutar; comando por módulo abajo (el job `module-isolation` de CI no se despacha por regla). |
| F0-004 | O | PENDIENTE | Matriz definida en `ci.yml` (`module-isolation`); sin ejecución. Se cubre localmente con F0-003. |
| F0-005 | O | PENDIENTE | Requiere E2E/manual con sesiones de distinto permiso. |
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
| F0-S115 | I | PENDIENTE | Sin prueba. |
| F0-S116 | O | APROBADO | Prueba `S116…` en verde. `PrivilegeHierarchyTests`: 26/26 PostgreSQL (15 nuevas) en `test-database.ps1`, salida del propietario 2026-10-23. |
| F0-S201 | O | PENDIENTE | Requiere E2E con tiempo (>10 min) o reloj controlable. |
| F0-S202 | O | APROBADO | `api-client.test.ts`: 5 peticiones simultáneas con 401 → exactamente 1 refresco y 5 reintentos exitosos; verificada por mutación (sin deduplicación falla con «esperaba 1, recibió 5»). Ejecutada por Build/QA en Linux; la repetirá `test-frontend.ps1`. |
| F0-S203 | O | PENDIENTE | Sin prueba (solo existe la unitaria de `RefreshGraceProtector`). |
| F0-S204 | O | PENDIENTE | Sin prueba. |
| F0-S205 | O | PENDIENTE | Sin prueba. |
| F0-S206 | O | PENDIENTE | Sin prueba. |
| F0-S207 | O | APROBADO PARCIAL | Misma respuesta y estado para correo inexistente y clave errónea (integración 11/11). Falta demostrar que ambos recorren el cálculo del hash. |
| F0-S208 | O | APROBADO PARCIAL | Limitador por cuenta sin afectar a otras (unitaria). Falta: Google no afectado y espera creciente. |
| F0-S209 | O | APROBADO | `ProductionSecurityValidationTaskTests`: 9 casos nuevos en verde (Identity 45/45 en `test-backend.ps1`, 51/51 en total), salida del propietario 2026-10-23. |
| F0-S210 | O | APROBADO | Integración: registro rechazado con CSRF válido y `/auth/options` coherente. |
| F0-S211 | O | APROBADO | Servidor: unitaria de política + política en `/auth/options`. Cliente: `login-options.test.tsx` (rechaza 11 de 12, sin reglas de composición, sigue la política recibida). Ejecutada por Build/QA en Linux. |
| F0-S212 | I | PENDIENTE | Sin prueba. |
| F0-S213 | O | APROBADO | Integración: sin cabecera 403 `platform.csrf_invalid`; con cabecera válida el login responde 200. |
| F0-S214 | O | PENDIENTE | Requiere stack con nginx + API. |
| F0-G01 | O | BLOQUEADO | Manual con cuenta Google real: depende de la interacción del propietario (claves OAuth ya generadas según el propietario). |
| F0-G02 | O | BLOQUEADO | Manual con cuenta Google real (correo del administrador de arranque): depende del propietario. Se puede cubrir además con proveedor falso (ver pendiente). |
| F0-G03 | O | PENDIENTE | Sin prueba del `redirect_uri` exacto. |
| F0-G04 | O | APROBADO | Unitaria `ReturnUrl…` con `//evil`, `https://evil`, `/\evil`, `javascript:` y variantes codificadas. |
| F0-G05 | O | PENDIENTE | Pendiente (proveedor falso en `ConfigureTestServices`, ver PROGRESS §Google). |
| F0-G06 | O | PENDIENTE | Pendiente (proveedor falso). |
| F0-G07 | O | PENDIENTE | Pendiente (proveedor falso). |
| F0-G08 | O | PENDIENTE | Pendiente (proveedor falso). |
| F0-G09 | O | PENDIENTE | Sin prueba. |
| F0-G10 | O | PENDIENTE | Sin prueba de logs. |
| F0-G11 | O | APROBADO | Backend: esquema Google desactivado sin credenciales y `options.google=false` (propietario). Frontend: `login-options.test.tsx` (sin botón con `google=false`, con enlace a `/api/auth/google/start` si es `true`). Ejecutada por Build/QA en Linux. |
| F0-G12 | O | PENDIENTE | Manual/E2E. |
| F0-E01 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E02 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E03 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E04 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E05 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E06 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E07 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E08 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E09 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E10 | O | PENDIENTE | Sin prueba automatizada. |
| F0-E11 | I | PENDIENTE | Sin prueba. |
| F0-E12 | O | PENDIENTE | Paginación/filtros existen en el servidor (`ListUsersQuery`); sin prueba. |
| F0-W01 | O | PENDIENTE | Requiere E2E; solo existe `login.smoke.spec.ts`. |
| F0-W02 | O | PENDIENTE | Requiere E2E. |
| F0-W03 | O | APROBADO | `tailwind-audit`: restricciones estructurales cumplidas (métricas informativas; `app-shell.css` 684 líneas). |
| F0-W04 | O | PENDIENTE | Manual: capturas antes/después en claro y oscuro. |
| F0-W05 | O | APROBADO PARCIAL | `dialog.test.tsx` (4/4 en jsdom): nombre accesible, axe, foco atrapado, Escape y retorno de foco al elemento que lo abrió. Falta confirmarlo en navegador real (E2E/manual). |
| F0-W06 | O | PENDIENTE | Manual/E2E. |
| F0-W07 | O | PENDIENTE | Manual/E2E. |
| F0-W08 | O | PENDIENTE | Sin prueba de contraste. |
| F0-W09 | D | DESCARTADO | Retirado como requisito obligatorio por decisión del propietario (2026-10-23): el voseo se permite cuando el propietario lo solicite; reglas y guarda automatizada eliminadas. No cuenta en los totales. |
| F0-W10 | O | APROBADO | `check-design` sin hallazgos y 8/8 pruebas de las guardas. |
| F0-W11 | I | PENDIENTE | Sin prueba. |
| F0-W12 | O | PENDIENTE | Sin prueba. |
| F0-W13 | I | APROBADO PARCIAL | El build genera un chunk por pantalla. El bundle principal (519 kB) supera el aviso de 500 kB. |
| F0-I01 | O | APROBADO | Inspección estática: `web/Dockerfile` usa `npm ci`; `test-frontend` lo ejecutó. |
| F0-I02 | O | APROBADO | Inspección estática: PostgreSQL solo en `compose.override.yaml` y ligado a 127.0.0.1. |
| F0-I03 | O | APROBADO | Inspección estática: `healthcheck` en api y web, `cap_drop: ALL`, `mem_limit`/`cpus`, rotación de logs. |
| F0-I04 | O | APROBADO | Inspección estática: `ALLOWED_HOSTS`, `REVERSE_PROXY_TRUSTED_NETWORKS` y `NGINX_TRUSTED_PROXY_CIDR` por variable. |
| F0-I05 | I | PENDIENTE | Sin prueba. |
| F0-I06 | O | APROBADO PARCIAL | Estático: gzip y caché inmutable de activos con hash. Falta verificar cabeceras sin duplicados en ejecución (S214). |
| F0-I07 | O | APROBADO | Inspección estática de `ci.yml` (solo `workflow_dispatch` con `confirm_validation`, `concurrency`, `timeout-minutes`); format/NuGet/npm audit ejecutados vía scripts. |
| F0-I08 | I | APROBADO | `.editorconfig`, `.gitattributes` y `Directory.Packages.props` presentes y aplicados. |
| F0-I09 | O | APROBADO PARCIAL | Solo `.env.example` versionado y sin secretos en los diffs. Falta ejecutar los tests de S209 que garantizan que los valores de ejemplo no arrancan en Production. |
| F0-R01 | O | PENDIENTE | Sin ejecución (regresión). |
| F0-R02 | O | PENDIENTE | Sin ejecución (regresión). |
| F0-R03 | O | PENDIENTE | Sin ejecución (regresión). |
| F0-R04 | O | PENDIENTE | Sin ejecución (regresión). |
| F0-R05 | O | APROBADO | Superficie igual a `dev` salvo lo permitido (options, Google, client-errors; sin `CreateModule`) más dos adiciones (`GET /api/admin/users/{id}` y `GET /ping` por módulo) **aceptadas por el propietario el 2026-10-23**. Comparación estática; `GET /api/admin/users/{id}` queda cubierto por la matriz S116. |

## Observaciones frente al plan

- El plan habla de `settings.users.block`; el código usa `settings.users.lock`. Las pruebas usan el código vigente.
- El código incorpora el rol `Owner/Superuser` y reglas por ámbito (los roles de Workspace solo admiten permisos `settings.*`) que el plan no describe. Las pruebas S101 a S116 las respetan; conviene ampliar el plan.
- El voseo se permite cuando el propietario lo solicite (decisión del 2026-10-23): F0-W09 queda retirado y se flexibilizaron las reglas de `AGENTS.md`, `DESIGN_SYSTEM.md`, el documento base de Fase 0 y la guía de errores.
- Huella, catálogo persistente, membresías de Cosecha y feed de Ágora quedan fuera de Fase 0 por decisión del propietario (2026-10-21).
- Las pruebas de frontend nuevas (`api-client`, `dialog`, `login-options`) y la guarda de voseo se ejecutaron en Linux por Build/QA; `test-frontend.ps1` las repetirá en Docker.
- Las pruebas `PrivilegeHierarchyTests` mantienen ≈8 inicios de sesión: el limitador de autenticación admite 12 por minuto y por IP y TestServer comparte IP. No añada pruebas con inicios de sesión nuevos sin reutilizar actores.

## Próximo lote de Build/QA (sin ejecutar aún)

1. Proveedor falso de Google en `ConfigureTestServices` para F0-G02, G05 a G08.
2. Pruebas de refresco y sesiones en el servidor (S203, S204, S205) con cookies reales.
3. Pruebas de errores y logs (E01 a E10).
4. Corrección de lo que revelen `test-backend` y `test-database` (pendiente de su salida).

## Comandos que debe ejecutar el propietario

Stack aislado (F0-001, F0-002, F0-S214, F0-I06). El script usa un proyecto Compose propio (`pastel-fase0-qa`), una subred distinta de la pila de desarrollo (que ya usa `172.30.0.0/24`), limpia solo su propio volumen y restaura las variables de entorno al terminar:

```powershell
git pull
.\scripts\qa-phase0-stack.ps1
```

Aislamiento por módulo (F0-003), más lento (10 imágenes):

```powershell
.\scripts\qa-phase0-stack.ps1 -ModuleIsolation
```

El script (POR VERIFICAR: se escribió sin PowerShell) imprime PASS/FAIL por requisito y las cabeceras HTTP observadas.
