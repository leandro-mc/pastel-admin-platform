# Operación local, módulos y Google

## 1. Docker Compose
`compose.yaml` es la base y `compose.override.yaml` añade el PostgreSQL de desarrollo (puerto publicado solo en `127.0.0.1`, volumen `postgres_data`). Compose carga ambos desde la raíz.
```powershell
docker compose ps
docker compose logs --tail 150 api web db
docker compose up -d --build          # reconstruir y levantar
docker compose exec db psql -U pastel -d pastel
docker compose down                   # detiene sin borrar la base
```
**`docker compose down -v` borra los datos locales**: no es el primer paso de un diagnóstico (revise `ps` y `logs` antes). pgAdmin: host `localhost`, puerto `POSTGRES_PORT`, base/usuario/contraseña del `.env`.

**PostgreSQL externo** (sin el servicio `db`): `docker compose -f compose.yaml up -d --build` con `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` apuntando a una base accesible. `POSTGRES_HOST=db` solo vale con el override activo.

**Variables de sesión de PowerShell**: tienen precedencia sobre `.env`; después de usar una (`$env:X = …`) restáurela o elimínela (`Remove-Item Env:X`).

## 2. Cuenta de arranque y cuentas QA
- La primera ejecución crea o restaura la cuenta de `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` con los roles Administrator y Owner/Superuser; el primer ingreso exige cambiar la contraseña. En producción los secretos vienen del gestor de secretos de su entorno y el arranque rechaza credenciales de ejemplo.
- Cuentas QA locales (solo `Development`/`Testing`, `TESTING_SEED_ENABLED=true`): ver `docs/TESTING.md` §5. El arranque en `Production` con el sembrador activo falla a propósito.

## 3. Módulos por subconjunto (`PASTEL_MODULES`)
`*` incluye todos; una lista (`brisa,balance`) incluye solo esas apps; Identity siempre se compila. Es una decisión de **empaquetado**, no un control de autorización: los módulos incluidos aplican autorización backend con denegación por defecto.
```powershell
$env:PASTEL_MODULES = "brisa,balance"
docker compose build api web
docker compose up -d api web
$env:PASTEL_MODULES = "*"      # volver al valor habitual
```
- Excluir una app oculta sus endpoints y páginas, pero **no** elimina sus tablas ni migra datos.
- En el build del frontend se usan códigos en minúscula; el Dockerfile del backend los normaliza a PascalCase para la propiedad MSBuild (`-p:PastelModules=Brisa;Balance`). No pase una lista en minúscula directo a MSBuild.
- Valide el subconjunto antes de desplegarlo: `.\scripts\qa-phase0-stack.ps1 -ModuleIsolation` construye las imágenes de cada módulo.

## 4. Ingreso con Google (una vez, en la consola de Google)
1. **Pantalla de consentimiento** (tipo Externo, nombre «Pastel»): solo ámbitos `openid`, `email` y `profile`. En estado «En pruebas» solo entran las cuentas agregadas como usuarios de prueba.
2. **Credenciales → ID de cliente de OAuth → Aplicación web.** Sin orígenes de JavaScript. URI de redireccionamiento autorizados, idénticos carácter por carácter: `http://localhost:8080/api/auth/google/callback` (desarrollo), `http://localhost:18080/api/auth/google/callback` (stack de QA) y `https://SU-DOMINIO/api/auth/google/callback` (producción).
3. Guarde en `.env` (nunca en Git): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `APP_PUBLIC_BASE_URL` (por ejemplo `http://localhost:8080`). Con `dotnet run`: `dotnet user-secrets set "Authentication:Google:ClientId" …` y lo mismo con `ClientSecret`.
4. Si Google muestra `redirect_uri_mismatch`, la URI no coincide (puerto, `http`/`https`, barra final); corrija en la consola o en `APP_PUBLIC_BASE_URL`.
5. Use un cliente distinto para producción. Si el secreto se expone, genere uno nuevo.
6. Para que su cuenta de Google sea administradora, use ese mismo correo en `BOOTSTRAP_ADMIN_EMAIL`: al ingresar con Google se vincula a la cuenta de arranque y su contraseña queda invalidada. Verificación manual: `docs/TESTING.md` §6.

## 5. Proxy inverso y hosts
`NGINX_TRUSTED_PROXY_CIDR` vale por defecto `192.0.2.0/24` (rango de documentación) para no confiar en un `X-Forwarded-For` suministrado por un cliente. Con un proxy inverso real, configure su CIDR junto con `REVERSE_PROXY_TRUSTED_NETWORKS` y `ALLOWED_HOSTS`, y mantenga HTTPS: las cookies de sesión usan el prefijo `__Host-` y necesitan HTTPS (salvo `localhost`).

## 6. Desarrollo sin Docker
Requiere PostgreSQL y las variables `ConnectionStrings__Default`, `Jwt__SigningKey`, `Bootstrap__AdminEmail` y `Bootstrap__AdminPassword`.
```powershell
dotnet restore Pastel.slnx; dotnet build Pastel.slnx -c Release; dotnet test Pastel.slnx -c Release
Push-Location web; npm ci; npm run format:check; npm run lint; npm run build; Pop-Location
```
`npm run dev` inicia Vite (proxy según `web/vite.config.ts`).
