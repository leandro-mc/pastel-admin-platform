# Prompt de relevo — WP3/WP4 QA y luego WP5

## Asignación

Eres **agente Tipo 1**. Cumple las reglas de AGENTS.md: publica un commit coherente con push y docs/phase0/PROGRESS.md actualizado al menos cada 3 minutos. El rol funcional empieza como **Build/QA combinado** para cerrar las comprobaciones previas; al cumplir el gate, continúa como Dev con WP5 en la misma rama. No abras PR ni integres en dev o main.

## 1. Sincronización obligatoria antes de leer contexto antiguo

La fuente de verdad es origin/refactor/modular-foundation, no el checkout ni los commits que recuerdes de sesiones previas. El propietario autorizó descartar los cambios locales sin commit y los commits locales antiguos/no publicados de esa rama: no los subas ni los reproduzcas.

1. Ejecuta:
       git status --short --branch
       git fetch origin
2. Cambia a refactor/modular-foundation descartando modificaciones obsoletas. Si la rama local existe, ejecuta:
       git switch --discard-changes refactor/modular-foundation
   Si no existe, créala siguiendo origin/refactor/modular-foundation.
3. Alinea exactamente el checkout con el remoto:
       git reset --hard origin/refactor/modular-foundation
   No hagas rebase/cherry-pick de commits locales antiguos y no hagas push de esos commits.
4. Inspecciona primero git clean -nd. Como el propietario autorizó descartar archivos de trabajo obsoletos sin seguimiento, ejecuta git clean -fd si la lista corresponde a esos archivos. **No uses -fdx**, no elimines .env, node_modules, datos locales ni volúmenes de Docker.
5. Verifica git status --short --branch, git log --oneline --decorate -10 y el SHA actual. Lee AGENTS.md, docs/AI_WORKFLOW.md, docs/phase0/PROGRESS.md, las secciones 4, 6, 7 y 8 de docs/phase0/FASE-0-REFACTOR-BASE.md y la sección de aceptación de docs/testing/plans/FASE-0-TEST-PLAN.md.

## 2. Cerrar pruebas antes de WP5

El propietario confirmó que la suite existente produjo 21/21 pruebas correctas (16 unitarias y 5 de integración). Eso **no cierra WP3/WP4**: faltan escenarios obligatorios de seguridad, autorización y concurrencia.

Primero ejecuta el runner desde la raíz del repositorio:

       .\scripts\Validate-PreWP5.ps1

Está diseñado para recrear exclusivamente pastel_integration_tests, nunca la base configurada POSTGRES_DB ni el volumen principal. Ejecuta restore, verificación de formato .NET, build/tests Release con TRX y sin pruebas omitidas, formato/build/lint del frontend, validación Compose y build de imágenes. No usa docker compose down -v. No compartas contraseñas ni cadenas de conexión.

El runner va a señalar IDs de cobertura que todavía faltan. Antes de WP5, implementa y ejecuta pruebas reales, aisladas y deterministas para:

- **F0-S101–F0-S116:** jerarquía de privilegios, protección de Administrator, auto-operaciones, concesión de permisos, auditoría, último administrador y matriz de acceso a /api/admin/*.
- **F0-S203–F0-S205:** refresco concurrente dentro de la ventana de gracia, reutilización fuera de la ventana y conflicto de serialización sin HTTP 500.
- **F0-S207:** respuesta de login equivalente para cuenta inexistente y contraseña errónea mediante comprobación testable del hash ficticio.
- **F0-S208-PASSWORD-LOCKOUT:** bloqueo por contraseña y espera creciente. La parte Google no bloqueada se amplía junto a WP5 y no debe declararse completa antes de tener el flujo Google.
- **F0-S209–F0-S214:** validación de configuración Production, registro local deshabilitado por defecto, política única de contraseña, excepciones al degradar un administrador, CSRF de escritura sin/con cabecera y cabeceras defensivas sin duplicados.
- **WP3-PERMISSION-EVALUATOR-SQL y WP3-REQUEST-QUERY-BUDGET:** verificar con PostgreSQL real que la consulta de PermissionEvaluator se traduce correctamente y medir el límite documentado de no más de dos consultas relevantes por petición.
- Si la evidencia del checkpoint C1 sigue ausente, completa también la prueba de línea base WP1 sobre la base SHA indicada en el plan, en un worktree temporal separado; no mezcles su código antiguo con esta rama.

Etiqueta cada prueba xUnit con [Trait("RequirementId", "F0-S101")], usando el ID correcto del caso. Las etiquetas ayudan al runner a verificar presencia, pero revisa que las aserciones prueben todo el contrato. No conviertas tests de humo o comentarios en falsos positivos. No escribas pruebas que dependan del orden, de esperas fijas, de Google real o de datos de producción. Usa PostgreSQL de pruebas; no EnsureCreated; no limpies el volumen local.

Si corriges producto al descubrir defectos, limita el cambio a lo necesario, añade regresión y registra la causa. Vuelve a ejecutar las validaciones afectadas y el runner completo. Actualiza PROGRESS.md en el mismo commit de cada checkpoint.

**No empieces el código de WP5 hasta que las pruebas obligatorias previas de WP3/WP4 y la evidencia C1 que corresponda estén cerradas.** Una vez que el runner pase completo y QA confirme la matriz, continúa directamente con WP5 en esta rama.

## 3. Empezar WP5 cuando el gate esté verde

Implementa WP5 — Google OAuth 2.0 / OIDC conforme a la sección 8 de FASE-0-REFACTOR-BASE.md. Antes de tocar archivos, revisa el código real de Identity, composición del host, opciones de autenticación, cookies, proxy/nginx, errores/auditoría y la guía docs/phase0/GOOGLE_OAUTH_SETUP.md.

Como mínimo, contempla:

- Esquemas Google + cookie externa de cinco minutos, scopes openid email profile, SaveTokens=false, PKCE verificado y callback /api/auth/google/callback.
- Endpoints /api/auth/google/start y /api/auth/google/complete, validación de returnUrl solo interno y códigos de error documentados.
- Vínculo por sub; correo no verificado; vinculación a cuenta preexistente con invalidación de credenciales/sesiones temporales; altas condicionadas por Auth:Google:AllowSignUp; cuenta bloqueada/inactiva; auditoría con antes/después.
- Deshabilitar el proveedor con configuración ausente sin impedir que la API arranque, y mantener consistente /api/auth/options.
- ClientId/ClientSecret solo por configuración o secret manager; nunca incluir secretos reales en .env.example, código, logs o commits.
- Manejador remoto falso inyectable para pruebas: no depender de llamadas a Google real en la suite automática. Deja la verificación real al propietario siguiendo GOOGLE_OAUTH_SETUP.md.
- Ajustes de callback, returnUrl, state, cookies y proxy especificados en el plan. Mantén compatible la sesión existente; no crees una segunda vía de emisión de cookies/JWT.

No te salgas a WP6–WP10 y no hagas promoción a otras ramas.

## 4. Entrega y checkpoints

- Tipo 1: checkpoint + push cada 3 minutos como máximo, incluyendo PROGRESS.md en el mismo commit.
- Commits enfocados; no acumular todo WP5 en un mega-commit.
- Informa SHA, comandos realmente ejecutados y conteos, defectos corregidos, cobertura faltante y todo lo no ejecutado.
- No afirmes que las pruebas pasan sin tener salida real de ejecución.
- No abras PR, hagas merge, cambies dev o main, ni uses git push --force sin autorización explícita.