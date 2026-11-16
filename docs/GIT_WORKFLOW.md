# Flujo de Git: ramas, commits, PR y CI

Las reglas de ramas y commits están en `AGENTS.md` §3; aquí solo el detalle que allí no cabe y su motivo. El análisis que las originó (una rama con 488 commits) está en `docs/HISTORY.md`.

## 1. Ramas y pull requests
- `main` = producción; `dev` = integración.
- **Un solo agente por rama**: dos agentes en la misma rama entrelazan commits y obligan a merges de sincronización.
- Al integrar se usa **merge normal** (conserva los commits lógicos). Se usa *squash* solo cuando el PR entero es una única unidad de trabajo.
- Un PR describe: qué cambió, qué se validó (con resultado real), qué queda sin verificar y qué decisión se necesita.

## 2. Commits: detalle
1. **Arreglos no publicados**: se integran en su commit (`git commit --amend` o rebase local) antes de empujar. Una cadena `fix`/`fix`/`fix` sobre lo mismo indica que se publicó antes de validar.
2. **Sin commits por cada error de compilación**: lo no verificable se declara una sola vez (cuerpo del commit y progreso de la app).
3. **`style`** es solo formato masivo y va **aislado** de la lógica. Sin mensajes genéricos («Refactor components…»).
4. **Herramienta**: `git` local (`git add` de todos los archivos de la unidad y un solo `git commit`). Una API que crea un commit por archivo **no se usa** para trabajo de varios archivos.
5. **Tamaño de referencia**: un PR típico tiene de 1 a 15 commits. Si pasa de 30, o si hay tres o más commits seguidos con mensajes casi iguales, se unifican antes de pedir revisión. Un commit no mezcla temas ajenos ni supera unas 800 líneas, salvo código generado o migraciones.
6. **Historia**: antes de pedir revisión, un agente puede limpiar **su propia** rama con rebase y `git push --force-with-lease`; antes de cualquier reescritura se deja una rama o etiqueta de respaldo. La historia compartida no se reescribe sin autorización.
7. **Hook local**: `.\scripts\install-hooks.ps1` instala solo la detección de secretos y la validación del mensaje (resumen ≤ 72 caracteres, sin `wip`/`checkpoint`/`docs: registrar…`); no formatea ni ejecuta pruebas (`docs/TESTING.md` §4).

**Antes de `git commit`:** ¿la unidad está completa? ¿incluye su prueba (escrita, no ejecutada) y su documentación? ¿hay un solo tema? ¿el mensaje explica el porqué?

## 3. CI en GitHub Actions (minutos limitados)
- **Nunca por commit, push ni por abrir o actualizar un PR.** El workflow `CI` solo se dispara:
  - al **aprobar** un PR cuya base es `dev` (revisión *approved*);
  - al añadir la etiqueta **`ci:basico`** o **`ci:completo`** a un PR hacia `dev` (alternativa para quien no puede aprobar su propio PR);
  - a mano (`workflow_dispatch`) eligiendo el alcance `basico` (por defecto) o `completo`.
- **Básico** (siempre; es lo único que se espera en la Etapa 1): backend (`test-backend.ps1`: formato, build Release, auditoría NuGet y pruebas unitarias) y frontend (`test-frontend.ps1`: formato, lint, build, pruebas de componentes y guardas).
- **Completo** (propio de la Etapa 2; solo si el propietario lo indica con `ci:completo` o alcance «completo»): además las pruebas de integración con PostgreSQL, la construcción y arranque de los contenedores, y el aislamiento por módulo.
- **CodeQL** es manual y opcional.
- Los agentes no despachan CI manual ni ejecutan en local sus equivalentes durante el desarrollo: la validación corre solo cuando el propietario la pide (`AGENTS.md` §4). El CI de GitHub es la última puerta antes de integrar.
