# Validacion automatizada

## Comandos

Ejecute desde la raiz del repositorio con PowerShell y Docker Desktop iniciado:

- **.\scripts\test-backend.ps1** — restaura, verifica formato .NET, compila en Release y ejecuta pruebas unitarias.
- **.\scripts\test-frontend.ps1** — instala exactamente lo declarado en package-lock, verifica Prettier y ESLint, compila TypeScript/Vite y ejecuta las auditorias de diseño/Tailwind.
- **.\scripts\test-database.ps1** — inicia solo PostgreSQL y ejecuta las pruebas HTTP que necesitan una base real.
- **.\scripts\test-all.ps1** — ejecuta los tres bloques y presenta un resumen único aunque una de las partes falle.

Los comandos de .NET y Node se ejecutan en contenedores (mcr.microsoft.com/dotnet/sdk:10.0 y node:24-alpine). El repositorio se monta en solo lectura y cada contenedor usa una copia temporal, limpia de .env, .git, node_modules, bin y obj. Los resultados TRX se guardan en la carpeta temporal del sistema, fuera del repositorio.

## Seguridad de las pruebas PostgreSQL

La base reservada es **pastel_integration_tests**. Antes de recrearla, el script verifica la configuración resuelta de Compose y aborta si la base normal (**POSTGRES_DB**) tiene ese nombre. La prueba recrea únicamente **pastel_integration_tests**; no elimina ni recrea la base normal, no levanta la API ni el frontend, y no ejecuta **docker compose down -v**. El volumen de PostgreSQL se conserva. La base de pruebas queda disponible para inspección y se vuelve a recrear en la siguiente ejecución.

**PASTEL_TEST_CONNECTION_STRING** solo se entrega al contenedor ejecutor. **IdentityApiFactory** vuelve a verificar que el nombre de base sea exactamente **pastel_integration_tests**. No se imprime la cadena de conexión.

## Qué cubre actualmente

- **Backend:** build de toda la solución y pruebas unitarias de .NET. Las pruebas de **Pastel.IntegrationTests** se excluyen de este bloque para impedir que se salten silenciosamente por falta de una conexión PostgreSQL.
- **Base de datos:** ejecuta **tests/Pastel.IntegrationTests** con la conexión explícita; el resultado TRX debe mostrar que todas las pruebas se ejecutaron, sin fallos ni omisiones.
- **Frontend:** formato, lint, build TypeScript/Vite, pruebas Node integradas para las reglas de **check-design.mjs**, auditoría de diseño y auditoría Tailwind con umbrales.

Las auditorías Tailwind aplican las metas actuales de la Fase 0: al menos 95 % de los className con utilidades, cero clases semánticas definidas en CSS, hasta 60 líneas con @apply y ningún archivo CSS de más de 400 líneas.

## Cobertura pendiente

Aún no hay pruebas de componentes React ni de recorridos E2E en navegador. Las pruebas Node añadidas aquí prueban la guarda estática de diseño, no el comportamiento visual de la aplicación. La siguiente ampliación de frontend debe incorporar Vitest y Testing Library (junto con el lockfile generado por el gestor de paquetes) y después Playwright para recorridos críticos como login, permisos y navegación modular. Los nuevos comportamientos .NET deben incluir pruebas unitarias o de integración en el proyecto de tests del módulo correspondiente.

## Flujo de CI

GitHub Actions ejecuta las verificaciones especializadas en los cambios dirigidos a **dev** o **main**. Las pruebas locales de la rama de trabajo se pueden lanzar con **test-all.ps1** sin integrar ni fusionar ramas.
