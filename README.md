# Pastel Admin Platform

Base modular para una plataforma de aplicaciones administrativas con shell compartido, autenticación, autorización por permisos, PostgreSQL y una interfaz React adaptable con temas claro y oscuro. La interfaz está en español y usa una paleta de verdes, azules, arena y neutros.

> **Estado:** arquitectura base en evolución. Antes de producción se requieren validación Build/QA del SHA actual, revisión de seguridad independiente, HTTPS, gestión de secretos, copias de seguridad, observabilidad y pruebas de integración y navegador.

## Tecnologías

- **Backend:** .NET 10, ASP.NET Core Minimal APIs, módulos con vertical slices.
- **Persistencia:** PostgreSQL 17, Entity Framework Core 10, Npgsql, un esquema por módulo.
- **Frontend:** React 19, TypeScript 5.9, Vite 8, React Router, TanStack Query y Tailwind CSS 4.
- **Web:** Nginx, políticas de seguridad, compresión y caché de activos con hash.
- **Contenedores y calidad:** Docker Compose, xUnit, GitHub Actions y scripts reproducibles de validación.

## Arquitectura actual

```text
web (React / Vite / Tailwind) -> Nginx -> /api -> Pastel.Host
                                                    |-> Identity
                                                    |-> Agora
                                                    |-> Brisa
                                                    |-> Balance
                                                    |-> Cosecha
                                                    |-> Huella
                                                    v
                                             PostgreSQL (esquemas separados)
```

- `src/BuildingBlocks/Pastel.SharedKernel`: tipos pequeños compartidos y contratos del dominio.
- `src/BuildingBlocks/Pastel.Platform`: composición, autorización, errores, observabilidad y acceso a datos compartidos de plataforma.
- `src/Host/Pastel.Host`: host ASP.NET Core y carga de módulos.
- `src/Modules/<Modulo>/`: backend, permisos, endpoints verticales y `DbContext` de cada módulo.
- `web/src/core`: autenticación, cliente API, diseño y primitivas compartidas.
- `web/src/app`: router, shell, navegación y proveedores de la plataforma.
- `web/src/modules/<modulo>`: páginas y manifiesto de cada aplicación.
- `docs/modules` y cada `MODULE.md`: contratos de producto e instrucciones para contribuir.

Cada módulo conserva su API, permisos y esquema. No se deben referenciar tipos internos de otro módulo ni introducir claves foráneas entre esquemas. La autorización real se aplica en el backend; ocultar opciones en el frontend no sustituye los controles del servidor.

## Arranque local con Docker Desktop

Requisitos: Docker Desktop y Docker Compose v2. El proyecto incluye `compose.yaml` como configuración base y `compose.override.yaml` para el servicio PostgreSQL de desarrollo. Compose carga ambos archivos automáticamente cuando se ejecuta desde la raíz.

1. Copie la configuración local:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Para desarrollo local, puede conservar los valores de `.env.example` solo en su máquina. No los use fuera de desarrollo. Para cualquier entorno compartido, genere una clave JWT y una contraseña bootstrap aleatorias; nunca guarde secretos reales en Git.
3. Construya y levante la aplicación:

   ```powershell
   docker compose up -d --build
   ```

4. Espere a que los servicios estén saludables y abra [http://localhost:8080](http://localhost:8080).

La base de datos local está en el servicio `db` del override. Su puerto se publica únicamente en `127.0.0.1` para facilitar pgAdmin en el equipo anfitrión. El volumen `postgres_data` persiste aunque se detengan los contenedores.

### PostgreSQL externo

Para un entorno que no deba crear una base local, use la configuración base explícitamente y no cargue el override:

```powershell
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d
```

Configure `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` para una base PostgreSQL accesible desde el contenedor. En este modo no existe el servicio `db`; `POSTGRES_HOST=db` solo es válido cuando está activo el override de desarrollo. Ajuste también la subred de proxy confiable a la topología del despliegue; no confíe en encabezados de IP enviados por clientes no confiables.

### Cuenta bootstrap

La primera ejecución crea o restaura la cuenta definida por `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`. El primer inicio de sesión exige cambiar la contraseña. Para producción, suministre secretos por el gestor de secretos de su entorno y use un correo controlado por el responsable de Pastel.

### Cuentas QA locales (solo Development/Testing)

Con Compose local, `TESTING_SEED_ENABLED=true` activa tres cuentas de prueba reproducibles. Se crean en el primer arranque y se restauran si cambian las credenciales o el rol; sus sesiones anteriores se revocan al restaurarlas.

| Cuenta | Rol asignado | Contraseña local |
|---|---|---|
| `test.owner@pastel.local` | Owner/Superuser | `Local-Only-Test-Owner-2026!` |
| `test.admin@pastel.local` | Administrator (sin Owner) | `Local-Only-Test-Admin-2026!` |
| `test.member@pastel.local` | Member | `Local-Only-Test-Member-2026!` |

Son credenciales públicas y fijas únicamente para datos sintéticos locales. **No sirven para producción ni entornos compartidos.** El arranque se niega a continuar en Production si `TESTING_SEED_ENABLED=true`; configure explícitamente `TESTING_SEED_ENABLED=false` en cualquier despliegue. Para desactivar las fixtures locales basta con ajustar esa variable en `.env` y recrear el contenedor API.

### pgAdmin 4

En desarrollo, registre un servidor en pgAdmin con host `localhost`, puerto `POSTGRES_PORT` (5432 por defecto), base `POSTGRES_DB`, usuario `POSTGRES_USER` y contraseña `POSTGRES_PASSWORD` del archivo `.env`. La publicación de PostgreSQL está limitada a loopback. Si cambia el puerto, recree el servicio `db` y ajuste pgAdmin.

### Comandos frecuentes

```powershell
# Estado, logs y configuración
docker compose ps
docker compose logs -f api web db
docker compose config --quiet

# Reconstruir las imágenes y levantar servicios
docker compose up -d --build

# Consultar PostgreSQL local
docker compose exec db psql -U pastel -d pastel

# Detener contenedores sin borrar la base
docker compose down
```

**No ejecute `docker compose down -v` salvo que quiera borrar también los datos persistidos de la base local.** Para diagnosticar problemas, revise primero `docker compose ps` y `docker compose logs --tail 150 api web db`; no borre el volumen como primer paso.

## Desarrollo sin Docker

El backend necesita PostgreSQL disponible y las variables `ConnectionStrings__Default`, `Jwt__SigningKey`, `Bootstrap__AdminEmail` y `Bootstrap__AdminPassword`. Para compilar y ejecutar comprobaciones:

```powershell
dotnet restore Pastel.slnx
dotnet build Pastel.slnx --configuration Release
dotnet test Pastel.slnx --configuration Release
```

Para el frontend, use una instalación reproducible:

```powershell
Push-Location web
npm ci
npm run format:check
npm run lint
npm run build
Pop-Location
```

El comando `npm run dev` inicia Vite. Configure el proxy de desarrollo y la API de acuerdo con `web/vite.config.ts`; las cookies de sesión `__Host-` requieren HTTPS para validar el flujo de autenticación completo.

## Selección de módulos

`PASTEL_MODULES` permite incluir todos los módulos (`*`) o una lista separada por comas, por ejemplo `brisa,balance`. Identity se incluye siempre. En Docker, la variable alimenta los argumentos de build del backend y frontend. Consulte [docs/SPLIT_GUIDE.md](docs/SPLIT_GUIDE.md) antes de construir o probar un subconjunto.

## Seguridad y CI

Revise [docs/SECURITY.md](docs/SECURITY.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) antes de cambios transversales. Huella, catálogo persistente de membresías por aplicación y feed real de Ágora permanecen pendientes, según sus fichas; no se deben presentar como funcionalidades disponibles.

La CI es deliberadamente **manual**. No hay triggers automáticos de push o pull request: el propietario debe autorizar el despacho después de completar y revisar el lote y ejecutar localmente las comprobaciones posibles. Desde GitHub Actions, seleccione **CI → Run workflow**, elija la rama y confirme `confirm_validation=true`. Que el workflow exista o que un commit tenga status vacío no demuestra que pasó las comprobaciones.

El desarrollo continúa en la rama asignada por el orquestador. No abra PR ni fusione a `dev` o `main` sin autorización explícita. `main` queda reservada para versiones estables aprobadas.


### Proxy inverso y direcciones IP confiables

Por defecto, `NGINX_TRUSTED_PROXY_CIDR` usa `192.0.2.0/24`, un rango reservado para documentación/pruebas; no corresponde a un proxy de la instalación y evita confiar en un `X-Forwarded-For` suministrado por un cliente. Si coloca un proxy inverso real delante de Nginx, configure esta variable con la IP o el CIDR más limitado posible de ese proxy y ajuste `REVERSE_PROXY_TRUSTED_NETWORKS` con la dirección real de los saltos que ASP.NET debe aceptar. **No confíe en toda la subred de Docker si incluye conexiones de clientes que puedan falsificar encabezados.** Las variables de confianza deben reflejar la topología real, no ser valores copiados a ciegas de este ejemplo.
