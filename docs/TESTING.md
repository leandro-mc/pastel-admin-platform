# Pruebas y validación

## 1. Política: solo lo esencial
Más pruebas no significan más calidad: cada una cuesta tiempo de ejecución y de mantenimiento. Se escriben **solo las fundamentales**.
- **Es esencial** una prueba que protege un riesgo real y concreto: autorización y jerarquía de privilegios, integridad y concurrencia de datos críticos, ciclo de vida de la sesión, contrato de errores, ausencia de secretos en logs, y las comprobaciones de build, formato y auditoría de dependencias.
- **No es esencial** (se difiere): matrices exhaustivas, permutaciones, comprobaciones cosméticas o de contenido, una prueba por cada caso de un plan, repeticiones de lo que ya cubre otra prueba, y los recorridos E2E o visuales completos de pantallas que no cambiaron.
- **Antes de escribir una prueba** responde: ¿qué defecto concreto detectaría? y ¿por qué no lo cubre ya una existente? Sin respuesta, no se escribe. Una prueba redundante se elimina.
- Un defecto hallado por una prueba esencial se corrige en el código y la prueba se conserva.
- **Evidencia**: nada se declara aprobado sin ejecución real, con **cero fallos y cero omitidas**. Lo no ejecutado se marca «por verificar». Que el proceso termine no basta si las pruebas no corrieron.
- Lo diferido no se descarta: queda en el backlog de `docs/PROGRESS.md` para la siguiente planificación de pruebas.

## 2. Qué existe hoy
- **Backend (unitarias y arquitectura):** reglas de dominio, política de contraseñas, `ReturnUrl`, validación de arranque en Producción, evaluador de permisos y reglas de arquitectura entre módulos.
- **PostgreSQL / integración HTTP** (`tests/Pastel.IntegrationTests`): host, migraciones desde base vacía, salud, CSRF, opciones de autenticación, **jerarquía de privilegios** (escalada, protección de administradores, último administrador, concurrencia), **Google** (vinculación, correo no verificado, cuentas inactivas, registro cerrado, `state`, `redirect_uri`, tokens, logs), **refresco de sesión** (ventana de gracia, reutilización, conflictos de serialización), **contrato de errores** y **logs** (JSON real de Serilog sin secretos, una línea por petición, denegaciones limitadas).
- **Frontend (Vitest + Testing Library + axe):** cliente de API (un solo refresco ante varios 401), diálogos accesibles, login según opciones y política de contraseña. Hay un smoke de Playwright para `/ingresar` (`npm run test:e2e`).
- **Guardas estáticas:** fronteras entre módulos (frontend y backend), `check-design`, `tailwind-audit`.

## 3. Comandos (PowerShell, Docker Desktop iniciado)
| Comando | Qué hace |
|---|---|
| `.\scripts\test-backend.ps1` | Restaura, audita NuGet, verifica formato .NET, compila Release y ejecuta pruebas unitarias y de arquitectura. |
| `.\scripts\test-database.ps1` | Levanta solo PostgreSQL y ejecuta las pruebas HTTP con base real (`pastel_integration_tests`, recreada en cada corrida). |
| `.\scripts\test-frontend.ps1` | `npm ci`, `npm audit`, Prettier, ESLint, TypeScript/Vite, Vitest + axe, fronteras y guardas de diseño. |
| `.\scripts\test-all.ps1` | Los tres anteriores con resumen conjunto. |
| `.\scripts\format-backend.ps1` / `format-frontend.ps1` | Aplican el formato en Docker y copian de vuelta **solo** lo que cambió; revise el diff después. |
| `.\scripts\qa-phase0-stack.ps1` | Stack Compose aislado (`pastel-fase0-qa`): salud real del API, esquemas migrados, cabeceras sin duplicados, caída y recuperación de la base. `-ModuleIsolation` construye las imágenes por módulo; `-SkipFaultInjection` omite la caída de la base; `-KeepRunning` deja el stack. |
| `.\scripts\qa-inspect-identity.ps1` | Diagnóstico de solo lectura del stack de QA (cuentas, roles, vínculos de Google y auditoría, sin hashes). |

Los scripts trabajan sobre una copia temporal del repositorio dentro de contenedores (copia sin `.git`, `node_modules`, `bin` ni `obj`), con cachés de NuGet y npm en volúmenes propios (`pastel-nuget-cache`, `pastel-npm-cache`). Los resultados TRX se escriben en una carpeta temporal. La base reservada de pruebas es `pastel_integration_tests`: el script comprueba que no coincide con la de desarrollo, no ejecuta `down -v` y no toca el volumen de desarrollo. Las cadenas de conexión no se imprimen.

**Límite de inicio de sesión:** el limitador de autenticación admite 12 inicios por minuto por IP y TestServer comparte IP; las pruebas de integración reutilizan sesiones por esa razón.

## 4. Formato y hook de pre-commit
- Instalación, una vez por clon: `.\scripts\install-hooks.ps1` (o `node scripts/install-hooks.mjs`). Requiere Git y Node 20+; para Prettier, `cd web && npm ci`.
- **En cada commit**, sobre los archivos preparados: corrige lo seguro (BOM, CRLF y nueva línea final en C#, y Prettier en `web/`) cuando el archivo no tiene cambios sin preparar, y **detiene el commit** con instrucciones para espacios finales en C#, archivos `.csn`/`.env`/claves y patrones de secretos (nunca imprime el valor). También valida el mensaje del commit (`docs/GIT_WORKFLOW.md`).
- No ejecuta `dotnet format`, build ni pruebas (eso es de los scripts) y no hay hook de push. Emergencia: `PASTEL_SKIP_HOOKS=1 git commit …` (lo omitido se detecta después). Desinstalar: `git config --unset core.hooksPath`.
- **Archivos `.csn`**: aparecieron una vez en un equipo local, su origen nunca se determinó, no existen en el repositorio ni en su historial y no deben versionarse (`.gitignore` los excluye y el hook los bloquea).
- Pruebas del hook: `node --test scripts/tests/pre-commit.test.mjs scripts/tests/commit-msg.test.mjs`.
- Los formateadores copian de vuelta solo los archivos con contenido distinto; correr dos veces seguidas debe dar «0 archivos actualizados».

## 5. Fixtures de QA (solo local, Compose con `TESTING_SEED_ENABLED=true`)
- Owner/Superuser: `test.owner@pastel.local` / `Local-Only-Test-Owner-2026!`
- Administrator sin rol Owner: `test.admin@pastel.local` / `Local-Only-Test-Admin-2026!`
- Member: `test.member@pastel.local` / `Local-Only-Test-Member-2026!`

Son sintéticas y solo funcionan en `Development`/`Testing`: en `Production` configurar el sembrador provoca un fallo deliberado de arranque. Desactívelo (`TESTING_SEED_ENABLED=false`) en todo entorno compartido.

## 6. Verificación manual de Google
Requiere cuenta real; la hace el propietario. Preparar OAuth: `docs/OPERATIONS.md`. Para probar sin el factor de reiniciar la base: `.\scripts\qa-phase0-stack.ps1 -KeepRunning -SkipFaultInjection`, abrir `http://localhost:18080/ingresar` (registrar `http://localhost:18080/api/auth/google/callback` en Google) y pulsar «Continuar con Google»:
1. **Cuenta nueva:** entra como `Member`, sin contraseña.
2. **Vincular al administrador de arranque:** con `$env:BOOTSTRAP_ADMIN_EMAIL` igual al correo de Google, entra a la cuenta de arranque (Administrator y Owner/Superuser) y su contraseña de arranque queda invalidada. Diagnóstico con `qa-inspect-identity.ps1`; compare los correos carácter por carácter.
Limpieza: el script imprime el comando `docker compose -p pastel-fase0-qa … down -v` (solo afecta al proyecto de QA).

## 7. CI
Resumen: nunca por commit; solo al aprobar un PR hacia `dev` y solo lo básico (backend + frontend), salvo `ci:completo` o ejecución manual con alcance «completo». Detalle en `docs/GIT_WORKFLOW.md` §3.
