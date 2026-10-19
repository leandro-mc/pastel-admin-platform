# Modelo de seguridad

## Identidad y sesión

El access JWT vive en cookie `HttpOnly`, `Secure`, `SameSite=Strict`, con una vida predeterminada de 10 minutos. El refresh token es un secreto aleatorio independiente cuyo hash se almacena en PostgreSQL y rota en cada refresh. Nunca se almacena el token original de renovación. Una versión de token asociada a la cuenta permite invalidar accesos por bloqueo o cambios sensibles.

Las solicitudes que cambian estado verifican un CSRF double-submit token en cookie y cabecera. Mantener frontend y API bajo una misma origin evita ampliar innecesariamente CORS.

## Permisos y jerarquía administrativa

Las policies `permission:<code>` se resuelven dinámicamente desde el catálogo de permisos. La consulta evalúa primero que el módulo esté habilitado, luego las excepciones individuales y finalmente los permisos heredados de roles. El servidor es la autoridad; el frontend sólo adapta la navegación.

El rol `Administrator` es un rol de sistema: no puede editarse ni eliminarse mediante las operaciones normales de administración. Las operaciones administrativas se protegen con `IPrivilegeGuard`:

- Una persona que no sea `Administrator` no puede actuar sobre su propia cuenta ni sobre una cuenta `Administrator` mediante cambios de roles, excepciones de permisos, bloqueo/desbloqueo o restablecimiento de contraseña.
- No puede asignar ni retirar el rol `Administrator`, conceder permisos que no posee ni modificar un rol al que ella misma pertenece.
- Asignar un rol se considera una concesión de todos los permisos que contiene; por eso la protección valida también los permisos de los roles agregados.
- Los cambios que pudieran eliminar al último administrador activo se realizan bajo transacción serializable y deben ser rechazados si violan esa invariante.
- Cuando un usuario se convierte en `Administrator`, se eliminan sus excepciones individuales de permisos, pues no aplican a una cuenta administrativa.
- Las denegaciones de privilegios responden con HTTP 403 y un código `identity.privilege.*`; se registran como advertencia y generan un evento de auditoría `identity.privilege.denied`. Los registros no deben incluir contraseñas, tokens ni secretos.

## Cuenta de arranque y acceso de emergencia (*break-glass*)

La tarea `BootstrapAdminTask` utiliza `Bootstrap:AdminEmail` y `Bootstrap:AdminPassword` (en despliegue, las variables equivalentes `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`, según la configuración del entorno) para crear la cuenta administrativa inicial con cambio de contraseña obligatorio. Si la cuenta ya existe pero ha perdido el rol `Administrator`, la tarea vuelve a asignarlo, reactiva la cuenta e incrementa `TokenVersion` para invalidar los access tokens anteriores. La restauración genera el evento `identity.bootstrap.admin_restored`; la creación inicial genera `identity.bootstrap.admin_created`.

Este mecanismo es el acceso de emergencia (*break-glass*), no un sustituto de la administración ordinaria. Protege la cuenta de arranque como una credencial de alta sensibilidad: configura un correo controlado por el responsable de la plataforma, usa una contraseña larga y aleatoria, no la guardes en Git ni en logs y suminístrala mediante secretos del entorno fuera de desarrollo. Tras la creación inicial, inicia sesión y cambia inmediatamente la contraseña temporal. No uses los valores de desarrollo de `.env.example` fuera de una máquina local.

En producción, la aplicación debe negarse a iniciar si la configuración de arranque o la clave de firma JWT todavía contienen valores inseguros de ejemplo (requisito de WP4). No publiques ni documentes valores reales de estas credenciales.

## Principios de operación

- Denegar por defecto, validar cada petición y aplicar mínimo privilegio.
- Usar errores de login genéricos para reducir enumeración de cuentas.
- Aplicar bloqueo temporal y límites por IP y cuenta en endpoints sensibles.
- Registrar cambios administrativos sin guardar credenciales; auditar antes/después cuando corresponda.
- Rotar claves y secretos, restringir la conectividad a PostgreSQL y usar HTTPS en despliegue real.

## Límites conocidos de v0.1

No incluye confirmación de correo, recuperación de contraseña por email, MFA ni notificaciones administrativas. El soporte SSO/OIDC se implementará en WP5 de la Fase 0; hasta entonces no debe considerarse disponible. La verificación de bloqueo/versionado de usuario se hace por petición; para una plataforma de mayor escala se puede optimizar con caché invalidable o un proveedor de identidad dedicado, manteniendo el mismo modelo de permisos. Antes de producción, agregar pruebas de integración de los flujos de seguridad, evaluación de dependencias y revisión independiente.
