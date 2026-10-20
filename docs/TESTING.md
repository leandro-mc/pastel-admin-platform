# Validacion automatizada

## Comandos

Ejecute desde la raiz del repositorio con PowerShell y Docker Desktop iniciado:

- **.\scripts\format-frontend.ps1** — aplica Prettier dentro de Docker y copia de vuelta solo los archivos que administra. Modifica el working tree; revise git diff antes de crear un commit.
- **.\scripts\test-backend.ps1** — restaura, verifica formato .NET, compila en Release y ejecuta pruebas unitarias.
- **.\scripts\test-frontend.ps1** — instala exactamente lo declarado en package-lock, verifica Prettier y ESLint, compila TypeScript/Vite y ejecuta las auditorias de diseño/Tailwind.
- **.\scripts\test-database.ps1** — inicia solo PostgreSQL y ejecuta las pruebas HTTP que necesitan una base real.
- **.\scripts\test-all.ps1** — ejecuta los tres bloques y presenta un resumen único aunque una de las partes falle.

En una comprobación local preliminar se informaron 112 archivos sin formato. Sin embargo, en la ejecución de CI del commit `d465a347` Prettier pasó y reportó que todos los archivos coinciden con el formato. Si tu copia local aún falla, sincroniza primero la rama; solo si sigue fallando, ejecuta **.\scripts\format-frontend.ps1**, revisa `git diff` y luego vuelve a correr **.\scripts\test-frontend.ps1**. El script de formato modifica el working tree y no crea commits.

Los comandos de validación de .NET y Node se ejecutan en contenedores (mcr.microsoft.com/dotnet/sdk:10.0 y node:24-alpine). En los scripts de prueba, el repositorio se monta en solo lectura y cada contenedor usa una copia temporal, limpia de .env, .git, node_modules, bin y obj. La excepción explícita es format-frontend.ps1: monta el repositorio con escritura para copiar de vuelta únicamente las rutas administradas por Prettier; no copia node_modules ni modifica rutas fuera de ese conjunto. Los resultados TRX se guardan en la carpeta temporal del sistema, fuera del repositorio.

## Seguridad de las pruebas PostgreSQL

La base reservada es **pastel_integration_tests**. Antes de recrearla, el script verifica la configuración resuelta de Compose y aborta si la base normal (**POSTGRES_DB**) tiene ese nombre. La prueba recrea únicamente **pastel_integration_tests**; no elimina ni recrea la base normal, no levanta la API ni el frontend, y no ejecuta **docker compose down -v**. El volumen de PostgreSQL se conserva. La base de pruebas queda disponible para inspección y se vuelve a recrear en la siguiente ejecución.

**PASTEL_TEST_CONNECTION_STRING** y **ConnectionStrings__Default** solo se entregan al contenedor ejecutor, antes de iniciar el proceso .NET. La segunda variable hace que la cadena exista desde el arranque de `WebApplication.CreateBuilder`, antes del registro inmediato de módulos. **IdentityApiFactory** vuelve a verificar que el nombre de base sea exactamente **pastel_integration_tests**. No se imprime la cadena. Si ejecutas las pruebas manualmente, configura ambas variables con la misma cadena aislada.

## Qué cubre actualmente

- **Backend:** build de toda la solución y pruebas unitarias de .NET. Las pruebas de **Pastel.IntegrationTests** se excluyen de este bloque para impedir que se salten silenciosamente por falta de una conexión PostgreSQL.
- **Base de datos:** ejecuta **tests/Pastel.IntegrationTests** con la conexión explícita; el resultado TRX debe mostrar que todas las pruebas se ejecutaron, sin fallos ni omisiones.
- **Frontend:** formato, lint, build TypeScript/Vite, pruebas Node integradas para las reglas de **check-design.mjs**, auditoría de diseño y auditoría Tailwind con umbrales.

Las auditorías Tailwind aplican las metas actuales de la Fase 0: al menos 95 % de los className con utilidades, cero clases semánticas definidas en CSS, hasta 60 líneas con @apply y ningún archivo CSS de más de 400 líneas.

## Cobertura pendiente

Aún no hay pruebas de componentes React ni de recorridos E2E en navegador. Las pruebas Node añadidas aquí prueban la guarda estática de diseño, no el comportamiento visual de la aplicación. La siguiente ampliación de frontend debe incorporar Vitest y Testing Library (junto con el lockfile generado por el gestor de paquetes) y después Playwright para recorridos críticos como login, permisos y navegación modular. Los nuevos comportamientos .NET deben incluir pruebas unitarias o de integración en el proyecto de tests del módulo correspondiente.

## Flujo de CI

GitHub Actions ejecuta las verificaciones especializadas en pushes a **main**, **dev** y **refactor/modular-foundation**, y en solicitudes de integración dirigidas a **main**, **dev** o **refactor/modular-foundation**. Las pruebas locales de la rama de trabajo se pueden lanzar con **test-all.ps1** sin integrar ni fusionar ramas.

## Estado de validación actual (CI, 2026-10-20)

Última ejecución verificada: [CI del commit d465a347](https://github.com/leandro-mc/pastel-admin-platform/actions/runs/39346150864).

- **Backend: aprobado.** Restauración, `dotnet format --verify-no-changes`, build Release y 34/34 pruebas unitarias aprobadas; 0 fallidas y 0 omitidas.
- **Frontend: aprobado.** Prettier, ESLint, TypeScript/Vite, ocho pruebas Node de la guarda de diseño, `check-design` y `tailwind-audit --check` pasaron.
- **Integración PostgreSQL: bloqueada por el modelo actual.** Los cinco tests arrancan el host, pero EF Core lanza `PendingModelChangesWarning`: `IdentityDbContext` contiene `ExternalLogin`, pero el snapshot y la migración inicial no tienen todavía esa entidad. Hace falta la migración incremental de Identity que figura pendiente en WP5. No se suprime esta advertencia porque encubre una discrepancia real del esquema.
- **Arranque de la pila: bloqueado por la misma causa.** La construcción de imágenes de API/web pasó; el smoke test de arranque falló cuando el API intentó aplicar migraciones de Identity. Al corregir WP5 podrían aparecer más bloqueos de migraciones de módulos señalados en WP6.

La suite de pruebas está funcionando: el estado global queda **fallido mientras no se corrija la deuda de migraciones**. No interpretes ese fallo de aplicación como una aprobación de PostgreSQL.
