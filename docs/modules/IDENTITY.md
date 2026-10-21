# Identity — alcance de producto

Identity administra el acceso transversal a Pastel y la configuración de plataforma; no es una subaplicación de negocio ni sustituye los permisos de cada módulo.

## Roles de plataforma

- **Owner/Superuser:** rol de sistema reservado; tiene acceso global y privilegios exclusivos de Huella/Cosecha. Su concesión normal la controla Bootstrap; las APIs de administración no permiten asignarlo o retirarlo.
- **Administrator:** administración general, con permisos de plataforma `dashboard.view`, `settings.*` y acceso a Workspace. No se le conceden automáticamente permisos exclusivos del Owner ni permisos de negocio.
- **Member:** rol base sugerido para acceso mínimo al panel; permisos efectivos se evalúan en el servidor. Las apps pueden tener sus propios roles de membresía cuando su contrato esté implementado.

Bootstrap usa `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`; por diseño la cuenta inicial recibe Administrator y Owner/Superuser y exige cambiar la contraseña en el primer acceso. La contraseña de bootstrap se establece al crear la cuenta: reiniciar el servicio o cambiar la variable no sustituye la contraseña de una cuenta que ya existe. Las operaciones privilegiadas quedan registradas por separado de los logs técnicos.

## Autorregistro y recuperación local

El endpoint de autorregistro crea usuarios de rol **Member**, no administradores. En el perfil Compose de desarrollo local, el autorregistro está habilitado por defecto; puede desactivarse con `AUTH_LOCAL_SELF_REGISTRATION_ENABLED=false` en `.env`. La configuración general de la aplicación lo mantiene desactivado salvo que el entorno lo habilite explícitamente; no habilite el autorregistro público en un entorno compartido sin decidirlo expresamente.

La plantilla local activa `TESTING_SEED_ENABLED=true` y proporciona las cuentas sintéticas `test.owner@pastel.local`, `test.admin@pastel.local` y `test.member@pastel.local`, solo para Development/Testing. Si la contraseña del administrador de bootstrap dejó de coincidir, use una de estas cuentas de prueba local para recuperar el acceso y restablecerla desde Administración de usuarios. No borre el volumen de PostgreSQL para resolver un problema de credenciales.

## Sesión y proveedores

Login local opcional y Google OAuth/OIDC opcional (código + PKCE); Google requiere credenciales y redirect URI configurados. Pastel emite sus propias cookies `HttpOnly`, protege las escrituras con CSRF, rota refresh tokens y almacena solo su hash. El frontend consume `/api/auth/options` para mostrar opciones de acceso.

## Fixtures de QA locales

Cuando `TESTING_SEED_ENABLED=true`, Compose local solicita al sembrador de Identity que cree `test.owner@pastel.local`, `test.admin@pastel.local` y `test.member@pastel.local`. Son cuentas sintéticas con claves públicas fijas, exclusivamente para Development/Testing. Production falla si la opción permanece activa. No deben utilizarse en entornos compartidos.

## Fuera de alcance o pendiente

No están implementadas confirmación por correo, recuperación de contraseña vía email ni MFA. La administración específica de membresías por aplicación, Cosecha y las funciones del perfil público de Huella siguen pendientes. La existencia de páginas o contratos de documentación no implica validación de seguridad/UX; Build/QA debe probar endpoints, permisos, migraciones y escenarios de seguridad.
