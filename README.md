# Pastel Admin Platform

Plataforma modular de aplicaciones administrativas: shell compartido, autenticación (correo y Google), autorización por permisos, PostgreSQL y una interfaz React responsive en español con temas claro y oscuro. Un solo host .NET y un módulo por aplicación: Ágora, Brisa, Balance, Cosecha y Huella, más Identity.

> **Estado:** ver `docs/PROGRESS.md`. Antes de producción se requieren revisión de seguridad independiente, HTTPS, gestión de secretos, copias de seguridad y observabilidad.

## Tecnologías
.NET 10 y ASP.NET Core (endpoints mínimos por *slice*) · PostgreSQL 17 con EF Core y un esquema por módulo · React 19, TypeScript, Vite, React Router, TanStack Query y Tailwind CSS 4 · Nginx · Docker Compose · xUnit, Vitest y Playwright · GitHub Actions.

## Arquitectura
```text
web (React / Vite / Tailwind) -> Nginx -> /api -> Pastel.Host -> Identity, Agora, Brisa, Balance, Cosecha, Huella
                                                              -> PostgreSQL (un esquema por módulo)
```
Estructura del repositorio y reglas de frontera: `docs/ARCHITECTURE.md`.

## Arranque local (Docker Desktop, Windows PowerShell)
```powershell
Copy-Item .env.example .env        # valores solo para desarrollo local; nunca secretos reales en Git
docker compose up -d --build
```
Abra <http://localhost:8080> cuando los servicios estén saludables. La primera ejecución crea la cuenta de arranque definida en `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` (exige cambiar la contraseña al entrar). **No ejecute `docker compose down -v`** salvo que quiera borrar los datos locales. PostgreSQL externo, módulos por subconjunto, Google, proxy inverso y comandos frecuentes: `docs/OPERATIONS.md`.

## Calidad
`.\scripts\test-all.ps1` (backend, base de datos y frontend) e `.\scripts\install-hooks.ps1` una vez por clon. Política y comandos: `docs/TESTING.md`.

## Documentación

Los documentos viven en `docs/` (uno por tema). Qué contiene cada uno y qué leer según la tarea: `AGENTS.md` §2 y §9. Estado: `docs/PROGRESS.md` y `docs/progress/`.
