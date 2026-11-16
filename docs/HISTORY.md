# Historia del proyecto (archivo)

Registro de trabajo **ya cerrado**, movido sin cambios desde `docs/PROGRESS.md` y `docs/GIT_WORKFLOW.md` el 2026-11-15 para que no se cargue en cada tarea. **Los agentes no lo leen ni lo amplían** salvo que el propietario lo pida; el estado vigente está en `docs/PROGRESS.md` y en `docs/progress/`.

## Validación de la Fase 0 (ejecutada por el propietario, 2026-10-24 y 25)
Backend 51/51 (formato, build Release, NuGet sin vulnerabilidades) · PostgreSQL 46/46 · frontend completo (Vitest 21/21, `npm audit` limpio, guardas) · stack aislado 10/10 (salud real del API, esquemas migrados desde base vacía, caída y recuperación de la base, cabeceras sin duplicados) · construcción de las imágenes de los cinco módulos · verificación manual de Google (cuenta nueva y vinculación a la cuenta de arranque).
**Defectos reales que esta validación encontró y corrigió:** ediciones simultáneas de un rol que se fundían, cabeceras de seguridad duplicadas en `/api/*` y advertencias por cada acceso denegado repetido.

## Rediseño del shell y modo desarrollador (2026-11-10, en `refactor/modular-foundation`)
- **Hecho:** investigación y auditoría (`docs/design/SHELL_RESEARCH.md`); shell nuevo (sidebar de 16 rem con riel plegable y el botón de plegar arriba, panel de cuenta con tema luna/sol, tamaño de texto en «A» y cierre de sesión destacado, un único control de app, barra superior solo con acciones globales y migas reales, barra inferior visible en móvil, pie de una línea, scroll del documento); contrato del manifiesto (`alsoActiveOn`, `group`); reglas en `docs/DESIGN_SYSTEM.md` §9; modo desarrollador (permiso `platform.developer.mode`, `core/devmode`, selector «Ver como», endpoint de definiciones de rol, asignación individual en Accesos).
- **Validado** (`docs/design/SHELL_VALIDATION.md`): Vitest 54/54, tsc, ESLint, Prettier, build y guardas; en Chrome real, axe sin incumplimientos del shell en 8 estados, contraste mínimo 4,79:1 en 6 apps × 2 temas y sin desbordes de 320 a 1440 px. Herramienta repetible: `node scripts/shell-visual.mjs`.
- **Sin validar (hacer antes de aceptar):** el **backend** del modo desarrollador no se compiló ni se ejecutó (sin .NET en el entorno de investigación): correr `.\scripts\test-backend.ps1` y las pruebas con PostgreSQL (3 unitarias y 5 de integración nuevas en `DeveloperModeTests`). Tampoco hubo lector de pantalla real, dispositivos físicos, otros navegadores ni personas usuarias. Primer `docker compose up -d --build` del propietario (2026-11-10): las imágenes se construyeron (el `dotnet publish` Release compiló todo el backend, incluido el código nuevo de Identity), pero el contenedor `api` no arrancó: `CatalogSyncTask` violaba la clave foránea de `role_permissions` porque EF trataba un permiso nuevo de un módulo ya sembrado como fila existente (UPDATE). Es un defecto latente del código previo que el permiso nuevo destapó en una base ya creada (en una vacía no ocurre); corregido con un `Add` explícito y cubierto por una prueba de integración de regresión. Falta confirmar que la API arranca sobre esa base.
- **Decisiones:** el propietario ratificó íntegramente S1–S6 y M1–M4 el 2026-11-10 (`docs/DECISIONS.md`), incluida M3. S7 (`alsoActiveOn` y `group` en el manifiesto) sigue sin ratificar.
- **Hallazgos fuera del shell:** foco visible de `core/ui` bajo 3:1 (1,55:1 y 2,4:1 en tema claro) y `--muted` como texto a 4,44:1; patrones de «AI slop» en páginas de Workspace y Ágora (`SHELL_VALIDATION.md` §6).

## Revisión de identificadores y PrivilegeGuard (2026-11-11, en `refactor/modular-foundation`)
- **Hecho:** las claves de entidad de Identity usan `Guid.CreateVersion7()` (secretos y `jti` siguen aleatorios) y `ARCHITECTURE.md` §5 describe lo real: no existe generación de GUID desde el cliente. Las reservas de Cosecha y Huella las declara cada módulo con `PermissionGroup.GrantPolicy`; `PrivilegeGuard` y `CatalogSyncTask` ya no nombran módulos. Se eliminó una comprobación de Cosecha inalcanzable y se corrigieron los `MODULE.md` que decían que `Administrator` recibe todos los permisos.
- **Sin validar (hacer antes de aceptar):** el entorno no alcanzaba NuGet, así que Identity no se compiló completo ni se ejecutaron sus pruebas. Sí se compilaron con advertencias como error el contrato de `Pastel.Platform` y los permisos de Cosecha/Huella, y se probó `GrantPolicyOf`; el resto de Identity solo tuvo compilación parcial (sin errores de sintaxis ni de los símbolos nuevos). Correr `.\scripts\test-backend.ps1` y `.\scripts\test-database.ps1` (las consultas de `CatalogSyncTask` ahora usan `ownerAccountOnlyCodes.Contains`).
- **Cambios visibles:** el `reason` de la auditoría `identity.privilege.denied` pasó a `owner_account_only` / `owner_grants_only` (antes `huella_profile_is_owner_only` / `cosecha_access_requires_owner`) y cambió el texto de `identity.privilege.owner_permission_required`.
- **Residual:** `CatalogSyncTask` conserva la limpieza del rol heredado «Huella — Propietario»; puede borrarse cuando se confirme que ninguna base lo tiene.

## Historia de la rama `refactor/modular-foundation`
La rama llegó a 488 commits (446 propios y 42 de `dev`); el análisis y las reglas nuevas están en `docs/GIT_WORKFLOW.md` §4. El 2026-10-25 los 446 propios se unificaron en unidades lógicas **sin cambiar el contenido final** (árbol idéntico). El estado anterior se conserva en la rama de respaldo `backup/refactor-modular-foundation-2026-10-25`; puede borrarse cuando el propietario lo decida. La rama `research/requirements-and-prototypes` nació de la historia anterior y debe rebasarse sobre la nueva con los comandos de `docs/GIT_WORKFLOW.md` §4.

## Análisis de `refactor/modular-foundation` (por qué tuvo 488 commits)
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
