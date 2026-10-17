# Arquitectura y guía para extender Pastel Admin Platform

## Tecnologías oficiales

- **Runtime/backend:** .NET 10 y ASP.NET Core Web API.
- **Arquitectura backend:** capas `Pastel.Domain`, `Pastel.Application`, `Pastel.Infrastructure` y `Pastel.Api`.
- **Persistencia:** PostgreSQL 17 en Docker; Entity Framework Core 10 y proveedor Npgsql.
- **Frontend:** React 19, TypeScript 5.9, Vite 8 y `lucide-react`.
- **Servidor web/reverse proxy:** Nginx en la imagen `web`.
- **Entorno local:** Docker Compose; la base persiste en el volumen `postgres_data`.
- **Pruebas/CI:** xUnit y GitHub Actions. Dependabot administra las actualizaciones de dependencias con destino a `dev`.

No agregues un segundo framework o biblioteca para resolver un problema que ya tiene solución en el stack, sin verificar primero las capacidades existentes y explicar la necesidad. Conserva las versiones alineadas con los archivos de proyecto y los pipelines.

## Mapa del código

- `src/Pastel.Domain/Entities/`: entidades de dominio, como `AppUser`, `AppRole`, `ModuleDefinition`, `PermissionDefinition`, `RefreshToken` y `AuditLog`. No depende de infraestructura.
- `src/Pastel.Application/Abstractions/`: contratos de persistencia y servicios de aplicación. `Contracts/` contiene DTOs, comandos y reglas reutilizables.
- `src/Pastel.Infrastructure/Persistence/AppDbContext.cs`: `DbSet`, claves, índices, relaciones y configuración EF Core.
- `src/Pastel.Infrastructure/Persistence/Migrations/`: migraciones EF Core versionadas y `AppDbContextModelSnapshot`.
- `src/Pastel.Infrastructure/Persistence/DatabaseSeeder.cs`: catálogo inicial idempotente de módulos/permisos, roles base y usuario de bootstrap.
- `src/Pastel.Infrastructure/Services/`: implementación de casos de uso de autenticación y administración.
- `src/Pastel.Infrastructure/Security/`: configuración JWT y autorización dinámica basada en permisos.
- `src/Pastel.Api/Program.cs`: composición de dependencias, autenticación, middlewares, políticas y migraciones al iniciar.
- `src/Pastel.Api/Controllers/`: endpoints HTTP. `AuthController.cs` gestiona sesión; `AdminUsersController.cs` y `AdminSettingsController.cs` cubren administración.
- `src/Pastel.Api/Middleware/`: manejo transversal de errores, protección CSRF y cabeceras de seguridad.
- `web/src/App.tsx`: composición y rutas principales de la SPA.
- `web/src/SettingsPage.tsx`: vistas de configuración/administración existentes.
- `web/src/lib/api.ts`: cliente HTTP y manejo común de API; úsalo en vez de duplicar fetch/configuración.
- `web/src/styles.css`: entrada de Tailwind CSS 4, tokens de diseño, variantes de tema y estilos base; los componentes existentes usan `@apply` cuando requieren selectores semánticos complejos.
- `compose.yaml`, `web/Dockerfile`, `src/Pastel.Api/Dockerfile` y `deploy/nginx/default.conf`: ejecución contenerizada y proxy same-origin.

## Dirección de dependencias

- `Domain` contiene las entidades; no debe referenciar `Application`, `Infrastructure` ni `Api`.
- `Application` define contratos y reglas del caso de uso, sin depender de implementaciones de persistencia.
- `Infrastructure` implementa contratos usando EF Core/PostgreSQL y servicios de seguridad.
- `Api` conecta las capas, valida solicitudes HTTP y expone endpoints.
- `web` consume la API. La interfaz puede ocultar acciones no permitidas, pero nunca sustituye la autorización del servidor.

## Persistencia y migraciones

Usa las migraciones EF Core para cualquier cambio de esquema. No uses `EnsureCreated` ni SQL manual como reemplazo del historial de migraciones.

1. Cambia entidades y configuración en `AppDbContext.cs` cuando corresponde.
2. Genera una migración con EF Core 10 usando el proyecto Infrastructure como proyecto de migraciones y Api como startup project:

```powershell
dotnet ef migrations add NombreDescriptivo --project src/Pastel.Infrastructure --startup-project src/Pastel.Api --output-dir Persistence/Migrations
```

3. Revisa tanto el código de `Up`/`Down` como el snapshot generado y verifica que los archivos estén dentro de `src/Pastel.Infrastructure/Persistence/Migrations/`.
4. Compila, prueba y levanta Docker contra una base vacía; confirma que `Modules` y las demás tablas se creen antes del seeding.

`Program.cs` aplica migraciones al iniciar por defecto (`Database:ApplyMigrationsAtStartup=true`), y falla de forma explícita si no descubre migraciones. Mantén el paquete `Microsoft.EntityFrameworkCore.Relational` y las herramientas/design package de EF Core alineados con la versión 10.0.x empleada por el proyecto.

## Cómo agregar un módulo nuevo

Un módulo funcional requiere más que una fila en la tabla `Modules`: hay que registrar permisos y construir el comportamiento real. Sigue este checklist en una misma rama `feat/<modulo>`:

1. **Definir identidad y permisos.** Usa un código estable en minúsculas y permisos `<modulo>.<accion>` (por ejemplo, `inventory.read`, `inventory.create`). Conserva los códigos existentes una vez publicados; son contratos de autorización.
2. **Registrar el catálogo base.** Si el módulo debe existir en una instalación nueva, agrega módulo, permisos descriptivos y nombres al catálogo `PermissionCatalog` de `DatabaseSeeder.cs`. El seeder debe ser idempotente y no duplicar módulos/permisos.
3. **Crear la lógica del módulo.** Agrega reglas/entidades sólo donde corresponda; contratos/casos de uso en Application; persistencia en Infrastructure; endpoints en `src/Pastel.Api/Controllers/`. Reutiliza servicios y patrones existentes.
4. **Proteger los endpoints.** Usa el mecanismo de autorización dinámica `permission:<codigo>` existente. Verifica el código exacto en `src/Pastel.Infrastructure/Security/PermissionAuthorization.cs` y los controladores actuales. Nunca confíes sólo en ocultar botones del frontend.
5. **Respetar la regla de denegación.** Un módulo deshabilitado debe bloquear todos sus permisos; una denegación individual prevalece sobre permisos heredados de roles. Mantén denegación por defecto.
6. **Registrar permisos administrativos.** Comprueba si las pantallas/operaciones requieren nuevas acciones en el catálogo de `settings` para lectura, creación, edición, desactivación o auditoría. Aplica la menor autorización necesaria.
7. **Crear frontend.** Actualiza `web/src/App.tsx` para navegación/rutas, `web/src/SettingsPage.tsx` si cambia administración/configuración, `web/src/lib/api.ts` para llamadas y `web/src/styles.css` sólo cuando se necesiten estilos. Reutiliza componentes, cliente API, accesibilidad y los temas existentes.
8. **Cambios de esquema.** Modifica `AppDbContext.cs`, genera la migración y conserva el snapshot. No modifiques la base compartida manualmente para luego omitir la migración.
9. **Pruebas.** Incluye casos de permiso concedido/denegado, módulo deshabilitado, excepción individual y comportamiento válido/erróneo. Verifica también creación de tablas en PostgreSQL.
10. **Documentar.** Actualiza README o documentación específica con los endpoints, permisos, configuración, migración y cómo probar el módulo. Estos registros permiten que sesiones futuras de IA continúen sin depender del chat anterior.

### Registro dinámico frente a módulos incluidos en el código

La vista **Configuración → Módulos** puede registrar códigos y acciones en la base en tiempo de ejecución. Esto sólo registra metadatos y permisos en la base; no genera automáticamente endpoints, lógica de negocio ni pantallas. Si la funcionalidad debe venir disponible en una instalación nueva, inclúyela también en el catálogo inicial del seeder.

## Seguridad que no debe romperse

- Mantén JWT y refresh token en cookies protegidas `HttpOnly`, `Secure` y `SameSite`; no uses almacenamiento del navegador para tokens.
- Conserva protección CSRF, cabeceras defensivas y APIs same-origin tras Nginx.
- Mantén hashes de refresh token, rotación e invalidación de sesión al cambiar credenciales, roles o estado de usuario.
- No registres contraseñas, tokens, secretos o datos personales sensibles.
- Lee `docs/SECURITY.md` antes de cambiar login, autorización, cookies, CORS, proxy o políticas.

## Cambios visuales

La interfaz está en español y conserva accesibilidad, diseño responsive, foco visible y temas claro/oscuro. La paleta base es Brisa: modo claro en marfil cálido (#F7F6F0 / #FFFEFA), verde bosque (#315B4A), salvia (#789987), arena (#F2E5B5) y coral suave (#E7A58D). El modo oscuro conserva el fondo grafito #191B20, superficies de carbón diferenciadas, texto marfil/gris claro, salvia reservada para acciones primarias/selección y arena/coral para estados secundarios o de alerta.

### Tailwind CSS 4

- Tailwind se integra mediante `@tailwindcss/vite` en `web/vite.config.ts`; `web/src/styles.css` importa `tailwindcss` y declara la variante `dark` ligada a `data-theme="dark"`.
- Los tokens de color y tipografía se mantienen como variables CSS en `:root` y `:root[data-theme='dark']`, y se consumen desde utilidades Tailwind. Evita duplicar los valores de la paleta en componentes.
- **Preferencia para código nuevo:** escribe las clases de utilidad directamente en `className`, incluyendo variantes responsive, hover, focus y `dark:`.
- Usa `@apply` solo cuando haya un patrón visual semántico compartido o selectores complejos/pseudo-elementos que resultarían poco legibles en JSX. No agregues reglas de componentes con declaraciones CSS crudas; las únicas excepciones son tokens globales, normalización y keyframes personalizados.
- No incorpores Tailwind CSS 3 ni un `tailwind.config.js` innecesario; la configuración normal usa CSS-first de la versión 4.
- No agregues morado, violeta ni tonos similares. Los textos pequeños deben conservar contraste suficiente sobre los fondos correspondientes.
