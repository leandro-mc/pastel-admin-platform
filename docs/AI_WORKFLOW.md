# Flujo de trabajo para personas y agentes de IA

Este documento define el ciclo normal de desarrollo. `AGENTS.md` y este archivo deben leerse al inicio de cada sesión nueva.

## 1. Modelo de ramas

- `main`: versión estable publicada. No se usa para el desarrollo diario.
- `dev`: rama de integración actualizada. Todas las funcionalidades, correcciones y refactorizaciones aprobadas regresan a esta rama.
- Ramas de trabajo: se crean desde la base indicada por el orquestador (normalmente el `dev` más reciente), salvo que se indique continuar una rama existente. Cada rama contiene una tarea coherente y permanece separada de `dev` mientras el usuario la prueba. **Nunca abras PR ni integres a `dev` sin autorización explícita del usuario.**

Flujo normal:

```text
main  --sólo promoción autorizada de una versión estable--  dev
                                                             ↑
             rama de trabajo ── validación explícita ── PR a dev ──┘
```

Comandos iniciales:

```powershell
git status --short --branch
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feat/nombre-corto
```

No cambies de rama si hay cambios locales sin guardar o sin permiso del usuario. Si el usuario pide mantener la misma rama, inspecciona su estado e historial y reutilízala si corresponde a esta tarea. Si el nombre propuesto ya existe, inspecciónalo y reutilízalo únicamente si corresponde.

### Coordinación cuando hay agentes y proyectos en paralelo

- Durante una refactorización de la base, **no supongas que la arquitectura objetivo ya está implementada en `dev`**. El orquestador debe indicar la rama y el SHA base que corresponde a cada tarea. Sigue el código real de esa base y las instrucciones de la fase; no mezcles automáticamente el código antiguo con el objetivo de la refactorización.
- Cada agente trabaja en una rama por tarea coherente y con una zona de escritura definida. Los módulos/proyectos independientes pueden avanzar en paralelo; evita que dos agentes editen los mismos archivos compartidos. `BuildingBlocks`, `Identity`, shell/core, configuración global, CI y documentación raíz siguen protegidos salvo asignación expresa del orquestador o CCR autorizado.
- Para relevos, haz commits pequeños y coherentes y publica checkpoints cuando el siguiente agente necesite acceder a ellos. Mantén un `PROGRESS.md` por tarea/fase con SHA actual, cambios hechos, decisiones, comandos ejecutados, limitaciones, pendientes y el siguiente paso concreto. El siguiente agente inspecciona rama, `git status`, historial y progreso antes de continuar.
- No integres ramas de agentes entre sí ni cambies su base por iniciativa propia. Coordina el orden y la base con el orquestador para evitar que una tarea dependiente se construya sobre una arquitectura todavía en transición.

## 2. Convención de nombres

Usa minúsculas, kebab-case y una rama por objetivo coherente:

- `feat/<funcionalidad>`: funcionalidad o módulo nuevo.
- `fix/<problema>`: corrección de un bug.
- `refactor/<alcance>`: refactorización sin cambio intencional de comportamiento.
- `docs/<tema>`: sólo documentación.
- `test/<alcance>`: pruebas independientes.
- `chore/<tarea>`: tooling, CI, configuración o mantenimiento.

No crees ramas por archivo, clase o commit. Agrupa cambios dependientes en una sola rama y usa commits para separar pasos lógicos. Las ramas `dependabot/...` son una excepción automática: las genera GitHub Dependabot y no deben renombrarse manualmente; su configuración agrupa las actualizaciones y las dirige a `dev`.

## 3. Commits y Pull Requests

- Usa Conventional Commits en español o inglés consistente con el área: `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Mantén cada commit enfocado, pero no confundas “un commit por idea” con “un commit por archivo”. Ajustes dependientes de una misma corrección se agrupan.
- **Tipo de agente obligatorio por tarea:** el orquestador debe indicar Tipo 1 o Tipo 2; la clasificación es independiente del rol (Dev/Build/QA). Si no se indica, pregunta antes de continuar con cambios de implementación. **Tipo 1:** commit + push con progreso coherente al menos cada 3 minutos, incluyendo `PROGRESS.md`. **Tipo 2:** sin límite fijo de 3 minutos; publica con regularidad al completar unidades de trabajo coherentes, sin crear commits mínimos por cada ajuste. En ambos tipos, registra el progreso en el mismo commit cuando corresponda, y publica antes de cambiar de tarea/contexto o ante riesgo de interrupción.
- **Dev:** si su entorno lo permite, ejecuta build y validaciones locales razonables antes de entregar. Si no tiene entorno de compilación, puede publicar código sin compilar; no lo simula ni afirma que compila, y declara «sin compilar» en `PROGRESS.md` y en el informe. El código publicado debe estar lo más coherente posible y listo para que el agente con entorno lo compile.
- **Build/QA:** siempre deben trabajar en un entorno capaz de restaurar, compilar y ejecutar pruebas. Pueden ser responsabilidades de la misma sesión/agente para optimizar sesiones. Si corrigen código, vuelven a ejecutar las comprobaciones afectadas y declaran el SHA validado; no ocultan fallos ni afirman resultados no ejecutados.
- **CI deliberadamente diferido:** los pushes a ramas de trabajo no disparan CI automáticamente. La CI completa se ejecuta en pushes a `dev`/`main`, al abrir/reabrir un PR o marcarlo listo para revisión, y al actualizar un PR que ya está listo. También se puede iniciar manualmente desde GitHub Actions. Así los commits de relevo no generan una ejecución por cada push, pero el trabajo integrado y los PR listos siguen verificados.
- Cuando trabajes directamente mediante herramientas GitHub, no uses el endpoint de contenido para actualizar cada archivo en serie si la tarea es multiarchivo: prepara todos los blobs, crea un árbol y publica **un solo commit atómico** con Git Data API. En un checkout local, agrupa los cambios relacionados en commits coherentes; no esperes a que todo el módulo esté terminado para guardar avances.
- Si una refactorización extensa necesita puntos intermedios, publica avances coherentes en la misma rama para que otro agente pueda retomarlos. No desactives ni elimines las comprobaciones finales: se difiere su ejecución, no la validación.
- Si la CI falla, reúne los errores del mismo run, corrige el conjunto y vuelve a validar; no abras nuevos PR por cada intento.
- Antes del commit, revisa `git diff --check`, `git diff` y `git status`; confirma que no haya `.env`, claves, contraseñas, tokens, dumps o datos personales.
- Antes de terminar, revisa el diff y las validaciones que realmente se pudieron ejecutar; no afirmes pruebas no realizadas.
- No borres ejecuciones históricas de CI solo para ocultar fallos válidos. La prevención se hace publicando estados coherentes; cualquier limpieza de historial debe ser deliberada y autorizada.
- **Nunca abras PR ni integres a `dev` sin autorización explícita del usuario.** Entrega rama, SHA, resumen y validaciones. Cuando el usuario autorice abrir el PR, abre uno solo para la tarea validada; espera CI y revisa el diff. Solo haz merge cuando la autorización para integrar también sea explícita. Las iteraciones permanecen en la misma rama.
- Tras la integración autorizada, actualiza tu copia de `dev` y elimina la rama sólo cuando ya no se necesite.
- No hagas commits de trabajo directamente a `main`. Evita `git push --force`; nunca reescribas el historial compartido.

## 4. Promoción de `dev` a `main`

Sólo ocurre cuando el usuario dice explícitamente que quiere publicar/pasar a `main`. Antes de hacerlo:

1. Confirma que `dev` está actualizado y sin tareas incompletas.
2. Ejecuta las validaciones de backend, frontend y Docker indicadas en `README.md`.
3. Revisa cambios de esquema, migraciones, secretos, configuración de producción y notas de versión.
4. Solo después de recibir autorización explícita para abrir el PR de promoción, abre el PR de `dev` a `main`, revisa CI y espera autorización explícita para hacer merge si todavía no se autorizó la integración.
5. Integra el PR aprobado y crea un tag semántico en el commit publicado: `vMAJOR.MINOR.PATCH` (por ejemplo, `v1.0.0`). No inventes ni reutilices un tag.
6. Documenta en el PR o notas de la versión los cambios incluidos y cualquier paso operativo.

Por defecto, termina el trabajo en `dev`. Nunca interpretes que pedir una funcionalidad o decir “listo” autoriza publicarla en `main`.

## 5. Validación mínima

La CI no se ejecuta automáticamente con cada push a ramas de trabajo. Se ejecuta en pushes a `dev`/`main`, al abrir/reabrir un PR, al marcarlo listo para revisión y con nuevos pushes a un PR que ya no está en borrador. Cuando este workflow también esté en la rama predeterminada (`main`), podrá iniciarse manualmente desde **Actions → CI → Run workflow**, seleccionando la rama objetivo. Los PR en borrador pueden dejar un run con los trabajos omitidos, pero no consumen minutos de runner. El workflow no se desactiva: solo se difiere la validación completa hasta que la tarea esté lista.

Ejecuta lo aplicable y reporta exactamente qué pasó y qué no pudo ejecutarse. Sin entorno de compilación (rol Dev) no ejecutes ni simules estos comandos: declara «sin compilar».



```powershell
dotnet restore Pastel.slnx
dotnet build Pastel.slnx --configuration Release --no-restore
dotnet test Pastel.slnx --configuration Release --no-build --no-restore
Push-Location web
npm ci --no-audit --no-fund
npm run format:check
npm run build
npm run lint
Pop-Location
docker compose config --quiet
docker compose build
```

Para cambios en el arranque o la base, compila y además levanta el stack limpio de CI o prueba la migración y el seeding en PostgreSQL. Que una imagen compile no demuestra que las tablas se creen o que los servicios arranquen.

## 6. Documentación y contexto duradero

Actualiza la documentación dentro de la misma rama si cambian el flujo de trabajo, los comandos, variables de entorno, tecnologías, arquitectura, contratos, endpoints o la manera de agregar módulos. Las decisiones técnicas persistentes no deben quedar sólo en la conversación.

Al finalizar antes de la aprobación, informa el nombre de la rama, commit, pruebas ejecutadas/no ejecutadas y comandos exactos para probar; no abras PR. Después de la confirmación expresa del usuario, informa el PR/merge hacia `dev` sólo cuando esté verificado. No afirmes una validación sin evidencia.