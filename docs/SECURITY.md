# Modelo de seguridad

## Identidad y sesión

El access JWT vive en cookie `HttpOnly`, `Secure`, `SameSite=Strict`, con una vida predeterminada de 10 minutos. El refresh token es un secreto aleatorio independiente cuyo hash se almacena en PostgreSQL y rota en cada refresh. Nunca se almacena el token original de renovación. Una versión de token asociada a la cuenta permite invalidar accesos por bloqueo o cambios sensibles.

Las solicitudes que cambian estado verifican un CSRF double-submit token en cookie y cabecera. Mantener frontend y API bajo una misma origin evita ampliar innecesariamente CORS.

## Permisos

Las policies `permission:<code>` se resuelven dinámicamente desde el catálogo de permisos. La consulta evalúa primero que el módulo esté habilitado, luego las excepciones individuales y finalmente los permisos heredados de roles. El servidor es la autoridad; el frontend sólo adapta la navegación.

## Principios de operación

- Denegar por defecto, validar cada petición y aplicar mínimo privilegio.
- Usar errores de login genéricos para reducir enumeración de cuentas.
- Aplicar bloqueo temporal y límites por IP en endpoints sensibles.
- Registrar cambios administrativos sin guardar credenciales.
- Rotar claves y secretos, restringir la conectividad a PostgreSQL y usar HTTPS en despliegue real.

## Límites conocidos de v0.1

No incluye confirmación de correo, recuperación de contraseña por email, MFA, SSO/OIDC, notificaciones administrativas ni monitoreo de amenazas. La verificación de bloqueo/versionado de usuario se hace por petición; para una plataforma de mayor escala se puede optimizar con caché invalidable o un proveedor de identidad dedicado, manteniendo el mismo modelo de permisos. Antes de producción, agregar pruebas de integración de los flujos de seguridad, evaluación de dependencias y revisión independiente.
