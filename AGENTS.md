# AGENTS.md — Reglas operativas de Pastel

Pastel es un monolito modular (.NET 10 + React 19) con un módulo por aplicación. Este archivo es la **única fuente de reglas** para todos los agentes; el resto de `docs/` describe el sistema, no el proceso. Léelo completo antes de empezar.

## 1. Ruta de lectura (en este orden, solo lo que toque tu tarea)
1. `README.md` (qué es y cómo se ejecuta) y este archivo.
2. `docs/PROGRESS.md`: estado actual, pendientes y backlog. Es el único estado vigente.
3. `docs/ARCHITECTURE.md` y, según el área, `docs/SECURITY.md`, `docs/DESIGN_SYSTEM.md`, `docs/ERROR_HANDLING_AND_LOGGING.md`.
4. Tu módulo: `docs/modules/<MODULO>.md` y los `MODULE.md` de `src/Modules/<M>/` y `web/src/modules/<m>/`.
5. `docs/GIT_WORKFLOW.md` (commits, ramas, PR, CI) y `docs/TESTING.md` (qué probar y cómo). `docs/DECISIONS.md` solo si necesitas el porqué de una decisión.

Contrasta siempre la documentación con el código vigente; si discrepan, gana el código y corriges el documento.

## 2. Roles
- **Dev:** implementa en el área de su módulo (backend y frontend). Compila y prueba lo esencial si su entorno lo permite; si no, lo declara.
- **Build/QA (combinado):** tiene Docker/.NET; compila, corrige, escribe las pocas pruebas esenciales, ejecuta y reporta con evidencia real. Cuando no puede ejecutar algo, el propietario corre los comandos en PowerShell y devuelve la salida; se itera hasta que quede aprobado.
- **Investigación/Documentación:** produce documentos o prototipos; no toca código de producto.
Todos los agentes trabajan igual: **commits lógicos por unidad de trabajo** (sección 4). No existen tipos de agente por cadencia de commits.

## 3. Flujo
1. Una rama corta por tarea (`feat/`, `fix/`, `docs/`, `chore/`), creada desde `dev`. **Un agente por rama.**
2. Trabaja y valida en local; haz commit **cuando la unidad esté completa**.
3. Entrega: PR hacia `dev` con resumen, validación realizada y lo no verificado.
4. El propietario aprueba; **el CI básico corre al aprobar** (sección 6) y el propietario integra. Nadie integra en `dev` ni `main` ni abre/fusiona PR sin autorización expresa; `main` solo por promoción del propietario.
5. Para la fase actual la rama de trabajo es la que indique el propietario (hoy `refactor/modular-foundation`).

## 4. Commits (resumen; reglas completas y motivos en `docs/GIT_WORKFLOW.md`)
- **Un commit = una unidad completa y coherente** (funcionalidad, arreglo con su prueba, cambio de documentación) que un revisor entienda y pueda revertir sola. Código, prueba y documentación de esa unidad van **juntos**.
- **Prohibido** commitear por tiempo, por archivo, como punto de control o para «registrar avance». Prohibidos mensajes como `wip`, `checkpoint`, `record`, `docs: registrar…` aislados.
- Tus propios arreglos no publicados se integran en su commit (`--amend` o rebase interactivo local) **antes** de empujar. Sin cadenas `fix`/`fix`/`fix`.
- Valida antes de commitear. Si algo no pudo verificarse, se declara **una vez** en el cuerpo del commit y en `docs/PROGRESS.md`.
- Mensaje: `tipo(ámbito): resumen en imperativo` ≤ 72 caracteres, en español; cuerpo con qué, por qué y cómo se verificó. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style` (solo formato masivo, aislado).
- Usa `git` local para commits de varios archivos. Una herramienta que solo crea commits de un archivo (API de contenidos) **no se usa** para trabajo multi-archivo.
- Sincroniza con `git pull --rebase`; no hagas merges de sincronización. No reescribas historia compartida sin autorización del propietario.

## 5. Pruebas: solo lo esencial
- Se escriben **solo pruebas fundamentales** (seguridad, autorización, integridad y concurrencia de datos críticos, ciclo de sesión, contrato de errores, ausencia de secretos en logs, compilación/formato/auditoría). Nada exhaustivo, ni una prueba por cada caso, ni permutaciones cosméticas.
- Antes de escribir una prueba responde: ¿qué defecto concreto detecta?, ¿por qué no lo cubre ya otra? Sin respuesta, no se escribe.
- Lo no esencial se anota como **diferido** en `docs/PROGRESS.md` para la siguiente planificación de pruebas. Ver `docs/TESTING.md`.
- Nada se declara aprobado sin evidencia de ejecución real; lo no ejecutado se marca «por verificar». Cero fallos y cero omitidas.

## 6. CI en GitHub (minutos limitados)
- **Nunca** corre por commit, push ni por abrir/actualizar un PR. Solo al **aprobar un PR hacia `dev`** (revisión aprobada, o etiqueta `ci:basico`) y a mano (`workflow_dispatch`).
- **Solo lo básico** (backend: formato, build y pruebas unitarias; frontend: formato, lint, build y pruebas de componentes). Los trabajos pesados (PostgreSQL, contenedores, aislamiento por módulo, CodeQL) corren únicamente si el propietario lo indica (etiqueta `ci:completo` o ejecución manual con alcance «completo»).
- No se despacha CI manual durante la depuración. Detalle en `docs/GIT_WORKFLOW.md`.

## 7. Diseño
- **Reglas duras:** no usar morado ni sus derivados, ni lo habitual del diseño generado por IA (colores, elementos, iconos de destellos/robot/varita, emojis como adorno, símbolos de IA). `scripts/check-design.mjs` verifica morado, iconos y emojis de IA y colores literales fuera de los archivos de tokens.
- La **identidad visual de cada aplicación (paletas, acentos, tipografía propia) no está definida**: se determinará con la investigación y los prototipos en curso. No inventes ni fijes paletas por módulo; no hay restricciones de color por subapp más allá de las reglas duras. Ver `docs/DESIGN_SYSTEM.md`.
- Accesibilidad (WCAG AA), textos en `strings.ts`, español de Costa Rica con trato de usted por defecto; el voseo se permite cuando el propietario lo pida.

## 8. Arquitectura y seguridad (límites que no se cruzan)
- Módulo = un proyecto .NET; un esquema y un historial de migraciones por módulo; sin claves foráneas ni joins entre esquemas. Un módulo no referencia el interior de otro; `web/src/modules/<m>` solo importa de `@/core/*`. Detalle y pruebas de arquitectura en `docs/ARCHITECTURE.md`.
- Autorización siempre en el backend, denegar por defecto. Jamás secretos, tokens ni `.env` en el repositorio, en logs ni en commits. Ver `docs/SECURITY.md`.
- **Zonas compartidas** (requieren autorización expresa del propietario en la tarea; si no la tienes, deja la propuesta en el PR): `src/BuildingBlocks/**`, `src/Host/**`, `src/Modules/Identity/**`, `web/src/core/**`, `web/src/app/**`, `compose*.yaml`, `deploy/**`, `.github/**`, `Directory.*.props`, `global.json`, dependencias y lockfiles, `AGENTS.md` y `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DESIGN_SYSTEM.md`.

## 9. Comandos esenciales (Windows PowerShell, Docker Desktop)
`.\scripts\test-backend.ps1` · `.\scripts\test-database.ps1` · `.\scripts\test-frontend.ps1` · `.\scripts\test-all.ps1` · `.\scripts\format-backend.ps1` / `format-frontend.ps1` · `.\scripts\install-hooks.ps1` (una vez por clon: formato y secretos en cada commit) · `.\scripts\qa-phase0-stack.ps1` (stack aislado). Detalle en `docs/TESTING.md`.

## 10. Entrega
Al terminar una unidad: qué hiciste, qué commits, qué ejecutaste y con qué resultado real, qué queda sin verificar y qué decisión necesitas del propietario. Actualiza `docs/PROGRESS.md` (una vez, en el mismo commit de la unidad).
