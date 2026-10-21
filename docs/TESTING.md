# Validación automatizada

## Comandos locales

Ejecute desde la raíz con PowerShell y Docker Desktop iniciado:

- `.\scripts\test-backend.ps1`: restaura, busca paquetes NuGet vulnerables, verifica formato .NET, compila Release y ejecuta pruebas unitarias. Falla si NuGet informa paquetes vulnerables.
- `.\scripts\test-frontend.ps1`: instala con `npm ci`, ejecuta `npm audit --audit-level=high`, verifica Prettier y ESLint, compila TypeScript/Vite, ejecuta fronteras de módulos y las guardas estáticas de diseño/Tailwind.
- `cd web; npm.cmd test`: ejecuta las pruebas de componentes React con Vitest, Testing Library y axe en jsdom.
- `cd web; npm.cmd run test:e2e`: ejecuta Playwright contra la app ya levantada en `http://127.0.0.1:8080`; cambie el destino con `$env:PASTEL_E2E_BASE_URL` si corresponde. Instale el navegador una vez con `npm.cmd exec playwright install chromium`.
- `.\scripts\test-database.ps1`: inicia solo PostgreSQL y ejecuta las pruebas HTTP que requieren una base real.
- `.\scripts\test-all.ps1`: ejecuta los tres bloques y presenta el resumen conjunto.
- `.\scripts\format-frontend.ps1`: aplica Prettier dentro de Docker y copia de vuelta solo los archivos administrados por el formateador. Modifica el working tree; revise el diff después.

Los checks se ejecutan en contenedores con copias temporales del repositorio. Los scripts de pruebas montan la copia original en solo lectura y eliminan `.env`, `.git`, `node_modules`, `bin` y `obj` de la copia temporal. `format-frontend.ps1` es la excepción porque debe copiar de vuelta las rutas formateadas. Los resultados TRX quedan fuera del repositorio.

## Seguridad de las pruebas PostgreSQL

La base reservada para las pruebas de integración es **`pastel_integration_tests`**. Antes de recrearla, el script verifica que no coincide con la base configurada como normal. No levanta la API ni el frontend, no ejecuta `docker compose down -v` y no elimina el volumen de desarrollo. La base reservada se vuelve a recrear en la siguiente ejecución.

Las cadenas de conexión se pasan al contenedor ejecutor sin imprimirlas. No use datos ni credenciales reales para pruebas automatizadas. Las pruebas de integración deben mostrar cero fallos y cero omisiones; que el proceso de pruebas termine no basta si las pruebas no se ejecutaron.

## Cobertura

- **Backend:** restauración, auditoría de dependencias, formato, build completo y pruebas unitarias.
- **PostgreSQL/integración HTTP:** host, migraciones, salud, CSRF, opciones de autenticación y autorización de endpoints, más casos nuevos de seguridad.
- **Frontend:** auditoría de dependencias, formato, lint, TypeScript/Vite, guarda estática de diseño, auditoría visual y metas Tailwind.

Se incorporó el scaffold de pruebas React/Vitest/Testing Library/axe y un smoke E2E de Playwright con axe para `/ingresar`. Todavía está pendiente instalar las dependencias en `web/package.json` y regenerar `package-lock.json` con npm, ejecutar las pruebas y verificar visualmente login/registro, Workspace, Ágora, administración, permisos y cuenta en tema claro/oscuro y escritorio/móvil. Las pruebas estáticas de diseño no reemplazan los recorridos interactivos ni la aprobación visual del propietario.

## Docker Compose

Para comprobar manualmente el stack de desarrollo (sin considerarlo aprobado hasta revisar el resultado):

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail 150 api web db
```

La configuración base usa una base PostgreSQL externa. El servicio `db` y su volumen local se definen en `compose.override.yaml`, cargado automáticamente para desarrollo. Para un entorno con PostgreSQL externo, configure `POSTGRES_HOST` y ejecute `docker compose -f compose.yaml ...` sin el override.

## Flujo de CI

El workflow de GitHub Actions es **manual únicamente**. `.github/workflows/ci.yml` declara `workflow_dispatch`, requiere `confirm_validation=true` y no tiene disparadores automáticos de push ni pull request. Después de completar el lote, revisar el diff y ejecutar localmente todas las comprobaciones disponibles, el propietario autoriza por separado el despacho integral desde **Actions → CI → Run workflow**. No se usa CI como bucle de depuración ni como sustituto de un entorno local que no esté disponible.

## Estado de validación

Las ejecuciones correctas registradas en esta bitácora pertenecen a SHA anteriores. Después se modificaron seguridad, shell, Compose, Nginx y los scripts de verificación. **El HEAD actual de `refactor/modular-foundation` debe considerarse sin validar** hasta ejecutar los comandos anteriores y registrar el SHA exacto que se comprobó. No se debe inferir un resultado verde de las ejecuciones históricas ni del hecho de que el workflow esté configurado.


## Build aislado por subapp y CodeQL

El workflow manual `.github/workflows/ci.yml` contiene un job `module-isolation` que construye backend y frontend con una sola subapp de negocio por fila; Identity permanece incluido. El workflow opcional `.github/workflows/codeql.yml` analiza C# y JavaScript/TypeScript y solo corre con `confirm_scan=true`. Ambos workflows requieren comprobación manual del propietario y no se ejecutaron con este cambio. El proyecto de pruebas de arquitectura y el resultado de cada build por subconjunto siguen pendientes de Build/QA.


## Fixtures de autenticación QA (solo local)

Compose local habilita el sembrador mediante `TESTING_SEED_ENABLED=true`. Las credenciales fijas y sintéticas son:

- Owner/Superuser: `test.owner@pastel.local` / `Local-Only-Test-Owner-2026!`
- Administrator sin rol Owner: `test.admin@pastel.local` / `Local-Only-Test-Admin-2026!`
- Member: `test.member@pastel.local` / `Local-Only-Test-Member-2026!`

El sembrador corre al arrancar después del catálogo y Bootstrap. Se permite solo con la opción explícita en `Development`/`Testing`; en `Production` su configuración provoca un fallo deliberado de inicio. Ajuste `TESTING_SEED_ENABLED=false` para todo entorno compartido. El código y las credenciales se publican porque solo sirven para datos locales sintéticos; no son cuentas productivas.

**No validado:** el seeder requiere build y pruebas de integración de Build. Tampoco se instalaron las dependencias de pruebas frontend de CCR-006 porque el entorno no pudo acceder al registry de npm.
