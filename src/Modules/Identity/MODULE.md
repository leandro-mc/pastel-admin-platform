# Identity — ficha técnica backend

Estado: **implementación publicada; Build/QA pendientes**. No se considera validada por compilar el resto de la plataforma.

- Código: `identity`; esquema PostgreSQL: `identity`.
- Proyecto: `src/Modules/Identity/Pastel.Modules.Identity`.
- Contexto: `IdentityDbContext`; migraciones propias. No usar `EnsureCreated`.
- Responsabilidad: sesión, login local/Google, cuentas, roles, permisos de plataforma, catálogo de módulos y auditoría.
- Identity siempre se incluye en cualquier build `PASTEL_MODULES`.

## Contratos actuales

- `/api/auth/options`, `/api/auth/csrf`, login, registro si está habilitado, refresh, logout, cuenta actual y cambio de contraseña.
- Google opcional: `/api/auth/google/start` y `/api/auth/google/complete`, con callback según `App:PublicBaseUrl`.
- Administración: usuarios, roles, permisos, módulos y auditoría en `/api/admin/*`.
- Permisos funcionales: `dashboard.view`, `settings.*` y permisos reservados `platform.*`.
- La autorización se aplica en servidor con `RequirePermission`, `RequireSession` o `AllowAnonymousExplicit`; denegación por defecto.
- Las cookies de sesión son `HttpOnly`; las escrituras verifican CSRF. Refresh tokens se almacenan como hash y se rotan.
- El registro de login/Google no debe revelar si una cuenta existe; nunca registrar contraseñas, tokens, cookies, OAuth `code` o `state`.

## Arranque y privilegios

- `ProductionSecurityValidationTask` (orden -100) rechaza secretos de ejemplo y `TestingSeed:Enabled=true` en Production.
- `CatalogSyncTask` (10) sincroniza permisos y roles de sistema.
- `BootstrapAdminTask` (20) crea/restaura el administrador de arranque y el rol Owner/Superuser.
- `TestingSeedUsersTask` (30) crea tres fixtures únicamente cuando `TestingSeed:Enabled=true` y el entorno es Development/Testing.
- Administrator general no equivale a Owner/Superuser; las API administrativas no pueden conceder el rol Owner.

## Pendientes explícitos

Validado en PostgreSQL real (46/46): sesiones y refresh concurrentes, jerarquía de privilegios, CSRF, Google con el handler directo, migraciones desde base vacía, errores, logs y sembrador de QA; Google real se verificó a mano. Confirmar siempre que el sembrador de QA (`TESTING_SEED_ENABLED`) no esté activo en ningún entorno compartido. El resto de pruebas diferidas está en `docs/PROGRESS.md`.
