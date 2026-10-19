# Instrucciones para agentes de IA — Pastel

Pastel es una plataforma modular: un shell común, el módulo **Identity** (acceso y permisos) y subaplicaciones independientes: **Brisa, Balance, Ágora, Cosecha, Huella**. Lee solo lo necesario; el contexto es un recurso escaso.

## Tu rol (se te indica en el prompt)
- **Dev:** escribe **solo código de la aplicación**. **No necesita compilar ni ejecutar nada** (su entorno puede no permitirlo) y **no escribe pruebas ni planes de pruebas**; deja los hooks de testabilidad y `MODULE.md`. No certifica su trabajo.
- **Build:** agente **con entorno de compilación**. Compila, corrige errores de compilación y de pruebas **en el código de producto** (sin cambiar el diseño ni el comportamiento especificado), genera migraciones, escribe y ejecuta las pruebas unitarias y de caracterización, e informa con comandos reales. No certifica.
- **QA:** escribe el plan de pruebas desde la ficha, lo ejecuta de forma independiente, automatiza integración y E2E y reporta defectos. **No modifica código de producto.**
- **Investigación:** solo produce documentos. **Mantenimiento:** aplica CCR aprobados.
Dev, Build y QA son sesiones distintas; quien corrige código de producto no certifica ese mismo SHA. Detalle: `docs/TESTING_STRATEGY.md`.

## Ruta de lectura (en orden, y nada más salvo necesidad)
1. Este archivo. 2. Tu módulo: `src/Modules/<M>/MODULE.md` y `web/src/modules/<m>/MODULE.md`, más `docs/modules/<M>.md`. 3. `docs/ARCHITECTURE.md` §2–5. 4. `docs/DESIGN_SYSTEM.md` si tocas UI. 5. `docs/ERROR_HANDLING_AND_LOGGING.md` siempre que escribas endpoints, pantallas o logs. 6. `docs/SECURITY.md` si tocas acceso, permisos o datos personales. 7. `docs/AI_WORKFLOW.md` (ramas, commits).
No leas `Migrations/`, `bin/`, `obj/`, `node_modules/` ni `package-lock.json` salvo necesidad.

## Mapa
`src/Host/Pastel.Host` (composición) · `src/BuildingBlocks/` (SharedKernel, Platform: **protegida**) · `src/Modules/<M>/` (Pastel.Modules.<M> + .Tests) · `web/src/core` y `web/src/app` (**protegidas**) · `web/src/modules/<m>/` · `tests/` · `docs/modules/` (fichas de producto) · `docs/testing/` (planes e informes).

## Zonas de escritura
- **Dev:** tu módulo (backend, frontend, `MODULE.md`), sin pruebas ni planes.
- **Build:** pruebas unitarias (`Pastel.Modules.<M>.Tests`, `*.test.tsx`), `tests/Pastel.IntegrationTests/Foundation/`, `tests/Pastel.ArchitectureTests/`, migraciones, informes en `docs/testing/reports/<M>-BUILD-<fecha>.md` y correcciones mínimas en el código de producto (commits `fix(build): …`).
- **QA:** `tests/Pastel.IntegrationTests/QA/<M>/`, `tests/e2e/<m>/`, `docs/testing/plans/`, `docs/testing/reports/`.
- Protegidas (solo orquestador/mantenimiento): `BuildingBlocks`, `Identity`, `web/src/core`, `web/src/app`, `Directory.*`, `compose.yaml`, `.github/**`, nginx, documentos raíz de `docs/`, dependencias. Necesitas un cambio allí → `docs/requests/CCR-<n>-<tema>.md` y solución local provisional.

## Reglas de arquitectura (CI las verifica)
- Un módulo no referencia el interior de otro; solo `*.Contracts` o `Pastel.Platform`. Tipos `internal`. Un `DbContext` y un esquema por módulo; sin claves foráneas entre esquemas.
- Vertical slices: `Features/<VerboSustantivo>/`. Permisos `<modulo>.<recurso>.<accion>`; cada endpoint con permiso o `AllowAnonymousExplicit()`; denegar por defecto.
- Frontend: un módulo no importa de otro; solo de `@/core/*`. Quitar un módulo = borrar sus carpetas sin romper el resto.

## Errores y logs (obligatorio)
Errores esperables como `Result` → `problem+json` con `code` y `traceId`; sin `ex.Message` al cliente; sin `catch` que traguen errores. Logs con plantillas, sin secretos ni datos personales (ni `code`/`state` de OAuth). Auditoría aparte con antes/después. Frontend: estados de carga, vacío y error en cada pantalla; `core/log`, nunca `console.log`.

## Interfaz (reglas duras)
- **Prohibido el morado** (tono HSL 235°–345°) y los **símbolos de IA** (`Sparkles`, `Stars`, `Wand*`, `Bot`, `Brain*`, `Cpu`, ✨🤖🪄🔮). Marca: `Flower2`.
- **Tailwind:** utilidades en JSX; los patrones compartidos son componentes de `core/ui`; **prohibido `@apply`** fuera de `core/design/base.css`. Color solo por tokens (`bg-accent`…); `data-module` da el color de cada módulo; sin hexadecimales sueltos.
- UX primero: `DESIGN_SYSTEM.md` (heurísticas, WCAG 2.2 AA, móvil primero). Español de Costa Rica, trato de usted o impersonal, **sin voseo**; textos en `strings.ts`.

## Seguridad (no negociable)
Tokens solo en cookies `HttpOnly`, nunca en el navegador. Autorización siempre en el backend. No versionar secretos ni `.env`. No `EnsureCreated`. No registrar datos sensibles. Quien administra no puede escalar privilegios (concede solo lo que tiene).

## Flujo
- Parte de `dev`; rama por tarea: `feat/<m>-<alcance>`, `qa/<m>`, `chore/…`, `docs/…`. Nunca `main`.
- **Nunca abras PR ni integres a `dev`:** entrega rama, SHA y resultados; el propietario revisa y autoriza.
- Commits coherentes y revisables (evita volcados enormes). **El Dev sin entorno de compilación puede publicar código sin compilar y lo declara**; Build y QA no publican código que saben que no compila. Formato con Prettier/`dotnet format` cuando puedas ejecutarlos.
- Informa solo lo que ejecutaste y **declara expresamente lo que no compilaste ni ejecutaste** («sin compilar», «sin ejecutar»); nunca afirmes que algo compila o pasa sin haberlo comprobado. Mantén `MODULE.md` y tu `PROGRESS.md` al día. Si algo contradice estos documentos, confirma el código real y corrige el documento.
