# Estado de requisitos de Fase 0 (Build/QA, 2026-10-21)

Rama `refactor/modular-foundation`. Cada fila se clasifica con evidencia real; **no hay informe de QA aprobado** y la Fase 0 sigue abierta.

**Evidencia ejecutada por el propietario (Windows, Docker, PostgreSQL):** `format-backend` idempotente (2.ª ejecución: 0 archivos), `test-backend` (NuGet sin vulnerabilidades, build Release 0/0, verificación de formato correcta, 42/42), `test-database` (11/11 PostgreSQL sobre base recreada) y `test-frontend` (Prettier, ESLint, `tsc`+Vite, Vitest+axe 8/8, fronteras, check-design, auditoría Tailwind). **Inspección estática** (sin ejecutar): configuración de Compose, nginx y CI.

## Resumen

- Obligatorios (80): APROBADO: 11, APROBADO PARCIAL: 9, POR VERIFICAR: 16, PENDIENTE: 42, BLOQUEADO: 2.
- Todos (87): APROBADO: 12, APROBADO PARCIAL: 10, POR VERIFICAR: 16, PENDIENTE: 47, BLOQUEADO: 2.
- Criterio de salida (§11 del plan): **no cumplido** (faltan casos obligatorios en verde, E2E, contenedores y verificación manual de Google).

Leyenda: **APROBADO** (evidencia ejecutada o inspección estática de configuración) · **APROBADO PARCIAL** · **POR VERIFICAR** (código o prueba escritos por Build/QA sin entorno; el propietario debe ejecutarlos) · **PENDIENTE** (sin prueba o sin ejecución) · **BLOQUEADO** (depende de una acción real del propietario).

## Matriz

| ID | P | Estado | Evidencia / pendiente |
|---|---|---|---|
| F0-001 | O | APROBADO PARCIAL | Identity: migración aplicada sobre base recreada (11/11 PostgreSQL). Faltan los otros 5 esquemas, la semilla completa y `/health/ready`: requiere stack Compose aislado. |
| F0-002 | O | PENDIENTE | Requiere Compose aislado y detener PostgreSQL (comandos abajo). |
| F0-003 | O | PENDIENTE | Sin ejecutar; comando por módulo abajo (el job `module-isolation` de CI no se despacha por regla). |
| F0-004 | O | PENDIENTE | Matriz definida en `ci.yml` (`module-isolation`); sin ejecución. Se cubre localmente con F0-003. |
| F0-005 | O | PENDIENTE | Requiere E2E/manual con sesiones de distinto permiso. |
| F0-006 | O | APROBADO | `Testing_seed_fails_fast_when_enabled_in_production` (unitaria, 42/42) y semilla solo-Member verificada en PostgreSQL. |
| F0-S101 | O | POR VERIFICAR | `PrivilegeHierarchyTests.S101…` escrita; no ejecutada. |
| F0-S102 | O | POR VERIFICAR | `S102…` escrita; no ejecutada. |
| F0-S103 | O | POR VERIFICAR | `S103…` (incluye auditoría antes/después); no ejecutada. |
| F0-S104 | O | POR VERIFICAR | `S104…` (sin contraseña temporal, hash intacto); no ejecutada. |
| F0-S105 | O | POR VERIFICAR | `S105…` (incluye inicio de sesión con la temporal y rechazo de la propia); no ejecutada. |
| F0-S106 | O | POR VERIFICAR | `S106…`; no ejecutada. |
| F0-S107 | O | POR VERIFICAR | `S107…` (auditoría con permisos añadidos); no ejecutada. |
| F0-S108 | O | POR VERIFICAR | `S108…`; no ejecutada. |
| F0-S109 | O | POR VERIFICAR | `S109…`; no ejecutada. |
| F0-S110 | O | POR VERIFICAR | `S110…`; no ejecutada. |
| F0-S111 | O | POR VERIFICAR | `S111…`; no ejecutada. |
| F0-S112 | O | POR VERIFICAR | `S112…` (Administrator y gestor); no ejecutada. |
| F0-S113 | O | POR VERIFICAR | `S113…` (concurrencia real con dos clientes); no ejecutada. |
| F0-S114 | O | POR VERIFICAR | `S114…`; no ejecutada. |
| F0-S115 | I | PENDIENTE | Sin prueba. |
| F0-S116 | O | POR VERIFICAR | `S116…` (15 endpoints × anónimo/Member/permiso parcial); no ejecutada. |
| F0-S201 | O | PENDIENTE | Requiere E2E con tiempo (>10 min) o reloj controlable. |
| F0-S202 | O | PENDIENTE | Requiere prueba del cliente (Vitest) o E2E; sin prueba. |
| F0-S203 | O | PENDIENTE | Sin prueba (solo existe la unitaria de `RefreshGraceProtector`). |
| F0-S204 | O | PENDIENTE | Sin prueba. |
| F0-S205 | O | PENDIENTE | Sin prueba. |
| F0-S206 | O | PENDIENTE | Sin prueba. |
| F0-S207 | O | APROBADO PARCIAL | Misma respuesta y estado para correo inexistente y clave errónea (integración 11/11). Falta demostrar que ambos recorren el cálculo del hash. |
| F0-S208 | O | APROBADO PARCIAL | Limitador por cuenta sin afectar a otras (unitaria). Falta: Google no afectado y espera creciente. |
| F0-S209 | O | POR VERIFICAR | `ProductionSecurityValidationTaskTests` (9 casos) escritas; no ejecutadas. El código ya existe. |
| F0-S210 | O | APROBADO | Integración: registro rechazado con CSRF válido y `/auth/options` coherente. |
| F0-S211 | O | APROBADO PARCIAL | Servidor: unitaria de política + política expuesta en `/auth/options`. Falta: el cliente usa la misma política. |
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
| F0-G11 | O | APROBADO PARCIAL | Backend: esquema Google desactivado sin credenciales y `options.google=false` (unitaria + integración). Falta: el botón no aparece (frontend). |
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
| F0-W05 | O | APROBADO PARCIAL | 8/8 pruebas de componentes con axe. Falta verificar Escape, foco atrapado y retorno de foco. |
| F0-W06 | O | PENDIENTE | Manual/E2E. |
| F0-W07 | O | PENDIENTE | Manual/E2E. |
| F0-W08 | O | PENDIENTE | Sin prueba de contraste. |
| F0-W09 | O | PENDIENTE | No existe prueba automatizada de voseo (solo comentarios en `strings.ts`): requiere corrección. |
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
| F0-R05 | O | APROBADO PARCIAL | Superficie igual a `dev` salvo lo permitido (options, Google, client-errors; sin `CreateModule`). Dos adiciones no listadas: `GET /api/admin/users/{id}` y `GET /ping` por módulo; requieren aceptación del propietario. |

## Observaciones frente al plan

- El plan habla de `settings.users.block`; el código usa `settings.users.lock`. Las pruebas usan el código vigente.
- El código incorpora el rol `Owner/Superuser` y reglas por ámbito (los roles de Workspace solo admiten permisos `settings.*`) que el plan no describe. Las pruebas S101 a S116 las respetan; conviene ampliar el plan.
- Huella, catálogo persistente, membresías de Cosecha y feed de Ágora quedan fuera de Fase 0 por decisión del propietario (2026-10-21).
- Las pruebas `PrivilegeHierarchyTests` mantienen ≈8 inicios de sesión: el limitador de autenticación admite 12 por minuto y por IP y TestServer comparte IP. No añada pruebas con inicios de sesión nuevos sin reutilizar actores.

## Próximo lote de Build/QA (sin ejecutar aún)

1. Proveedor falso de Google en `ConfigureTestServices` para F0-G02, G05 a G08.
2. Pruebas de refresco y sesiones (S203, S204, S205) con cookies reales.
3. Pruebas de errores y logs (E01 a E10) y de voseo automatizada (W09).

## Comandos que debe ejecutar el propietario

```powershell
git pull
.\scripts\test-backend.ps1       # incluye ProductionSecurityValidationTaskTests (S209)
.\scripts\test-database.ps1      # incluye PrivilegeHierarchyTests (S101 a S116)
```

Stack aislado para F0-001, F0-002, S214 e I06 (no usa `-v`):

```powershell
$env:ASPNETCORE_ENVIRONMENT="Testing"; $env:WEB_PORT="18080"; $env:POSTGRES_PORT="15435"; $env:APP_PUBLIC_BASE_URL="http://localhost:18080"
docker compose -p pastel-fase0-qa up -d --build
curl.exe -s -o NUL -w "live=%{http_code}\n" http://localhost:18080/health/live
curl.exe -s -o NUL -w "ready=%{http_code}\n" http://localhost:18080/health/ready
curl.exe -sI http://localhost:18080/          # S214/I06: cada cabecera de seguridad debe aparecer una sola vez
docker compose -p pastel-fase0-qa stop db     # F0-002
curl.exe -s -w "\nready=%{http_code}\n" http://localhost:18080/health/ready   # debe fallar
curl.exe -s -w "\nstatus=%{http_code}\n" http://localhost:18080/api/auth/options  # 503 problem+json con traceId
docker compose -p pastel-fase0-qa start db
docker compose -p pastel-fase0-qa down
```

Aislamiento por módulo (F0-003; repita con `brisa`, `balance`, `cosecha`, `huella`):

```powershell
docker build --file src/Host/Pastel.Host/Dockerfile --build-arg PASTEL_MODULES=agora --tag pastel-api:agora .
docker build --file web/Dockerfile --build-arg PASTEL_MODULES=agora --tag pastel-web:agora .
```
