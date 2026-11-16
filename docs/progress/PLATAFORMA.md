# Progreso — Plataforma (Identity, shell e infraestructura)

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-15.

## Estado
- **Identity:** completo — correo y contraseña, Google, sesión con refresh rotado y ventana de gracia, limitación de intentos, roles y permisos con jerarquía de privilegios, bloqueo y restablecimiento, auditoría, catálogo de módulos, cuenta de arranque, sembrador de QA y validación de configuración en producción. Detalle: `src/Modules/Identity/MODULE.md`.
- **Shell y frontend base:** router por módulo, cliente API (un solo refresco ante varios 401), páginas de cuenta y Configuración, sistema de componentes, modo desarrollador («Ver como») y guardas de diseño.
- **Infraestructura:** Docker Compose, nginx con cabeceras de seguridad sin duplicados, compilación por subconjunto (`PASTEL_MODULES`), CI por aprobación o etiqueta, scripts de validación en Docker y hook de pre-commit.

## Última validación
- 2026-11-15, sobre `feat/huella-mvp` (contiene `dev` sin cambios en Identity): `test-backend.ps1` completo (Identity 51/51, arquitectura 6/6), `test-database.ps1` 58/58 (incluye `DeveloperModeTests` y la regresión de `CatalogSyncTask`), `test-frontend.ps1` completo y `docker compose up --build` sano sobre una base ya existente. Esto cierra lo que había quedado «sin validar» del rediseño del shell y de la revisión de identificadores (`docs/HISTORY.md`).
- Google real se verificó a mano en la Fase 0.

## Por verificar o pendiente
- **Decisión S7** (`alsoActiveOn` y `group` en el manifiesto): sin ratificar.
- **Accesibilidad de `core/ui`:** foco visible bajo 3:1 en tema claro (1,55:1 y 2,4:1) y `--muted` como texto a 4,44:1 (`docs/design/SHELL_VALIDATION.md` §6).
- `CatalogSyncTask` conserva la limpieza del rol heredado «Huella — Propietario»; puede borrarse cuando se confirme que ninguna base lo tiene.
- Sin lector de pantalla real, dispositivos físicos ni otros navegadores (Etapa 2).
