# Instrucciones para agentes de IA — Pastel

Pastel es una plataforma modular: un shell común, el módulo **Identity** (acceso y permisos) y subaplicaciones independientes: **Brisa, Balance, Ágora, Cosecha, Huella**. Lee solo lo necesario; el contexto es un recurso escaso.

## Tu rol (se te indica en el prompt)
- **Dev:** implementa el código de aplicación y deja hooks de testabilidad y `MODULE.md`; no escribe pruebas ni planes. **Si su entorno permite compilar/probar, debe hacerlo y reportar los comandos y resultados reales. Si no lo permite, puede publicar código sin compilar**, siempre que lo declare explícitamente en `PROGRESS.md` y en la entrega; no simula resultados ni afirma que compila.
- **Build:** responsabilidad de compilar, corregir errores de build/pruebas en código de producto sin cambiar el comportamiento acordado, generar migraciones, escribir y ejecutar pruebas unitarias/caracterización e informar comandos reales. Se realiza por un agente con entorno de compilación.
- **QA:** escribe el plan desde la ficha, ejecuta build y pruebas funcionales, permisos, integración y E2E en un entorno que **sí debe permitir compilar y ejecutar**; reporta defectos y resultados.
- **Build y QA pueden combinarse en una misma sesión/agente** para ahorrar sesiones. Si se combinan, se deben completar ambas listas de responsabilidades, registrar qué se ejecutó y volver a ejecutar las validaciones afectadas tras cada corrección. La separación independiente es preferible cuando haya capacidad, pero no es obligatoria en esta etapa.
- **Investigación:** solo produce documentos. **Mantenimiento:** aplica CCR aprobados.
Detalle: `docs/TESTING_STRATEGY.md`.

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
- UX primero: `DESIGN_SYSTEM.md` (heurísticas, WCAG 2.2 AA, móvil primero). Español de Costa Rica, trato de usted o impersonal como regla general, **sin voseo ni tuteo salvo que la ficha o las instrucciones específicas del módulo lo permitan o lo soliciten expresamente**. Textos en `strings.ts`.

## Jerarquía de reglas
Cada módulo (subproyecto) puede tener sus propias reglas de **diseño del frontend** (tono y textos, paleta y tokens, patrones de interfaz) en su ficha `docs/modules/<M>.md` o su `MODULE.md`, y **prevalecen sobre las generales de diseño** de este archivo y de `DESIGN_SYSTEM.md`, que solo aplican en lo que el módulo no regula. **Esto vale únicamente para el diseño del frontend:** arquitectura, backend, seguridad, errores y logs, flujo de trabajo y pruebas se rigen siempre por las reglas generales. Tampoco se relajan WCAG 2.2 AA ni las prohibiciones de `DESIGN_SYSTEM.md` §2.4 (morado, símbolos de IA). Las excepciones se escriben en la ficha del módulo y valen solo para él (ejemplo: Brisa).

## Seguridad (no negociable)
Tokens solo en cookies `HttpOnly`, nunca en el navegador. Autorización siempre en el backend. No versionar secretos ni `.env`. No `EnsureCreated`. No registrar datos sensibles. Quien administra no puede escalar privilegios (concede solo lo que tiene).

## Flujo
- Parte de `dev`; rama por tarea: `feat/<m>-<alcance>`, `qa/<m>`, `chore/…`, `docs/…`. Nunca `main`.
- **Nunca abras PR ni integres a `dev` sin autorización explícita del propietario.** Cuando el propietario lo autorice, sí puedes abrir un único PR para la tarea y, si también autoriza expresamente la integración, completar el merge siguiendo `docs/AI_WORKFLOW.md`.
- Commits coherentes y revisables (evita volcados enormes). **El Dev sin entorno de compilación puede publicar código sin compilar y lo declara**; Build y QA no publican código que saben que no compila. Formato con Prettier/`dotnet format` cuando puedas ejecutarlos.
- Informa solo lo que ejecutaste y **declara expresamente lo que no compilaste ni ejecutaste** («sin compilar», «sin ejecutar»); nunca afirmes que algo compila o pasa sin haberlo comprobado. Mantén `MODULE.md` y tu `PROGRESS.md` al día. Si algo contradice estos documentos, confirma el código real y corrige el documento.
