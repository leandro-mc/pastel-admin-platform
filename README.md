# Pastel Admin Platform

Base modular para construir aplicaciones administrativas con autenticación, autorización por roles y permisos, PostgreSQL y una interfaz React con temas claro y oscuro. La interfaz está en español y utiliza una paleta suave de verdes, azules, arena y neutros.

> **Estado:** versión inicial de arquitectura. El CI de GitHub está configurado para compilar y probar el backend y frontend. Antes de producción, ejecutar las comprobaciones, añadir pruebas de integración y realizar una revisión de seguridad independiente.

## Stack

- **Backend:** .NET 10, ASP.NET Core Web API, capas Domain / Application / Infrastructure / API.
- **Datos:** PostgreSQL + Entity Framework Core con migraciones.
- **Frontend:** React, TypeScript, Vite y Lucide.
- **Local:** Docker Compose, Nginx como servidor estático y proxy de API.
- **Calidad:** xUnit, GitHub Actions y Dependabot.

## Capacidades de la base

- Registro e inicio de sesión con hash de contraseñas, bloqueo temporal por intentos fallidos y limitación de solicitudes.
- JWT de acceso de corta duración en cookie `HttpOnly` / `Secure`, refresh token opaco almacenado sólo como hash y rotación de sesiones.
- Protección CSRF, cabeceras defensivas, errores JSON homogéneos y auditoría administrativa.
- Gestión de usuarios: creación, asignación de roles, excepciones individuales de permisos, bloqueo/desbloqueo y restablecimiento de contraseña temporal.
- Gestión de roles y catálogo dinámico de módulos y permisos. Un módulo deshabilitado deniega sus permisos incluso si un rol los concede.
- Panel de inicio, perfil, configuración, búsqueda de usuarios, estados de cuenta, bitácora y temas claro/oscuro.

## Arquitectura

```text
web (React/Vite) ──same-origin── Nginx ── /api ── ASP.NET Core
                                                  │
                         Domain ← Application ← Infrastructure
                                                  │
                                              PostgreSQL
```

`Pastel.Domain` define las entidades e invariantes. `Pastel.Application` contiene contratos y políticas independientes de infraestructura. `Pastel.Infrastructure` implementa EF Core, acceso a datos, hash de contraseñas, JWT, sesiones y autorización. `Pastel.Api` expone HTTP, middleware y composición de dependencias. La SPA sólo adapta la navegación a los permisos devueltos por el servidor; **toda autorización se aplica en el backend**.

## Requisitos

Para ejecución en contenedores: Docker Desktop con Docker Compose v2. Para ejecución individual: .NET SDK 10 y Node.js 24 o una versión compatible.

## Arranque local con Docker

1. Cloná el repositorio y entrá al directorio raíz.
2. Copiá el archivo de ejemplo de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Editá `.env`: sustituí **todas** las claves y contraseñas por valores aleatorios propios. No uses los valores de ejemplo en un entorno compartido o productivo. La clave JWT debe tener al menos 32 bytes UTF-8.
4. Iniciá los servicios:

   ```powershell
   docker compose up --build -d
   ```

5. Abrí `http://localhost:8080`. Si configuraste `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` antes de la primera ejecución, usá esa cuenta para ingresar y cambiá la contraseña temporal al entrar.
6. Revisá el estado con `docker compose ps`; logs con `docker compose logs -f api web db`; detené con `docker compose down`.

La base de datos persiste en el volumen `postgres_data`. `docker compose down -v` también elimina los datos persistidos; utilizalo sólo cuando realmente querás borrar la base local.

## Desarrollo sin Docker

Iniciá PostgreSQL, configurá `ConnectionStrings__Default`, `Jwt__SigningKey`, `Bootstrap__AdminEmail` y `Bootstrap__AdminPassword` mediante variables de entorno o User Secrets. Luego:

```powershell
dotnet restore Pastel.slnx
dotnet test Pastel.slnx
```

En otra terminal:

```powershell
cd web
npm install
npm run dev
```

Vite sirve el frontend en `http://localhost:5173` y usa un proxy a `http://localhost:5080` para la API. Configurá `ASPNETCORE_URLS=http://localhost:5080` y las variables anteriores al ejecutar el backend. Las cookies `__Host-` requieren HTTPS, por lo que el flujo completo de sesión debe probarse a través del origen servido en HTTPS o mediante el entorno Docker local, con sus certificados de desarrollo correctamente configurados.

## Módulos nuevos

Desde **Configuración → Módulos**, un administrador puede registrar un módulo mediante un código estable (minúsculas, números y guiones) y una lista de acciones. El servidor genera permisos del tipo `inventario.read`, `inventario.create` y los registra en el catálogo. Es necesario implementar el comportamiento real del nuevo módulo, proteger cada endpoint con `permission:<codigo>`, y crear pruebas para permisos concedidos, denegados y módulo deshabilitado. Registrar un módulo no genera automáticamente sus pantallas o lógica de negocio.

Principios para mantener la base extensible:

- Cada feature nueva va en una rama y en commits enfocados.
- No mezclar reglas de negocio con componentes de presentación.
- No confiar en controles visuales para proteger endpoints.
- Acompañar migraciones y cambios de autorización con pruebas.
- Revisar el diff y ejecutar backend, frontend y Docker antes de fusionar.

## Comandos de validación

```powershell
dotnet test Pastel.slnx --configuration Release
cd web
npm run build
npm run lint
cd ..
docker compose build
```

GitHub Actions corre comprobaciones del backend y frontend en `main`, `develop` y Pull Requests. Que el workflow esté configurado no implica que haya pasado: consultá la pestaña **Actions** del repositorio.

## Seguridad y limitaciones

Leé [`docs/SECURITY.md`](docs/SECURITY.md) para el modelo y los límites conocidos. Esta base no incluye MFA, recuperación de contraseña por correo, confirmación de correo, SSO/OIDC o monitoreo avanzado de amenazas. Para producción se requieren HTTPS real, gestión de secretos, backups, observabilidad, revisión independiente, pruebas de integración y un plan de respuesta a incidentes. Los ejemplos de `.env.example` son exclusivamente para desarrollo.
