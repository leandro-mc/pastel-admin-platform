# AGENTS.md — Reglas operativas de Pastel

Pastel es un monolito modular (.NET 10 + React 19) con un módulo por aplicación. Este archivo es la **puerta de entrada de todo agente**: contiene las reglas de proceso y dice **qué más leer, y solo eso**, según la tarea. Léalo completo; el resto, no.

## 0. Etapa actual
**Etapa 1: construir las cinco aplicaciones (Ágora, Brisa, Balance, Cosecha y Huella) funcionales.** Pruebas exhaustivas, QA profundo y revisiones visuales sistemáticas son de la Etapa 2 (la declara el propietario) y no bloquean entregas. No se negocian en ninguna etapa: seguridad del backend, autorización real, aislamiento entre usuarios y módulos, integridad de datos, protección de secretos y las reglas duras de diseño (§7).

## 1. Cómo cargar contexto (ahorro de tokens)
1. **Lea solo la fila de su tarea en §2.** No abra otros documentos «por si acaso», ni los de otra aplicación.
2. **Lea por secciones, no por archivos.** Cuando §2 indica `§N`, lea solo esa sección: liste los encabezados (`grep -n "^#" archivo`) y lea el rango (`sed -n 'a,bp'` o `Read` con `offset`/`limit`). Para un dato puntual, busque (`grep`) en vez de leer.
3. **El código es la fuente de verdad.** Si un documento discrepa del código, gana el código y corrige el documento (solo esa línea).
4. **No lea por defecto:** `docs/requirements/**` (investigación y prototipos), `docs/design/**`, `docs/requests/**`, `docs/HISTORY.md` ni el progreso de otras aplicaciones. Ábralos solo si su tarea los nombra o si la ficha de su módulo no responde una duda, y entonces busque la sección concreta.
5. **No relea** lo que ya cargó en la sesión ni lo que acaba de escribir.

## 2. Qué leer según la tarea
`<M>` = módulo (p. ej. `HUELLA`, `Huella`, `huella`). Lo marcado con `§` se lee por sección. Todas las rutas incluyen este archivo.

| Tarea | Leer |
|---|---|
| Módulo · backend | `docs/progress/<M>.md` · `docs/modules/<M>.md` · `src/Modules/<M>/MODULE.md` · `docs/ARCHITECTURE.md §4 §5 §7` · `docs/ERROR_HANDLING_AND_LOGGING.md §2` · `docs/TESTING.md §3` |
| Módulo · frontend | `docs/progress/<M>.md` · `docs/modules/<M>.md` · `web/src/modules/<m>/MODULE.md` · `docs/ARCHITECTURE.md §9.4` · `docs/DESIGN_SYSTEM.md §1 §4 §6` · `docs/TESTING.md §3` |
| Módulo · ambas capas | Unión de las dos filas anteriores |
| Seguridad, autenticación o permisos | `docs/PROGRESS.md` · `docs/SECURITY.md` · `docs/ARCHITECTURE.md §2` · `docs/ERROR_HANDLING_AND_LOGGING.md §4` · `docs/TESTING.md §3` |
| Arquitectura o zona compartida de backend (`src/BuildingBlocks`, `src/Host`) | `docs/PROGRESS.md` · `docs/ARCHITECTURE.md §2 §3 §4 §6` · `docs/TESTING.md §3` |
| Shell o `web/src/core` | `docs/PROGRESS.md` · `docs/DESIGN_SYSTEM.md §1 §9` · `docs/ARCHITECTURE.md §9.3` · `docs/TESTING.md §3` |
| Infraestructura (Docker, nginx, CI, scripts) | `docs/PROGRESS.md` · `docs/OPERATIONS.md` · `docs/GIT_WORKFLOW.md §3` · `docs/TESTING.md §3` |
| Investigación o prototipos | `docs/requirements/README.md` · `docs/requirements/METODO-DE-TRABAJO.md` · la carpeta de su app en `docs/requirements/` |
| Solo documentación | Los documentos que va a cambiar (§9) |

Solo si lo necesita: el porqué de una decisión → `docs/DECISIONS.md`; una duda de commits o PR que §3 no resuelve → `docs/GIT_WORKFLOW.md §2`; la política de pruebas al escribir una → `docs/TESTING.md §1`; un CCR que su tarea nombra → `docs/requests/`.

## 3. Flujo, ramas y commits
- Una rama corta por tarea desde `dev` (`feat/<modulo>-<tema>`, `fix/`, `docs/`, `chore/`); **un agente por rama**; sincronice con `git pull --rebase` (sin merges de sincronización).
- **Un commit = una unidad completa** (código + prueba + documentación de esa unidad), que un revisor entienda y pueda revertir sola. Prohibido commitear por tiempo, por archivo, como punto de control o para «registrar avance» (`wip`, `checkpoint`, `docs: registrar…`).
- **Durante el desarrollo no se ejecutan validaciones** (§4). Los arreglos no publicados se integran en su commit antes de empujar. Lo no verificado se declara una vez, en el cuerpo del commit y en el progreso de su app ("por verificar").
- Mensaje: `tipo(ámbito): resumen en imperativo` (≤ 72 caracteres, español) y cuerpo con qué, por qué y cómo se verificó. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`.
- Entrega por PR hacia `dev`. **Nadie integra en `dev` ni `main`, ni abre o fusiona un PR, sin autorización expresa del propietario**; `main` solo por promoción. No reescriba historia compartida.

## 4. Validación: solo a pedido del propietario
**Prohibido por defecto**, en cada tarea y antes de cada commit o PR: Prettier, ESLint, `tsc`/build, Vitest, `dotnet format`, `dotnet build`/`test` de la solución, `check-design`, `check-module-boundaries`, `test-*.ps1`, `format-*.ps1`, `docker compose build`/`up` y pruebas de integración. Tampoco se ejecutan guardas «de paso» ni se vuelve a validar lo ya validado. El objetivo es desarrollar funcionalidad.
- **Se ejecutan solo cuando el propietario lo pide o autoriza**, normalmente tras mucho desarrollo, y solo el alcance que pide (el mínimo que cubra lo tocado, no el conjunto completo).
- Sí es válido, sin pedirlo: una compilación puntual del proyecto que está editando cuando necesita saber si un cambio compila para seguir trabajando (`dotnet build <proyecto>`, `tsc --noEmit` sobre su módulo), y probar a mano una función concreta. Sin formato, lint ni suites.
- Pruebas que escribir (Etapa 1): solo las que protegen seguridad del backend, autorización, aislamiento, integridad de datos, reglas de negocio críticas y secretos; pocas, una por defecto concreto. Se escriben, pero **no se ejecutan** hasta que el propietario lo pida. Las existentes se conservan.
- Nada se declara aprobado sin ejecución real: lo no ejecutado se marca «por verificar» y no es un defecto de la entrega. Comandos: `docs/TESTING.md §3`.

## 5. CI
Nunca por commit, push ni PR abierto: solo al aprobar un PR hacia `dev` (o etiqueta `ci:basico`/`ci:completo`) y a mano. No se despacha CI durante la depuración ni se corren sus equivalentes en local sin que el propietario lo pida. Detalle: `docs/GIT_WORKFLOW.md §3`.

## 6. Roles
**Dev** implementa en su módulo y compila; **Build/QA** compila, corrige, escribe las pruebas esenciales y reporta con evidencia (si no puede ejecutar algo, el propietario corre el comando y devuelve la salida); **Investigación** produce documentos o prototipos sin tocar código de producto.

## 7. Diseño
Reglas duras (todas las etapas): **sin morado ni sus derivados** y **sin lo típico del diseño generado por IA** (destellos, robots, varitas, emojis como adorno); las verifica `scripts/check-design.mjs`. La identidad visual por aplicación aún no está definida: no invente paletas. Las reglas de diseño de frontend de un módulo (su ficha o su `MODULE.md`) prevalecen sobre las guías generales, sin relajar las reglas duras ni `docs/DESIGN_SYSTEM.md §9` (shell). Detalle y jerarquía: `docs/DESIGN_SYSTEM.md`.

## 8. Arquitectura, seguridad y zonas compartidas
- Módulo = un proyecto .NET con su esquema y sus migraciones; sin claves foráneas ni joins entre esquemas; un módulo no usa el interior de otro y `web/src/modules/<m>` solo importa de `@/core/*` (`docs/ARCHITECTURE.md §2`).
- Autorización siempre en el backend, denegar por defecto. Jamás secretos, tokens ni `.env` en el repositorio, en logs ni en commits. El modo desarrollador es solo visual: los módulos no importan `@/core/devmode` (`docs/SECURITY.md`).
- **Zonas compartidas** (requieren autorización expresa del propietario en la tarea; si no la tiene, deje la propuesta en el PR): `src/BuildingBlocks/**`, `src/Host/**`, `src/Modules/Identity/**`, `web/src/core/**`, `web/src/app/**`, `compose*.yaml`, `deploy/**`, `.github/**`, `Directory.*.props`, `global.json`, dependencias y lockfiles, `AGENTS.md`, `docs/PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DESIGN_SYSTEM.md`.

## 9. Documentación: una fuente por tipo de información
| Información | Única fuente |
|---|---|
| Reglas de proceso y qué leer | `AGENTS.md` |
| Estado general, pendientes transversales y backlog de la Etapa 2 | `docs/PROGRESS.md` (corto; sin detalle por app) |
| Estado de una aplicación (hecho, validado, por verificar, decisiones pendientes) | `docs/progress/<M>.md` (`PLATAFORMA.md` para Identity, shell e infraestructura) |
| Alcance de producto, roles y criterios de aceptación de un módulo | `docs/modules/<M>.md` |
| Cómo está implementado un módulo (endpoints, errores, estructura) | `src/Modules/<M>/MODULE.md` y `web/src/modules/<m>/MODULE.md` |
| Arquitectura, seguridad, errores y logs, diseño, operación, pruebas, Git y CI | Su documento en `docs/` (uno por tema) |
| El porqué de las decisiones | `docs/DECISIONS.md` |
| Historia ya cerrada | `docs/HISTORY.md` (archivo: no se lee ni se amplía salvo pedido del propietario) |

**Mantenimiento** (en el mismo commit de la unidad):
- Actualice **solo** lo que su cambio vuelve falso o incompleto, editando la sección afectada; no reescriba ni reformatee documentos ajenos a su tarea.
- Su progreso va en `docs/progress/<M>.md`: **refleja el estado actual, no un diario**. Reemplace lo que quedó obsoleto en vez de añadir entradas; manténgalo bajo ~60 líneas (git conserva la historia).
- Toque `docs/PROGRESS.md` solo si cambia algo transversal (etapa, CCR, decisión que afecta a varias apps, backlog de la Etapa 2) y solo en su línea.
- No copie reglas ni datos de otro documento: enlácelo con su sección (`docs/X.md §N`). Si encuentra una duplicación, deje una sola fuente.
- Si cambia la ruta de §2 o la estructura de `docs/`, mida el efecto con `node scripts/context-budget.mjs`.

## 10. Entrega
Al terminar una unidad, informe: qué hizo, qué ejecutó y con qué resultado real, qué queda sin verificar y qué decisión necesita del propietario. Comandos: `docs/TESTING.md §3`.
