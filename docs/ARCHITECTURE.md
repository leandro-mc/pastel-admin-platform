# Arquitectura de Pastel (v2) — Monolito modular con vertical slices

Reemplaza a la versión por capas (`Domain / Application / Infrastructure / Api`) y es la arquitectura vigente, autorizada por el propietario del producto.

## 1. Decisiones (resumen)

Monolito modular: un proceso, una base PostgreSQL y un esquema por módulo; **módulo = un proyecto .NET** (`Domain/`, `Features/`, `Persistence/`) con *vertical slices* y Minimal APIs (`/api/<modulo>/...`), descubierto automáticamente; un `DbContext` y un historial de migraciones por módulo; compilación por subconjunto (`PASTEL_MODULES`); frontend React 19 + Vite + TypeScript + Tailwind 4 + React Router v7 (modo datos), sin SSR; sesión propia en cookies con Google como proveedor. El motivo de cada decisión y las alternativas descartadas están en `docs/DECISIONS.md`.

## 2. Reglas de frontera (obligatorias; las verifican pruebas de arquitectura)

1. Un módulo **no referencia** el interior de otro. Solo puede usar `Pastel.SharedKernel`, `Pastel.Platform`, `Pastel.Documents` (motor documental) y, si existe, el `*.Contracts` del otro módulo.
2. Los tipos son `internal` por defecto. Lo público de un módulo vive en su `*.Contracts`.
3. Un esquema por módulo (`identity`, `brisa`, `balance`, `agora`, `cosecha`, `huella`). **Sin claves foráneas ni joins entre esquemas**; se referencia por ID.
4. `Pastel.Platform`, `Pastel.SharedKernel` y `Pastel.Documents` **no referencian módulos**. `Pastel.Host` no contiene reglas de negocio.
5. Todo permiso funcional de una aplicación empieza con el código del módulo: `cosecha.orders.manage`. Identity puede declarar permisos transversales de plataforma bajo el grupo `platform` y el prefijo `platform.*`; esos permisos son reservados y no se conceden desde la administración de roles de una aplicación.
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
├── .github/workflows/ci.yml            # CI manual/por aprobación de PR hacia dev (ver GIT_WORKFLOW.md)
├── docs/
│   ├── ARCHITECTURE.md  SECURITY.md  DESIGN_SYSTEM.md  ERROR_HANDLING_AND_LOGGING.md
│   ├── PROGRESS.md  GIT_WORKFLOW.md  TESTING.md  OPERATIONS.md  DECISIONS.md
│   ├── product/                        # visión de producto y modelo de aplicaciones
│   └── modules/                        # fichas de producto: HUELLA.md, COSECHA.md, ...
├── src/
│   ├── Host/Pastel.Host/               # Program.cs, middleware, Dockerfile
│   ├── BuildingBlocks/
│   │   ├── Pastel.SharedKernel/        # Result<T>, IClock, Paging, Guard (≤ 10 archivos)
│   │   ├── Pastel.Platform/            # IPastelModule, ICurrentUser, permisos, auditoría, migrador
│   │   └── Pastel.Documents/           # CCR-2: IDocumentRenderer (Typst como proceso acotado) y fuentes autoalojadas
│   └── Modules/
│       ├── Identity/   Brisa/   Balance/   Agora/   Cosecha/   Huella/
├── tests/
│   ├── Pastel.ArchitectureTests/       # fronteras, permisos, estructura de módulos
│   ├── Pastel.IntegrationTests/        # Foundation/ (Build, Fase 0) y QA/<M>/ (QA); PostgreSQL real
│   └── e2e/                            # Playwright (smoke de /ingresar; ampliación en la Etapa 2)
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
- **Permisos y roles:** al arrancar, el catálogo declarado por cada módulo se sincroniza de forma idempotente en las tablas de Identity (`Modules`, `Permissions`). Los `SuggestedRoles` se crean solo si no existen; **nunca** se sobrescribe lo que un administrador haya editado. El rol `Administrator` recibe solo los permisos generales (panel, `settings.*`, Workspace y modo desarrollador); `Owner/Superuser` recibe todos. Si el producto reserva los permisos de un módulo al propietario, el módulo lo declara con `PermissionGroup.GrantPolicy` (`OwnerGrantsOnly` u `OwnerAccountOnly`) y Identity lo aplica sin nombrar módulos (`SECURITY.md`).
- **Acceso al módulo:** cada módulo privado declara `<code>.access`; el hub y el router lo usan para mostrar u ocultar el módulo. Los módulos con partes públicas marcan esos endpoints con `.AllowAnonymous()` de forma explícita.
- **Abstracciones transversales (en `Pastel.Platform`, implementadas por Identity):** `ICurrentUser` (id, nombre, `HasPermission`), `IPermissionEvaluator` (permisos efectivos con caché por petición), `IAuditTrail` (escritura de auditoría con el módulo de origen).

## 5. Datos y migraciones

- Una sola instancia PostgreSQL; esquemas `identity`, `brisa`, `balance`, `agora`, `cosecha`, `huella`.
- Cada `DbContext`: `HasDefaultSchema("<code>")` y `MigrationsHistoryTable("__EFMigrationsHistory", "<code>")`. Migraciones dentro del proyecto del módulo:
  `dotnet ef migrations add Nombre --project src/Modules/<M>/Pastel.Modules.<M> --startup-project src/Host/Pastel.Host --context <M>DbContext`
- El host migra en el orden de `IPastelModule.Order`. Se conserva `Database:ApplyMigrationsAtStartup` (con un solo nodo es correcto; con réplicas habría que pasar a un trabajo de migración aparte).
- Identificadores: las claves de entidad son `Guid` v7 que asigna el servidor con `Guid.CreateVersion7()` en la propiedad `Id` de la entidad (el orden por tiempo mantiene compactos los índices de PostgreSQL). Lo secreto o impredecible (refresh tokens, token CSRF, contraseñas temporales con `RandomNumberGenerator`; el `jti` del JWT con `Guid.NewGuid()`) no es una clave y sigue siendo aleatorio. Un v7 deja ver su fecha de creación: nunca se usa como secreto ni como credencial, y la autorización no depende de que un identificador sea inadivinable.
- Identificadores desde el cliente: **hoy no existen**; ningún endpoint acepta un `Id` propuesto por el cliente ni hay generador de GUID en el frontend. Si un módulo lo necesita (p. ej. Brisa al sincronizar sin conexión), lo diseña y documenta en su `MODULE.md` o en `DECISIONS.md`.
- Fechas en UTC (`timestamptz`). Dinero en `numeric(18,2)` con moneda explícita.
- Datos con vocación de sincronización móvil (Brisa): `UpdatedAt`, borrado lógico (`DeletedAt`) y token de concurrencia en cada entidad editable.

## 6. Comunicación entre módulos

- **Síncrona:** interfaz en el `Contracts` del módulo proveedor, inyectada por DI. Se crea el `Contracts` solo cuando un segundo módulo lo necesita.
- **Asíncrona (futura):** eventos con outbox transaccional en el esquema del emisor. No se implementa hasta que exista el primer caso real (p. ej. Cosecha → Messaging).
- Nunca consultas a tablas de otro esquema.

## 7. Convenciones de API

- Rutas: `/api/<modulo>/<recurso>`. Plataforma: `/api/auth/*`, `/api/admin/*`.
- Errores: `application/problem+json` con `title`, `detail` (en español, accionable) y, para validaciones, `errors` por campo. Sin filtrar excepciones internas.
- Listas: paginación (`page`, `pageSize`, máximo 100) y orden explícito.
- Escrituras que puedan repetirse (móvil/offline): criterio de diseño para cuando un módulo las necesite (identificador de cliente e idempotencia). Hoy ningún endpoint lo implementa; ver §5.
- Cada endpoint tiene permiso o `.AllowAnonymous()` explícito; las rutas públicas llevan límite de tasa.
- Zona horaria de presentación: `America/Costa_Rica`. Formatos `es-CR` (ver `DESIGN_SYSTEM.md`).

## 8. Seguridad y autenticación

Fuente única: `docs/SECURITY.md`. En la arquitectura solo importa que la autorización se resuelve siempre en el backend (denegar por defecto) y que el frontend solo adapta la navegación.

## 9. Frontend

### 9.1 Decisión de framework
Se mantiene **React + Vite** y se añade **React Router v7 en modo datos** (`createBrowserRouter`, rutas con carga diferida por módulo). No se adopta Next.js/Remix porque:
- Añadiría un servidor Node en producción y complica "un módulo por despliegue".
- El 90 % de la aplicación es privada y no necesita SSR.
- Las únicas páginas con valor de SEO/vista previa son públicas y acotadas (perfil de Huella, contenido de Ágora): se resuelven en su módulo con metadatos inyectados por el servidor o prerenderizado, sin cambiar el framework.
- React Router v7 permite subir a modo framework más adelante sin reescribir las rutas.

Bibliotecas aprobadas (instaladas por Fase 0; cualquier otra requiere autorización del propietario): `react-router`, `@tanstack/react-query` (estado del servidor), `react-hook-form` + `zod` + `@hookform/resolvers` (formularios), `react-aria-components` (primitivas accesibles; verificar versión vigente antes de instalar), `react-markdown` + `rehype-sanitize` + `remark-gfm` (contenido), `@fontsource-variable/inter`, `lucide-react`, para estilos `class-variance-authority`, `clsx`, `tailwind-merge` y `prettier-plugin-tailwindcss`, y para pruebas `vitest`, `@testing-library/react`, `@testing-library/user-event`, `vitest-axe`, `@playwright/test` y `@axe-core/playwright` (E2E, los usa QA). Backend: `Serilog.AspNetCore` y, para pruebas, `Testcontainers.PostgreSql` y `NetArchTest.Rules`.

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
  nav: [{ label: "Hoy", to: "", icon: CalendarDays }, ...],   // opcionales por ítem: requiredPermission, alsoActiveOn, group
  routes: [{ index: true, lazy: () => import("./pages/TodayPage") }, ...],
} satisfies ModuleManifest;
```

Un plugin de Vite genera el módulo virtual `virtual:pastel-modules` recorriendo `src/modules/*/manifest.ts` y filtrando por `PASTEL_MODULES`. El shell nunca importa un módulo directamente. Con un solo módulo habilitado, `/` redirige a ese módulo y el shell adopta su marca.

**Shell y vista previa por rol.** `web/src/app/shell` dibuja el marco común (sidebar, barra superior, barra inferior en móvil) leyendo el manifiesto y los tokens de la app (`data-module`); no inspecciona el interior de un módulo (las pantallas de detalle se declaran con `alsoActiveOn`). `RootLayout` envuelve todas las rutas con `core/devmode`, que, solo para cuentas con `platform.developer.mode`, sustituye por `useAuth()` los permisos de la app activa para dibujar la interfaz como la vería otro rol. Los módulos no importan `core/devmode`; la autorización sigue en el servidor. Reglas: `DESIGN_SYSTEM.md` §9 y `SECURITY.md`.

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

Utilidades en el JSX, componentes de `core/ui` para lo compartido y tokens en `core/design`. Regla completa: `docs/DESIGN_SYSTEM.md` §7.

## 10. Despliegue por subconjunto de módulos

`PASTEL_MODULES=cosecha` (también `Identity` implícito) controla **backend** (qué proyectos referencia el Host) y **frontend** (qué manifiestos entran al bundle). Con eso, un despliegue contiene Identity + un solo módulo, con su propia base de datos. La guía de separación vive en `docs/OPERATIONS.md` y CI comprueba cada módulo de forma aislada (borrando los demás). El despliegue en servidor y CI/CD **no** forman parte de esta etapa.

## 11. Pruebas y guardas automáticas

Qué existe, política y comandos: `docs/TESTING.md`. Las fronteras de esta página las imponen el compilador, las pruebas de arquitectura (`tests/Pastel.ArchitectureTests`) y `scripts/check-module-boundaries.mjs`, no instrucciones en prosa.

## 12. Trabajo con agentes

Proceso, zonas compartidas, commits y CI: `AGENTS.md`. Comandos con alcance de módulo: `dotnet test src/Modules/<M>` y `npm test -- src/modules/<m>`.

## 13. Cómo agregar un módulo (checklist)

1. `tools/new-module` con el código (genera backend, pruebas, frontend, `MODULE.md`, esquema y migración vacía).
2. Ficha de producto en `docs/modules/<MODULO>.md` (alcance, roles, reglas).
3. Declarar permisos y roles sugeridos en `<M>Module.cs`.
4. Tokens del módulo en `web/src/core/design/module-themes.css` cuando su identidad visual esté definida (hoy provisionales). El módulo puede definir paleta, neutros y tono propios en su ficha: prevalecen sobre las guías generales de diseño del frontend (`docs/DESIGN_SYSTEM.md`, «Jerarquía de reglas»); lo demás sigue las reglas generales.
5. Implementar por slices con las pruebas esenciales (`docs/TESTING.md`).
6. Completar `MODULE.md` (backend y frontend).
7. Verificar (Etapa 1): guardas de arquitectura y de diseño. La compilación aislada del módulo (`PASTEL_MODULES`) se hace con `ci:completo` o antes de desplegar.

## 14. Errores y logs

Fuente única: `docs/ERROR_HANDLING_AND_LOGGING.md`.

## 15. Pruebas

Fuente única: `docs/TESTING.md`.

## 16. Decisiones registradas

Fuente única: `docs/DECISIONS.md`.
