# Flujo de Git: ramas, commits, PR y CI

Reglas operativas resumidas en `AGENTS.md`; aquí están completas y con su motivo.

## 1. Ramas y pull requests
- `main` = producción; `dev` = integración. **Nada se integra en `dev` ni en `main` sin autorización expresa del propietario**, y `main` solo se actualiza por promoción desde `dev`.
- Cada tarea vive en una **rama corta** creada desde `dev` (`feat/<modulo>-<tema>`, `fix/…`, `docs/…`, `chore/…`). **Un solo agente por rama**: dos agentes en la misma rama entrelazan commits y obligan a merges de sincronización.
- Durante el trabajo se sincroniza con `git pull --rebase` (sin commits de merge de sincronización).
- Al integrar se usa **merge normal** (conserva los commits lógicos). Se usa *squash* solo cuando el PR entero es una única unidad de trabajo.
- Un PR describe: qué cambió, qué se validó (con resultado real), qué queda sin verificar y qué decisión se necesita.

## 2. Reglas de commits
1. **Un commit = una unidad de trabajo completa y coherente**: algo que un revisor entiende por sí solo y que se puede revertir sin dejar el proyecto roto. Código + prueba + documentación de la unidad van **en el mismo commit**.
2. **No se commitea** por tiempo, por archivo, como «punto de control», para guardar o para registrar avance. Prohibidos `wip`, `checkpoint`, `tmp`, `record` y `docs: registrar…` como commits aislados. El avance se anota una vez, en `docs/PROGRESS.md`, dentro del commit de la unidad.
3. **Los arreglos de trabajo no publicado se integran en su commit** (`git commit --amend` o `git rebase -i` local) antes de empujar. Una cadena `fix`/`fix`/`fix` sobre lo mismo es una señal de que se publicó antes de validar.
4. **Valida antes de commitear** (compilar y las pruebas esenciales de lo tocado). Si algo no se pudo verificar, se declara una sola vez en el cuerpo del commit y en `PROGRESS.md`; no genera commits adicionales por cada error de compilación.
5. **Mensaje**: `tipo(ámbito): resumen en imperativo` (≤ 72 caracteres, español). Cuerpo con qué cambió, por qué y cómo se verificó. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`. `style` es solo formato masivo y va **aislado** de la lógica. Sin mensajes genéricos («Refactor components…»).
6. **Herramienta**: usa `git` local (`git add` de todos los archivos de la unidad y un solo `git commit`). Una API que crea un commit por archivo **no se usa** para trabajo de varios archivos: acumula el cambio y entrégalo como un único commit.
7. **Tamaño de referencia**: un PR típico tiene de 1 a 15 commits. Si pasa de 30, o si hay tres o más commits seguidos con mensajes casi iguales, se unifican antes de pedir revisión. Un commit no mezcla temas ajenos ni supera unas 800 líneas, salvo código generado o migraciones.
8. **Historia**: no se reescribe historia compartida sin autorización del propietario. Antes de pedir revisión, un agente puede limpiar **su propia** rama con rebase interactivo y `git push --force-with-lease`. Antes de cualquier reescritura se deja una rama o etiqueta de respaldo.
9. **Hook local**: `.\scripts\install-hooks.ps1` instala el chequeo de formato y secretos (ver `docs/TESTING.md`) y la validación del mensaje de commit.

**Lista de comprobación antes de `git commit`:** ¿la unidad está completa? ¿validé? ¿incluí su prueba y su documentación? ¿hay un solo tema? ¿el mensaje explica el porqué? ¿arreglé aquí mismo lo que descubrí mientras tanto, en lugar de dejarlo para otro commit?

## 3. CI en GitHub Actions (minutos limitados)
- **Nunca por commit, push ni por abrir o actualizar un PR.** El workflow `CI` solo se dispara:
  - al **aprobar** un PR cuya base es `dev` (revisión *approved*);
  - al añadir la etiqueta **`ci:basico`** o **`ci:completo`** a un PR hacia `dev` (alternativa para quien no puede aprobar su propio PR);
  - a mano (`workflow_dispatch`) eligiendo el alcance `basico` (por defecto) o `completo`.
- **Básico** (siempre): backend (`test-backend.ps1`: formato, build Release, auditoría NuGet y pruebas unitarias) y frontend (`test-frontend.ps1`: formato, lint, build, pruebas de componentes y guardas).
- **Completo** (solo si el propietario lo indica con `ci:completo` o alcance «completo»): además las pruebas de integración con PostgreSQL, la construcción y arranque de los contenedores, y el aislamiento por módulo.
- **CodeQL** es manual y opcional.
- Los agentes no despachan CI manual durante la depuración: validan en local. El CI de GitHub es la última puerta antes de integrar, no una herramienta de desarrollo.

## 4. Análisis de `refactor/modular-foundation` (por qué tuvo 488 commits)
La rama muestra **488 commits en total: 446 propios y 42 heredados de `dev`**. Se concentraron en ocho días (99 el 18 de octubre, **281 el 19**, 56 el 20 y 10 en el resto), con **157 commits en 90 minutos** (19 de octubre desde las 21:20) y hasta **10 en un solo minuto**.

**Qué los produjo** (cifras sobre los 446 propios):
- **313 (70 %) tocan un solo archivo y 279 (63 %) cambian 30 líneas o menos**; 103 cambian cinco líneas o menos. **308 de esos 313 los creó la misma cuenta de agente de construcción y pruebas** (374 commits en total, 84 %), que publicaba **un commit por archivo**.
- **La propia regla lo pedía**: al inicio de la fase se documentaron «checkpoints frecuentes» (cada 2 y luego cada 3 minutos) y la distinción entre agentes que commitean seguido (Tipo 1) y por lotes (Tipo 2). La cadencia obligatoria convirtió cada paso, incluso un cambio de una línea, en un commit.
- **Registrar avance en Git**: 111 commits son `docs` y unos 44 solo anotan en `PROGRESS` lo que acababa de pasar. Cada arreglo venía seguido de su commit `docs: record…`.
- **Publicar antes de validar**: los errores de compilación del primer build en Docker se corrigieron uno por uno en commits públicos (por ejemplo tres commits idénticos «import privilege guard namespace»). 147 commits (33 %) son `fix`, muchos de la misma cadena.
- **Un cambio lógico repartido por archivo**: cada migración (clase, designer y snapshot) fueron tres commits con el mismo mensaje; en total hay 10 mensajes distintos repetidos en commits consecutivos.
- **Iterar en público**: decisiones como el alcance de Workspace frente a las apps o la recuperación de la interfaz pasaron por decenas de commits que reajustaban lo mismo (ver la ráfaga de 157 commits en 90 minutos).
- **Dos agentes en la misma rama**: sus commits se entrelazan, las fechas de autor no son monótonas y hubo un merge de sincronización.
- **El extremo contrario**: un commit de 48 archivos y 6 153 líneas con el mensaje genérico «Refactor components for improved readability and maintainability».

**Qué no debe repetirse:** commits por cadencia o por archivo; registrar avance en commits aparte; publicar antes de validar; dos agentes por rama; mensajes genéricos; commits gigantes sin descripción.

**Qué se hizo con la historia:** los 446 commits propios se unificaron en unidades lógicas sin cambiar el contenido final de la rama (el árbol resultante es idéntico). Cada commit nuevo lista en su cuerpo los commits originales que reúne. El estado previo se conserva en la rama de respaldo `backup/refactor-modular-foundation-2026-10-25` (puede borrarse cuando el propietario lo decida).

**Ramas derivadas de la historia anterior.** Solo `research/requirements-and-prototypes` nació de ella (sus 6 commits propios parten de `a8c1c7d`); el resto de ramas no se ve afectado. Para moverla a la historia nueva (probado sin conflictos, porque solo añade `docs/requirements/**`):
```powershell
git fetch origin
git switch research/requirements-and-prototypes
git rebase --onto origin/refactor/modular-foundation a8c1c7d research/requirements-and-prototypes
git push --force-with-lease origin research/requirements-and-prototypes
```
Quien tenga un clon local de `refactor/modular-foundation` sin trabajo propio pendiente: `git fetch origin; git switch refactor/modular-foundation; git reset --hard origin/refactor/modular-foundation`. Con trabajo pendiente, se rebasa con `git rebase --onto origin/refactor/modular-foundation <SHA-antiguo-de-su-base>`.
