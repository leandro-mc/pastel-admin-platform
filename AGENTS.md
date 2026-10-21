# Instrucciones para agentes de IA — Pastel

Pastel es una plataforma modular: un shell común, el módulo **Identity** (acceso y permisos) y subaplicaciones independientes: **Brisa, Balance, Ágora, Cosecha, Huella**. Lee solo lo necesario; el contexto es un recurso escaso.

## Tu rol (se te indica en el prompt)
- **Dev:** implementa el código de aplicación y deja hooks de testabilidad y `MODULE.md`; no escribe pruebas ni planes. **Si su entorno permite compilar/probar, debe hacerlo y reportar los comandos y resultados reales. Si no lo permite, puede publicar código sin compilar**, siempre que lo declare explícitamente en `PROGRESS.md` y en la entrega; no simula resultados ni afirma que compila.
- **Build:** responsabilidad de compilar, corregir errores de build/pruebas en código de producto sin cambiar el comportamiento acordado, generar migraciones, escribir y ejecutar pruebas unitarias/caracterización e informar comandos reales. Se realiza por un agente con entorno de compilación.
- **QA:** escribe el plan desde la ficha, ejecuta build y pruebas funcionales, permisos, integración y E2E en un entorno que **sí debe permitir compilar y ejecutar**; reporta defectos y resultados.
- **Build y QA pueden combinarse en una misma sesión/agente** para ahorrar sesiones. Si se combinan, se deben completar ambas listas de responsabilidades, registrar qué se ejecutó y volver a ejecutar las validaciones afectadas tras cada corrección. La separación independiente es preferible cuando haya capacidad, pero no es obligatoria en esta etapa.
- **Investigación:** solo produce documentos. **Mantenimiento:** aplica CCR aprobados.
Detalle: `docs/TESTING_STRATEGY.md`.

## Tipo de agente y cadencia de commits (obligatorio)

El tipo de agente debe indicarse al asignar **cada tarea** y es independiente del rol funcional (Dev, Build, QA, Investigación o Mantenimiento).

- **Tipo 1 — checkpoint frecuente:** publicar commit + push con progreso coherente **al menos cada 3 minutos**, incluyendo la actualización correspondiente de `PROGRESS.md`. No esperar a completar una WP o subobjetivo.
- **Tipo 2 — checkpoint por unidad de trabajo:** no tiene un límite fijo de tiempo. **Agrupar por defecto todos los cambios relacionados de una unidad lógica en un único commit** (código, configuración, documentación y progreso que correspondan). No crear commits por archivo, por cada arreglo pequeño ni como mecanismo de actualización durante la implementación. Solo crear un segundo commit si empieza una unidad funcional distinta, una corrección post-validación claramente separada o si el propietario lo solicita.
- **Tipo no indicado:** preguntar al orquestador/propietario y no continuar con cambios de implementación hasta recibir la clasificación. No inferir el tipo por el rol ni por la tarea.

La clasificación controla la **frecuencia** de guardado, no la obligación de trabajar con seguridad, revisar el diff, mantener la documentación, evitar secretos ni informar con honestidad qué se validó.

## Reglas duras de desarrollo, commits y CI

1. **Una unidad de trabajo, un commit.** Un agente Tipo 2 trabaja en una tanda coherente; revisa todas las modificaciones y registra el progreso una sola vez, en el mismo commit. No hagas commits de prueba para inspeccionar resultados.
2. **No uses la API de Contents para guardar archivos relacionados uno por uno.** Las llamadas `create_file`, `update_file` y `delete_file` crean cada una un commit independiente y pueden disparar automatizaciones. Para un lote utiliza blobs + un árbol Git + un commit + un único movimiento de referencia. Si no puedes agrupar, no publiques el lote parcialmente.
3. **CI nunca se usa como bucle interactivo de depuración.** El workflow `.github/workflows/ci.yml` es manual y requiere `confirm_validation=true`. No lo ejecutes durante desarrollo, no lo despaches por cada corrección y no alteres los checks para simular una aprobación.
4. **Antes de validar en CI:** termina la unidad de trabajo, inspecciona el diff completo, ejecuta localmente todas las comprobaciones posibles (format, lint, build, pruebas y auditorías) y corrige todos los fallos conocidos en una sola tanda. Solo después, y con autorización explícita del propietario, se hace un despacho manual integral.
5. **Si el entorno no permite validar:** dilo expresamente en `PROGRESS.md` y en la entrega; no dispares CI para sustituir un entorno local ausente. El estado es "sin validar" hasta la etapa Build/QA acordada.
6. **Después de un CI fallido:** lee los logs de todos los jobs que fallaron, agrupa causas relacionadas, realiza las correcciones en un solo lote y no reintentes hasta tener comprobaciones locales y autorización explícita. Cancelar un run anterior, si la herramienta disponible lo permite, no sustituye estas reglas.
7. **Historial compartido:** no reescribas, fuerces ni hagas squash del historial existente de la rama sin autorización explícita. La cadencia eficiente se aplica a los próximos lotes; no justifica destruir commits ajenos o checkpoints preexistentes.

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
- UX primero: `DESIGN_SYSTEM.md` (heurísticas, WCAG 2.2 AA, móvil primero). Español de Costa Rica, trato de usted o impersonal como regla general, **sin voseo salvo que la ficha o las instrucciones específicas del módulo lo permitan o lo soliciten expresamente**. Textos en `strings.ts`.

## Seguridad (no negociable)
Tokens solo en cookies `HttpOnly`, nunca en el navegador. Autorización siempre en el backend. No versionar secretos ni `.env`. No `EnsureCreated`. No registrar datos sensibles. Quien administra no puede escalar privilegios (concede solo lo que tiene).

## Flujo
- Parte de `dev`; rama por tarea: `feat/<m>-<alcance>`, `qa/<m>`, `chore/…`, `docs/…`. Nunca `main`.
- **Nunca abras PR ni integres a `dev` sin autorización explícita del propietario.** Cuando el propietario lo autorice, sí puedes abrir un único PR para la tarea y, si también autoriza expresamente la integración, completar el merge siguiendo `docs/AI_WORKFLOW.md`.
- Commits coherentes y revisables (evita volcados enormes). **El Dev sin entorno de compilación puede publicar código sin compilar y lo declara**; Build y QA no publican código que saben que no compila. Formato con Prettier/`dotnet format` cuando puedas ejecutarlos.
- Informa solo lo que ejecutaste y **declara expresamente lo que no compilaste ni ejecutaste** («sin compilar», «sin ejecutar»); nunca afirmes que algo compila o pasa sin haberlo comprobado. Mantén `MODULE.md` y tu `PROGRESS.md` al día. Si algo contradice estos documentos, confirma el código real y corrige el documento.
## Pruebas y validación proporcionales al riesgo

La meta de las pruebas es reducir defectos de comportamiento, seguridad y regresión; no maximizar el número de comandos ni satisfacer métricas cosméticas a cualquier costo. Aplica la cadencia definida en `docs/TESTING_STRATEGY.md`.

- Un cambio de comportamiento debe incluir o actualizar pruebas enfocadas de ese comportamiento siempre que sea viable. Si la tarea o las zonas protegidas reservan la escritura de pruebas a Build/QA (como en algunos WP de Fase 0), registra el caso pendiente y no afirmes que la funcionalidad quedó validada.
- Cambios de autenticación, autorización, permisos entre módulos, persistencia, migraciones, manejo de datos sensibles o infraestructura requieren pruebas negativas y positivas relevantes; ejecuta integración con PostgreSQL cuando aplique. Una prueba de compilación no demuestra la seguridad de los permisos.
- Cambios de UI deben comprobar los estados y controles afectados (teclado/labels y axe cuando corresponda) y revisar visualmente los flujos relevantes cuando se toca shell, navegación, tema, responsive o composición. No ejecutes una revisión visual completa por un cambio exclusivo de backend.
- Durante la iteración, ejecuta primero el control más pequeño que cubra el cambio. Ejecuta la batería integral al terminar una unidad lógica, antes del cierre de fase o cuando se toquen áreas compartidas con riesgo transversal. No uses CI como ciclo de depuración ni la despaches sin autorización.
- Son bloqueos de entrega los errores de compilación, los tests relevantes fallidos, los defectos de seguridad/integridad, las violaciones reales de fronteras modulares y las restricciones de diseño explícitamente prohibidas. Nunca desactives una prueba para conseguir un resultado verde.
- Por sí solas, son métricas informativas y no bloqueos de entrega: número de líneas de un CSS, porcentaje global de utilidades Tailwind, clases usadas una sola vez, volumen agregado de `@apply` dentro del archivo permitido, avisos de tamaño de bundle no asociados a un objetivo de rendimiento acordado y cantidad de pruebas/cobertura sin relación con escenarios de riesgo. No reorganices archivos solo para alcanzar un umbral numérico; usa esas métricas como señales de mantenimiento y atiéndelas cuando mejore la claridad.
- Toda entrega indica el SHA inspeccionado, las comprobaciones realmente ejecutadas y los pendientes. «No ejecutado» no equivale a aprobado. No se exige un porcentaje universal de cobertura: se exige evidencia suficiente de los comportamientos críticos de la ficha.

La división de responsabilidades Dev/Build/QA y los casos obligatorios de la Fase 0 siguen vigentes donde estén definidos expresamente; la proporcionalidad ajusta la cadencia y los falsos bloqueos, no elimina las pruebas de seguridad obligatorias ni autoriza a cerrar una fase sin su evidencia.

