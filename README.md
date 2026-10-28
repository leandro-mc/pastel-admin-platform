# Pastel Admin Platform

Plataforma modular de aplicaciones administrativas: shell compartido, autenticación (correo y Google), autorización por permisos, PostgreSQL y una interfaz React responsive en español con temas claro y oscuro. Un solo host .NET y un módulo por aplicación: Ágora, Brisa, Balance, Cosecha y Huella, más Identity.

> **Estado:** la Fase 0 (base modular, Identity, infraestructura y validación) está cerrada con diferidos documentados; ver `docs/PROGRESS.md`. Antes de producción se requieren revisión de seguridad independiente, HTTPS, gestión de secretos, copias de seguridad y observabilidad.

## Tecnologías
.NET 10 y ASP.NET Core (endpoints mínimos por *slice*) · PostgreSQL 17 con EF Core y un esquema por módulo · React 19, TypeScript, Vite, React Router, TanStack Query y Tailwind CSS 4 · Nginx · Docker Compose · xUnit, Vitest y Playwright · GitHub Actions.

## Arquitectura
```text
web (React / Vite / Tailwind) -> Nginx -> /api -> Pastel.Host -> Identity, Agora, Brisa, Balance, Cosecha, Huella
                                                              -> PostgreSQL (un esquema por módulo)
```
- `src/BuildingBlocks/`: `Pastel.SharedKernel` (contratos) y `Pastel.Platform` (composición, autorización, errores, observabilidad).
- `src/Host/Pastel.Host`: host ASP.NET Core y carga de módulos. `src/Modules/<Modulo>/`: backend, permisos, endpoints y `DbContext` de cada módulo.
- `web/src/core` (autenticación, cliente API, diseño, primitivas), `web/src/app` (router, shell) y `web/src/modules/<modulo>` (páginas y manifiesto).
- Cada módulo conserva su API, permisos y esquema; no se referencia el interior de otro ni se crean claves foráneas entre esquemas. La autorización real vive en el backend. Detalle en `docs/ARCHITECTURE.md`.

## Arranque local (Docker Desktop, Windows PowerShell)
```powershell
Copy-Item .env.example .env        # valores solo para desarrollo local; nunca secretos reales en Git
docker compose up -d --build
```
Abra <http://localhost:8080> cuando los servicios estén saludables. La primera ejecución crea la cuenta de arranque definida en `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` (exige cambiar la contraseña al entrar). **No ejecute `docker compose down -v`** salvo que quiera borrar los datos locales. PostgreSQL externo, módulos por subconjunto, Google, proxy inverso y comandos frecuentes: `docs/OPERATIONS.md`.

## Calidad
`.\scripts\test-backend.ps1`, `.\scripts\test-database.ps1`, `.\scripts\test-frontend.ps1` y `.\scripts\test-all.ps1`; instale el hook de commit con `.\scripts\install-hooks.ps1`. Política de pruebas esenciales y detalle en `docs/TESTING.md`.

## Documentación
| Documento | Contenido |
|---|---|
| `AGENTS.md` | Reglas operativas de todos los agentes (única fuente de reglas) |
| `docs/PROGRESS.md` | Estado actual, pendientes y backlog |
| `docs/GIT_WORKFLOW.md` | Ramas, commits, PR y CI |
| `docs/ARCHITECTURE.md` · `docs/SECURITY.md` · `docs/ERROR_HANDLING_AND_LOGGING.md` | Sistema vigente |
| `docs/DESIGN_SYSTEM.md` · `docs/product/PASTEL-PRODUCT-AND-UX.md` | Diseño y producto |
| `docs/TESTING.md` · `docs/OPERATIONS.md` | Pruebas y operación |
| `docs/DECISIONS.md` · `docs/modules/` | Registro de decisiones y fichas de cada módulo |
