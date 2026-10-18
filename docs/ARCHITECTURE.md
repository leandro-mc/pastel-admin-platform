# Arquitectura de Pastel (v2) — Monolito modular con vertical slices

Reemplaza a la versión por capas (`Domain / Application / Infrastructure / Api`). Esta versión es la decisión final del orquestador y está autorizada por el propietario del producto.

## 1. Decisiones finales

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Monolito modular**: un proceso, una base PostgreSQL, un esquema por módulo | Un despliegue simple en un servidor; fronteras reales entre dominios |
| D2 | **Módulo = un proyecto .NET** con carpetas internas (`Domain/`, `Features/`, `Persistence/`) | Menos proyectos y menos saltos; un cambio toca una sola carpeta |
| D3 | **Vertical slices** dentro de cada módulo (`Features/<VerboSustantivo>/`) | Un agente modifica una funcionalidad sin leer el resto |
| D4 | **Minimal APIs** agrupadas por módulo (`/api/<modulo>/...`) | Menos código ceremonial que controladores; una carpeta por caso de uso |
| D5 | **Módulos descubiertos automáticamente** (atributo de ensamblado + globs de MSBuild) | Agregar o quitar un módulo no edita archivos compartidos |
| D6 | **Frontend: React 19 + Vite + TypeScript + Tailwind 4 + React Router v7 (modo datos)** | Mantiene el stack; añade URLs reales por módulo. Sin SSR (ver 9.1) |
| D7 | **Autenticación con Google (OAuth 2.0 / OIDC, código + PKCE)**, sesión propia en cookies `HttpOnly` | Una sola identidad para todos los módulos; no se tocan los tokens de Google |
| D8 | **Un `DbContext`, un esquema y un historial de migraciones por módulo** | Propiedad de datos explícita; extraíble a otra base |
| D9 | **Compilación por subconjunto de módulos** (`PASTEL_MODULES`) | Desplegar un "Pastel" por proyecto sin reescribir nada |
| D10 | **Tailwind: utilidades en JSX**; patrones compartidos = componentes React; `@apply` solo en `base.css` | Co-ubicación estilo/markup y hojas pequeñas (el análisis de `dev` halló 0 utilidades y 2 209 líneas de CSS) |
| D11 | **Errores y logs estandarizados** (`Result` + `problem+json` + `traceId`; Serilog JSON; auditoría aparte) | Diagnóstico fiable y mensajes humanos en todos los módulos |
| D12 | **Desarrollo y pruebas por agentes distintos** (Dev entrega código y plan; QA ejecuta y reporta) | Verificación independiente; sin autocertificación |

Descartado: microservicios (operación excesiva), Clean Architecture por módulo (ceremonial para módulos CRUD), Next.js/Remix (ver 9.1), capas horizontales (cada cambio toca cuatro proyectos).

## 2. Reglas de frontera (obligatorias; las verifican pruebas de arquitectura)

1. Un módulo **no referencia** el interior de otro. Solo puede usar `Pastel.SharedKernel`, `Pastel.Platform` y, si existe, el `*.Contracts` del otro módulo.
2. Los tipos son `internal` por defecto. Lo público de un módulo vive en su `*.Contracts`.
3. Un esquema por módulo (`identity`, `brisa`, `balance`, `agora`, `cosecha`, `huella`). **Sin claves foráneas ni joins entre esquemas**; se referencia por ID.
4. `Pastel.Platform` y `Pastel.SharedKernel` **no referencian módulos**. `Pastel.Host` no contiene reglas de negocio.
5. Todo permiso empieza con el código del módulo: `cosecha.orders.manage`.
6. Frontend: `web/src/modules/<m>` solo importa de `@/core/*`. `core` y `app` solo conocen los módulos por el manifiesto generado.
7. Quitar un módulo = borrar sus carpetas. El resto debe compilar y pasar sus pruebas.

## 3. Estructura del repositorio

```
pastel/
├── AGENTS.md
├── Directory.Build.props
├── Directory.Packages.props            # versiones NuGet centralizadas
├── global.json
├── Pastel.slnx
├── compose.yaml
├── .github/workflows/ci.yml            # solo uso local/CI; sin despliegue por ahora
├── docs/
│   ├── ARCHITECTURE.md  DESIGN_SYSTEM.md  SECURITY.md  AI_WORKFLOW.md  SPLIT_GUIDE.md
│   ├── ERROR_HANDLING_AND_LOGGING.md  TESTING_STRATEGY.md
│   ├── testing/                        # plantillas, plans/ (los escribe Dev) y reports/ (los escribe QA)
│   ├── adr/                            # decisiones breves (~15 líneas c/u)
│   ├── modules/                        # fichas de producto: HUELLA.md, COSECHA.md, ...
│   └── requests/                       # CCR: solicitudes de cambio a zonas protegidas
├── src/
│   ├── Host/Pastel.Host/               # Program.cs, middleware, Dockerfile
│   ├── BuildingBlocks/
│   │   ├── Pastel.SharedKernel/        # Result<T>, IClock, Paging, Guard (≤ 10 archivos)
│   │   └── Pastel.Platform/            # IPastelModule, ICurrentUser, permisos, auditoría, migrador
│   └── Modules/
│       ├── Identity/   Brisa/   Balance/   Agora/   Cosecha/   Huella/
├── tests/
│   ├── Pastel.ArchitectureTests/       # fronteras, permisos, estructura de módulos
│   ├── Pastel.IntegrationTests/        # Foundation/ (Dev, Fase 0) y QA/<M>/ (QA); PostgreSQL real
│   └── e2e/                            # Playwright (lo escribe QA)
├── tools/new-module/                   # plantilla para crear módulos
├── scripts/                            # check-design.mjs, tailwind-audit.mjs
└── web/
    └── src/
        ├── main.tsx
        ├── app/                        # router, providers, shell, hub, páginas de plataforma
        ├── core/                       # api, auth, ui (kit), design (tokens), i18n, hooks
        └── modules/<modulo>/           # manifest.ts, MODULE.md, routes, features, strings.ts
```

## 4. Anatomía de un módulo

```
src/Modules/Cosecha/
├── MODULE.md                           # ficha técnica (≤ 120 líneas): alcance, permisos, tablas, eventos
├── Pastel.Modules.Cosecha/
│   ├── CosechaModule.cs                # implementa IPastelModule
│   ├── CosechaPermissions.cs           # constantes de permisos
│   ├── Domain/                         # entidades y reglas puras
│   ├── Features/
│   │   ├── CreateOrder/                # Endpoint.cs, Request.cs, Validator.cs, Handler.cs
│   │   └── ListShipments/
│   ├── Persistence/
│   │   ├── CosechaDbContext.cs         # HasDefaultSchema("cosecha")
│   │   ├── Configurations/
│   │   └── Migrations/
│   └── AssemblyInfo.cs                 # [assembly: PastelModule(typeof(CosechaModule))]
├── Pastel.Modules.Cosecha.Tests/       # unitarias + integración del módulo
└── (Pastel.Modules.Cosecha.Contracts/) # solo si otro módulo necesita algo de este
```

### Contrato de módulo (`Pastel.Platform`)

```csharp
public interface IPastelModule
{
    string Code { get; }                              // "cosecha": carpeta = esquema = ruta = prefijo de permisos
    string Name { get; }
    int Order { get; }                                // orden de arranque y migración (Identity = 0)
    IReadOnlyList<PermissionGroup> Permissions { get; }   // grupos de permisos y permisos
    IReadOnlyList<SuggestedRole> SuggestedRoles { get; }  // roles iniciales con sus permisos
    void ConfigureServices(IServiceCollection services, IConfiguration configuration);
    void MapEndpoints(IEndpointRouteBuilder api);     // recibe el grupo /api/<code>
    Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken);
}
```

- **Descubrimiento:** `Pastel.Host` referencia por *glob* de MSBuild los proyectos `src/Modules/*/Pastel.Modules.*.csproj` (excluyendo `.Tests` y `.Contracts`), filtrados por `PastelModules` (por defecto todos; `Identity` siempre). Al arrancar carga los ensamblados `Pastel.Modules.*.dll` y lee `[assembly: PastelModule(...)]`. Agregar un módulo no edita `Program.cs`.
- **Permisos y roles:** al arrancar, el catálogo declarado por cada módulo se sincroniza de forma idempotente en las tablas de Identity (`Modules`, `Permissions`). Los `SuggestedRoles` se crean solo si no existen; **nunca** se sobrescribe lo que un administrador haya editado. El rol `Administrator` recibe todos los permisos.
- **Acceso al módulo:** cada módulo privado declara `<code>.access`; el hub y el router lo usan para mostrar u ocultar el módulo. Los módulos con partes públicas marcan esos endpoints con `.AllowAnonymous()` de forma explícita.
- **Abstracciones transversales (en `Pastel.Platform`, implementadas por Identity):** `ICurrentUser` (id, nombre, `HasPermission`), `IPermissionEvaluator` (permisos efectivos con caché por petición), `IAuditTrail` (escritura de auditoría con el módulo de origen).

## 5. Datos y migraciones

- Una sola instancia PostgreSQL; esquemas `identity`, `brisa`, `balance`, `agora`, `cosecha`, `huella`.
- Cada `DbContext`: `HasDefaultSchema("<code>")` y `MigrationsHistoryTable("__EFMigrationsHistory", "<code>")`. Migraciones dentro del proyecto del módulo:
  `dotnet ef migrations add Nombre --project src/Modules/<M>/Pastel.Modules.<M> --startup-project src/Host/Pastel.Host --context <M>DbContext`
- El host migra en el orden de `IPastelModule.Order`. Se conserva `Database:ApplyMigrationsAtStartup` (con un solo nodo es correcto; con réplicas habría que pasar a un trabajo de migración aparte).
- Identificadores: `Guid` v7 generados en el cliente o servidor (permite crear offline y sincronizar). Fechas en UTC (`timestamptz`). Dinero en `numeric(18,2)` con moneda explícita.
- Datos con vocación de sincronización móvil (Brisa): `UpdatedAt`, borrado lógico (`DeletedAt`) y token de concurrencia en cada entidad editable.

## 6. Comunicación entre módulos

- **Síncrona:** interfaz en el `Contracts` del módulo proveedor, inyectada por DI. Se crea el `Contracts` solo cuando un segundo módulo lo necesita.
- **Asíncrona (futura):** eventos con outbox transaccional en el esquema del emisor. No se implementa hasta que exista el primer caso real (p. ej. Cosecha → Messaging).
- Nunca consultas a tablas de otro esquema.

## 7. Convenciones de API

- Rutas: `/api/<modulo>/<recurso>`. Plataforma: `/api/auth/*`, `/api/admin/*`.
- Errores: `application/problem+json` con `title`, `detail` (en español, accionable) y, para validaciones, `errors` por campo. Sin filtrar excepciones internas.
- Listas: paginación (`page`, `pageSize`, máximo 100) y orden explícito.
- Escrituras que puedan repetirse (móvil/offline) aceptan un identificador de cliente y son idempotentes.
- Cada endpoint tiene permiso o `.AllowAnonymous()` explícito; las rutas públicas llevan límite de tasa.
- Zona horaria de presentación: `America/Costa_Rica`. Formatos `es-CR` (ver `DESIGN_SYSTEM.md`).

## 8. Seguridad y autenticación (resumen; detalle en `SECURITY.md`)

- Inicio de sesión principal: **Google (OAuth 2.0 / OIDC con código + PKCE)** gestionado por el backend. Solo se usan los ámbitos `openid email profile`; no se guardan tokens de Google.
- La sesión sigue siendo propia: JWT de acceso y refresh con rotación en cookies `HttpOnly; Secure; SameSite=Strict`, más CSRF de doble envío. No cambia.
- La cuenta local con contraseña se conserva para el administrador de arranque y cuentas creadas por administración; el autorregistro con contraseña queda desactivado por defecto.
- Autorización siempre en el backend (denegar por defecto). El frontend solo adapta la navegación.
- **Jerarquía de privilegios:** quien administra solo concede lo que posee y no actúa sobre cuentas Administrator ni sobre sí mismo salvo que sea Administrator (detalle en `docs/phase0/FASE-0-REFACTOR-BASE.md` WP4 y `SECURITY.md`).

## 9. Frontend

### 9.1 Decisión de framework
Se mantiene **React + Vite** y se añade **React Router v7 en modo datos** (`createBrowserRouter`, rutas con carga diferida por módulo). No se adopta Next.js/Remix porque:
- Añadiría un servidor Node en producción y complica "un módulo por despliegue".
- El 90 % de la aplicación es privada y no necesita SSR.
- Las únicas páginas con valor de SEO/vista previa son públicas y acotadas (perfil de Huella, contenido de Ágora): se resuelven en su módulo con metadatos inyectados por el servidor o prerenderizado, sin cambiar el framework.
- React Router v7 permite subir a modo framework más adelante sin reescribir las rutas.

Bibliotecas aprobadas (instaladas por Fase 0; cualquier otra requiere CCR): `react-router`, `@tanstack/react-query` (estado del servidor), `react-hook-form` + `zod` + `@hookform/resolvers` (formularios), `react-aria-components` (primitivas accesibles; verificar versión vigente antes de instalar), `react-markdown` + `rehype-sanitize` + `remark-gfm` (contenido), `@fontsource-variable/inter`, `lucide-react`, para estilos `class-variance-authority`, `clsx`, `tailwind-merge` y `prettier-plugin-tailwindcss`, y para pruebas `vitest`, `@testing-library/react`, `@testing-library/user-event`, `vitest-axe`, `@playwright/test` y `@axe-core/playwright` (E2E, los usa QA). Backend: `Serilog.AspNetCore` y, para pruebas, `Testcontainers.PostgreSql` y `NetArchTest.Rules`.

### 9.2 URLs

| Ruta | Contenido |
|---|---|
| `/` | Hub: módulos accesibles (anónimo: inicio público y módulos públicos) |
| `/ingresar` | Inicio de sesión (Google y, opcionalmente, correo y contraseña) |
| `/cuenta` | Mi cuenta: perfil, seguridad, preferencias |
| `/configuracion/*` | Administración (usuarios, roles, módulos, auditoría) — módulo Identity |
| `/brisa/*`, `/balance/*`, `/agora/*`, `/cosecha/*`, `/huella/*` | Cada subaplicación |

Los segmentos raíz de plataforma y de módulos son **palabras reservadas** (no pueden usarse como `slug` públicos).

### 9.3 Manifiesto y descubrimiento

```ts
// web/src/modules/cosecha/manifest.ts
export default {
  code: "cosecha",
  name: "Cosecha",
  tagline: "De la finca al comprador",
  icon: Sprout,
  basePath: "/cosecha",
  access: "permission",                 // "public" | "authenticated" | "permission"
  requiredPermission: "cosecha.access",
  nav: [{ label: "Hoy", to: "", icon: CalendarDays }, ...],
  routes: [{ index: true, lazy: () => import("./pages/TodayPage") }, ...],
} satisfies ModuleManifest;
```

Un plugin de Vite genera el módulo virtual `virtual:pastel-modules` recorriendo `src/modules/*/manifest.ts` y filtrando por `PASTEL_MODULES`. El shell nunca importa un módulo directamente. Con un solo módulo habilitado, `/` redirige a ese módulo y el shell adopta su marca.

### 9.4 Estructura de un módulo web

```
web/src/modules/cosecha/
├── MODULE.md  manifest.ts  strings.ts
├── api/            # funciones y claves de TanStack Query
├── pages/          # una página por ruta (finas)
├── features/<x>/   # componentes y hooks por funcionalidad
└── components/     # solo lo reutilizado dentro del módulo
```

Reglas: páginas finas, estado del servidor en TanStack Query, formularios con react-hook-form + zod, textos en `strings.ts`, archivos de ≤ ~200 líneas.

### 9.5 Estilos con Tailwind (regla única)
- **Utilidades en el JSX.** Lo compartido son **componentes** de `core/ui` con variantes (`cva` + `cn()`), no clases semánticas con `@apply`.
- Tokens en `core/design/tokens.css` y expuestos con `@theme inline` (`bg-surface`, `text-fg`, `bg-accent`, `text-accent-strong`…). `data-module` cambia las variables, así que `bg-accent` ya es el color del módulo; `dark:` solo cuando sea imprescindible.
- `@apply` únicamente en `core/design/base.css` (reseteos, Markdown, selectores complejos): máximo 60 líneas. Ningún CSS por módulo; ningún archivo CSS de más de 400 líneas.
- `scripts/tailwind-audit.mjs` mide y el CI vigila estas metas. Orden de clases con `prettier-plugin-tailwindcss`.

## 10. Despliegue por subconjunto de módulos

`PASTEL_MODULES=cosecha` (también `Identity` implícito) controla **backend** (qué proyectos referencia el Host) y **frontend** (qué manifiestos entran al bundle). Con eso, un despliegue contiene Identity + un solo módulo, con su propia base de datos. La guía de separación vive en `docs/SPLIT_GUIDE.md` y CI comprueba cada módulo de forma aislada (borrando los demás). El despliegue en servidor y CI/CD **no** forman parte de esta etapa.

## 11. Pruebas y guardas automáticas

| Nivel | Qué verifica | Herramienta |
|---|---|---|
| Unitarias | Reglas de dominio y casos de uso | xUnit |
| Integración por módulo | Endpoints + PostgreSQL real | `WebApplicationFactory` + Testcontainers |
| Arquitectura | Fronteras, `internal`, prefijos de permiso, que cada módulo tenga `MODULE.md` | NetArchTest o ArchUnitNET |
| Frontend | Componentes, flujos y accesibilidad (axe) | Vitest + Testing Library + `vitest-axe` |
| Diseño | Sin morado, sin iconos/símbolos de IA, sin colores sueltos | `scripts/check-design.mjs` + ESLint |
| Aislamiento | Cada módulo compila y pasa pruebas solo | Matriz de CI que borra los demás módulos |
| Integración independiente y E2E | Flujos por rol, permisos, aislamiento de datos, errores, logs, accesibilidad | Pruebas de QA (Playwright, `WebApplicationFactory` + PostgreSQL) |

## 12. Eficiencia con agentes

- `AGENTS.md` raíz ≤ 80 líneas; `MODULE.md` por módulo ≤ 120 líneas (backend y frontend).
- Una funcionalidad = una carpeta; archivos pequeños; nombres previsibles.
- Zonas de escritura exclusivas por agente; cambios a zonas protegidas mediante CCR.
- Comandos con alcance de módulo: `dotnet test src/Modules/<M>`, `npm test -- src/modules/<m>`.
- Las fronteras las impone el compilador y CI, no instrucciones en prosa.

## 13. Cómo agregar un módulo (checklist)

1. `tools/new-module` con el código (genera backend, pruebas, frontend, `MODULE.md`, esquema y migración vacía).
2. Ficha de producto en `docs/modules/<MODULO>.md` (alcance, roles, reglas).
3. Declarar permisos y roles sugeridos en `<M>Module.cs`.
4. Color y tokens del módulo en `web/src/core/design/module-themes.css` (CCR si es nuevo).
5. Implementar por slices; pruebas unitarias e integración.
6. Completar `MODULE.md` (backend y frontend).
7. Verificar: guardas de arquitectura y diseño, compilación aislada del módulo.

## 14. Errores y logs

Estándar único en `docs/ERROR_HANDLING_AND_LOGGING.md`. Resumen: los fallos esperables son `Result` y se traducen en un solo lugar a `application/problem+json` con `code` estable y `traceId`; nunca se devuelve `ex.Message`; los errores técnicos (único, concurrencia, serialización) tienen traducción y reintento definidos; los logs son JSON estructurado (Serilog), sin secretos ni datos personales; la **auditoría** (quién, qué, antes→después) es independiente del log técnico; `/health/ready` comprueba base de datos y migraciones.

## 15. Desarrollo y pruebas separados

Estándar en `docs/TESTING_STRATEGY.md`. Dev implementa, escribe pruebas unitarias de su dominio y un **plan de pruebas**; **otro agente (QA)** lo ejecuta en caja negra primero, luego caja gris, automatiza regresión en su propia zona (`tests/.../QA`, `tests/e2e`) y emite un informe. Un módulo o fase solo se integra a `dev` con el informe QA del SHA final aprobado y la autorización del propietario.

## 16. Decisiones registradas

Cada decisión de esta página se archiva como ADR breve en `docs/adr/` (0001 monolito modular, 0002 stack y router, 0003 Google OAuth, 0004 esquemas y migraciones por módulo, 0005 paleta y tokens, 0006 compilación por subconjunto, 0007 Tailwind, 0008 errores y logs).
