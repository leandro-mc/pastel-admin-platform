# Pastel Admin Platform

Base modular para construir aplicaciones administrativas con autenticación, autorización por roles y permisos, PostgreSQL y una interfaz React con temas claro y oscuro. La interfaz está en español y utiliza una paleta suave de verdes, azules, arena y neutros.

> **Estado:** base de arquitectura en evolución. CI compila/prueba backend y frontend y valida el arranque Docker con PostgreSQL. Antes de producción se necesitan revisión de seguridad independiente, observabilidad, backups y pruebas de integración adicionales.

## Tecnologías

- **Backend:** .NET 10, ASP.NET Core Web API; capas Domain / Application / Infrastructure / API.
- **Datos:** PostgreSQL 17, Entity Framework Core 10 y Npgsql.
- **Frontend:** React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4 (plugin nativo de Vite) y Lucide.
- **Web/proxy:** Nginx.
- **Local/CI:** Docker Compose, xUnit, GitHub Actions y Dependabot.


### Estilos del frontend

La interfaz usa Tailwind CSS 4 con `@tailwindcss/vite`; la integración es CSS-first y no requiere `tailwind.config.js` para el tema base. Los tokens de los modos claro y oscuro se definen en `web/src/styles.css`. El código se organiza por pantalla/feature en `web/src/components/` y `web/src/features/settings/`; `App.tsx` coordina la sesión y las pantallas. Aplicá Prettier con `npm run format` y validalo con `npm run format:check`. Está prohibido incorporar tonos morados, violetas o púrpuras, iconos de destellos/estrellas decorativas o equivalentes; para la marca, usá la flor de la app (`Flower2`) y otros iconos por su significado semántico.

## Funcionalidades base

- Inicio de sesión/registro, hash de contraseñas, bloqueo temporal por intentos fallidos y rate limiting.
- JWT corto en cookie protegida, refresh token opaco almacenado sólo como hash y rotación de sesiones.
- Protección CSRF, cabeceras defensivas, errores JSON homogéneos y auditoría.
- Administración de usuarios, roles, permisos, bloqueos y restablecimiento de contraseña temporal.
- Catálogo dinámico de módulos/permisos; los módulos deshabilitados deniegan sus permisos incluso si un rol los concede.
- Panel principal, perfil, configuración y temas claro/oscuro.

## Arquitectura

```text
web (React/Vite) → Nginx → /api → ASP.NET Core
                                ↓
           Domain ← Application ← Infrastructure → PostgreSQL
```

`Pastel.Domain` contiene entidades; `Pastel.Application`, contratos; `Pastel.Infrastructure`, persistencia y servicios de seguridad; `Pastel.Api`, endpoints y composición de dependencias. La autorización se aplica en el backend. Consulta `docs/ARCHITECTURE.md` y `docs/SECURITY.md` antes de modificar estas áreas.

## Arranque local con Docker

Requisito: Docker Desktop con Docker Compose v2.

1. Clona el repositorio y entra a la carpeta.
2. Copia el archivo de configuración:

```powershell
Copy-Item .env.example .env
```

3. Edita `.env`. Cambia `POSTGRES_PASSWORD`, `JWT_SIGNING_KEY` y `BOOTSTRAP_ADMIN_PASSWORD` por valores aleatorios propios. La clave JWT necesita al menos 32 bytes UTF-8. No uses los valores de ejemplo fuera de una máquina de desarrollo.
4. Construye y levanta los servicios:

```powershell
docker compose up --build -d
```

## Uso diario de Docker

### Abrir la aplicación

- URL local: **http://localhost:8080** (o `http://localhost:<WEB_PORT>` si cambiaste `WEB_PORT` en `.env`).
- El servidor se publica sólo en `127.0.0.1`; desde otro equipo de la red no será accesible por defecto.
- Al primer inicio, si se creó la cuenta bootstrap, entra con `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` de `.env`; la aplicación fuerza el cambio de contraseña.

### Conectarse a PostgreSQL desde pgAdmin 4

El servicio de base publica el puerto local `127.0.0.1:${POSTGRES_PORT:-5432}:5432`. Si pgAdmin está instalado en Windows, registra un servidor con:

| Campo de pgAdmin | Valor predeterminado |
| --- | --- |
| General → Name | `Pastel Admin Local` |
| Connection → Host name/address | `localhost` |
| Port | `5432` (o el valor de `POSTGRES_PORT`) |
| Maintenance database | `pastel` (o `POSTGRES_DB`) |
| Username | `pastel` (o `POSTGRES_USER`) |
| Password | valor de `POSTGRES_PASSWORD` en `.env` |

El puerto está ligado a `127.0.0.1` por seguridad y no expone PostgreSQL a toda la red. Si el puerto 5432 está ocupado, cambia `POSTGRES_PORT=5433` en `.env` y vuelve a crear el servicio `db` con `docker compose up -d db`; en pgAdmin usa el puerto 5433.

### Comandos comunes

```powershell
# Estado de todos los servicios
docker compose ps

# Logs en tiempo real de todo el stack
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Últimas 100 líneas del backend
docker compose logs --tail 100 api

# Reconstruir API y web tras cambios de código
docker compose up --build -d api web

# Reiniciar sólo el backend
docker compose restart api

# Abrir psql dentro del contenedor de PostgreSQL
docker compose exec db psql -U pastel -d pastel

# Detener los servicios conservando los datos
docker compose down
```

Si cambiaste `POSTGRES_USER` o `POSTGRES_DB`, sustituye `pastel` en el comando `psql` por los valores de `.env`.

**No ejecutes `docker compose down -v` a menos que quieras borrar también el volumen y todos los datos de la base local.**

### Si algo falla

```powershell
docker compose ps
docker compose logs --tail 150 api db web
docker compose config --quiet
```

Después de actualizar código, usa `git switch dev` y `git pull --ff-only origin dev`, y vuelve a construir los servicios. No borres el volumen como primer paso de diagnóstico.

## Desarrollo y ramas

El trabajo diario va en ramas de tarea creadas desde la base indicada por el orquestador (normalmente `dev`; durante una refactorización base puede ser una rama de refactor autorizada). Se permiten commits y pushes de checkpoint para relevo entre agentes. **No abras PR ni integres a `dev` sin autorización explícita del usuario**; con autorización, abre un solo PR por tarea. `main` se reserva para versiones estables y requiere autorización explícita. Lee `AGENTS.md`, `docs/AI_WORKFLOW.md` y `docs/ARCHITECTURE.md` antes de trabajar. La promoción estable usa un PR revisado y un tag `vMAJOR.MINOR.PATCH`.

## Desarrollo sin Docker

Con PostgreSQL disponible, configura `ConnectionStrings__Default`, `Jwt__SigningKey`, `Bootstrap__AdminEmail` y `Bootstrap__AdminPassword` mediante variables de entorno o User Secrets:

```powershell
dotnet restore Pastel.slnx
dotnet build Pastel.slnx --configuration Release
dotnet test Pastel.slnx --configuration Release
```

En otra terminal:

```powershell
cd web
npm install
npm run dev
```

Vite sirve el frontend en `http://localhost:5173` y utiliza un proxy a `http://localhost:5080` para la API. Define `ASPNETCORE_URLS=http://localhost:5080` al ejecutar el backend. Las cookies `__Host-` requieren HTTPS para probar el flujo de sesión completo.

## Añadir un módulo

Registrar un módulo desde Configuración crea metadatos y permisos en la base, no genera automáticamente la lógica ni las pantallas. Para un módulo incluido por defecto, actualiza el catálogo `PermissionCatalog` de `DatabaseSeeder.cs`, protege cada endpoint con el permiso dinámico adecuado, actualiza la SPA, agrega pruebas y genera una migración si cambia el esquema. Sigue la lista de `docs/ARCHITECTURE.md`.

## Comprobaciones de CI

GitHub Actions verifica backend, frontend y arranque Docker con PostgreSQL en pushes a `dev`/`main` y en PRs hacia esas ramas cuando se abren, se reabren, se marcan listos o reciben nuevos commits estando listos. Los pushes a ramas de trabajo y los PR en borrador no ejecutan el CI completo. También se puede iniciar manualmente en **Actions → CI → Run workflow**. Consulta la pestaña **Actions**; tener un workflow configurado no significa que ya pasó.

## Seguridad y limitaciones

Consulta `docs/SECURITY.md`. La base no incluye MFA, recuperación por correo, confirmación de correo, SSO/OIDC ni monitoreo avanzado de amenazas. Producción requiere HTTPS, gestión de secretos, backups, observabilidad, pruebas de integración y una revisión de seguridad independiente. Los valores de `.env.example` son exclusivamente para desarrollo local.