# Identity — alcance de producto

Identity administra el acceso transversal a Pastel y la configuración de plataforma; no es una subaplicación de negocio ni sustituye los permisos de cada módulo.

## Roles de plataforma

- **Owner/Superuser:** rol de sistema reservado; tiene acceso global y privilegios exclusivos de Huella/Cosecha. Su concesión normal la controla Bootstrap; las APIs de administración no permiten asignarlo o retirarlo.
- **Administrator:** administración general, con permisos de plataforma `dashboard.view`, `settings.*` y acceso a Workspace. No se le conceden automáticamente permisos exclusivos del Owner ni permisos de negocio.
- **Member:** rol base sugerido para acceso mínimo al panel; permisos efectivos se evalúan en el servidor. Las apps pueden tener sus propios roles de membresía cuando su contrato esté implementado.

Bootstrap usa `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`; por diseño la cuenta inicial recibe Administrator y Owner/Superuser y exige cambiar la contraseña en el primer acceso. Las operaciones privilegiadas quedan registradas por separado de los logs técnicos.

## Sesión y proveedores

Login local opcional y Google OAuth/OIDC opcional (código + PKCE); Google requiere credenciales y redirect URI configurados. Pastel emite sus propias cookies `HttpOnly`, protege las escrituras con CSRF, rota refresh tokens y almacena solo su hash. El frontend consume `/api/auth/options` para mostrar opciones de acceso.

## Fixtures de QA locales

Cuando `TESTING_SEED_ENABLED=true`, Compose local solicita al sembrador de Identity que cree `test.owner@pastel.local`, `test.admin@pastel.local` y `test.member@pastel.local`. Son cuentas sintéticas con claves públicas fijas, exclusivamente para Development/Testing. Production falla si la opción permanece activa. No deben utilizarse en entornos compartidos.

## Fuera de alcance o pendiente

No están implementadas confirmación por correo, recuperación de contraseña vía email ni MFA. La administración específica de membresías por aplicación, Cosecha y las funciones del perfil público de Huella siguen pendientes. La existencia de páginas o contratos de documentación no implica validación de seguridad/UX; Build/QA debe probar endpoints, permisos, migraciones y escenarios de seguridad.
