# Fase 0 — Progreso del Agente 0 (rol Dev)

Rama: `refactor/modular-foundation`. Base: `origin/dev`. Este archivo permite retomar el trabajo sin el chat.

## Reglas vigentes de trabajo
- Dev escribe solo código de la aplicación. No escribe pruebas, planes de prueba ni migraciones (Build usa `dotnet ef`).
- WP1 (red de seguridad) lo ejecuta Build. Dev empieza en WP2.
- Se publica en C2 (tras WP5), C3 (tras WP8) y C4 (final), además de los checkpoints de protección de trabajo.
- Todo lo marcado «sin compilar» no se compiló ni se ejecutó con `dotnet build` completo (ver «Entorno»).

## Entorno de este agente
- SDK .NET 10.0.112 instalado por `apt`. NuGet (`api.nuget.org`) y Docker no son accesibles: no se pueden restaurar paquetes.
- Verificación parcial usada: `Pastel.SharedKernel` compila completo (0 advertencias, 0 errores). El resto se revisa compilando
  sin paquetes y descartando los errores por tipos de EF Core, Npgsql y Serilog ausentes (0 errores restantes en `Pastel.Platform`).
- Decisiones que Build debe verificar al compilar: `ForwardedHeadersOptions.KnownIPNetworks` y `System.Net.IPNetwork` (.NET 10),
  `RequestLoggingOptions.IncludeQueryInRequestPath` (Serilog.AspNetCore 9), versiones de paquetes de `Directory.Packages.props`
  (Serilog.AspNetCore 9.0.0, Serilog.Formatting.Compact 3.0.0, Authentication.Google 10.0.13), `IsRowVersion()` sobre `uint` para `xmin`.

## Estado por WP
| WP | Estado | Compilación |
|---|---|---|
| WP1 | Fuera de alcance de Dev (lo hace Build) | n/a |
| WP2 | En curso. `Pastel.SharedKernel` y `Pastel.Platform` escritos. Falta Host (`Program.cs`, csproj, appsettings, Dockerfile) | SharedKernel: compilado. Platform: solo revisión parcial |
| WP3 | En curso. Archivos movidos con `git mv` a `src/Modules/Identity/Pastel.Modules.Identity/`; **su contenido aún es el original y debe reescribirse** | Sin compilar |
| WP4–WP10 | Pendientes | — |

## Estructura actual (checkpoint 1)
- `src/BuildingBlocks/Pastel.SharedKernel`: `Result`, `Error`, `PagedResult`, `IClock`, `Guard`.
- `src/BuildingBlocks/Pastel.Platform`: contrato `IPastelModule`, cargador de módulos, errores `problem+json`, traductor de excepciones,
  autorización por permiso, CSRF, cabeceras, URL pública, límites de tasa, Serilog, salud, `POST /api/client-errors`, `TransactionRunner`.
- `src/Host/Pastel.Host`: renombrado desde `Pastel.Api`; `Program.cs`, `Pastel.Host.csproj` y configuración **aún sin reescribir**.
- `src/Modules/Identity/`: archivos del backend anterior movidos (entidades, `DbContext`, sembrador, JWT, políticas); pendientes de reescritura.
- Se eliminaron `Pastel.Domain`, `Pastel.Application`, `Pastel.Infrastructure` (incluye las migraciones antiguas: Build regenera).
- `Pastel.slnx` ya apunta a los proyectos nuevos; varios csproj aún no existen o están sin actualizar.

## Decisiones tomadas (registrar en ADR en WP10)
1. Respuesta CSRF inválido: pasa de 400 a **403** con código `platform.csrf_invalid` (el plan F0-S213 lo exige). El modelo CSRF no cambia.
2. Contrato de listados: `GET /api/admin/users` y `/api/admin/audit` pasan de arreglo a `{ items, page, pageSize, totalCount }` (paginación en servidor, B5).
3. Los permisos efectivos se calculan en una sola consulta por petición; el estado de sesión se carga una vez en `HttpContext.Items`.
4. El bloqueo por fallos de contraseña solo afecta el ingreso con contraseña (no invalida sesiones existentes ni cuenta para «último administrador»).
5. `IPastelModule.MapRootEndpoints` (método por defecto) permite a Identity conservar `/api/auth` y `/api/admin`.
6. Tablas de Identity en esquema `identity` con nombres en `snake_case`; columnas por defecto salvo `external_logins` (según la Fase 0).

## Hallazgos del análisis (verificados en el código base)
| Hallazgo | Estado |
|---|---|
| S1 jerarquía de privilegios (sin guardas en roles, bloqueo, restablecimiento, permisos) | Confirmado; pendiente WP4 |
| S2 refresco, S3 (login sin hash para correo inexistente, bloqueo fijo 15 min que invalida sesiones) | Confirmado; pendiente WP4 |
| S4 contraseñas | Confirmado; pendiente WP4 |
| B2 `Program.cs` de 152 líneas mezclado | En resolución (WP2) |
| B3 consultas repetidas por petición | En resolución (WP3) |
| B5 auditoría sin antes/después, listados sin paginar | En resolución (WP3) |
| Resto (T1, F1–F4, D1–D2, G1–G3) | Pendiente |

## Datos para pruebas
Pendiente (WP10).

## Próximo paso
Reescribir contenido de Identity (WP3) y el Host (WP2), luego WP4 y WP5; publicar C2.
