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

La tarea `BootstrapAdminTask` utiliza `Bootstrap:AdminEmail` y `Bootstrap:AdminPassword` (en despliegue, las variables equivalentes `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`, según la configuración del entorno) para crear la cuenta administrativa inicial con cambio de contraseña obligatorio. Si la cuenta ya existe pero ha perdido el rol `Administrator`, la tarea vuelve a asignarlo, reactiva la cuenta, limpia el bloqueo de contraseña, incrementa `TokenVersion` y revoca refresh tokens activos para invalidar sesiones anteriores. La restauración genera el evento `identity.bootstrap.admin_restored`; la creación inicial genera `identity.bootstrap.admin_created`. Si la cuenta de arranque conserva su rol pero está bloqueada por intentos fallidos de contraseña, el reinicio de la API elimina ese bloqueo y registra `identity.bootstrap.admin_lockout_cleared`. Esta excepción aplica únicamente a la cuenta configurada como bootstrap y debe tratarse como recuperación de emergencia, no como rutina de desbloqueo de cuentas.

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

## Contraseñas

La política única del backend es de 12 a 128 caracteres; permite frases largas y espacios y no impone reglas de composición de mayúsculas, minúsculas, números o símbolos. Se rechazan las contraseñas incluidas en la lista común embebida. Los mensajes de validación se generan desde `PasswordPolicy`; el endpoint `/api/auth/options` y su consumo por el cliente quedan pendientes de la integración prevista en WP5/WP7. No duplique la política en el frontend.

## Rotación de claves JWT

Los access tokens incluyen el identificador `kid` en su cabecera. La API valida la clave actual y, opcionalmente, una clave anterior durante una rotación.

Procedimiento recomendado:

1. Genere una clave actual nueva y un `JWT_SIGNING_KEY_ID` nuevo.
2. Configure temporalmente la clave anterior en `JWT_PREVIOUS_SIGNING_KEY` y su identificador original en `JWT_PREVIOUS_SIGNING_KEY_ID`. Los dos identificadores deben ser distintos y ambas claves deben tener al menos 32 bytes UTF-8.
3. Tras desplegar y esperar más que la duración máxima del access token, retire la clave anterior y su identificador.
4. No incluya ninguna clave real en Git, registros o artefactos. La rotación de la clave de firma también cambia la clave derivada usada por la ventana de gracia de refresh; evite rotar exactamente durante una petición concurrente de refresh.

En el entorno `Production`, `ProductionSecurityValidationTask` impide continuar con el correo bootstrap `admin@pastel.local` o secretos conocidos de ejemplo. Configure credenciales propias mediante el almacén de secretos del entorno.

## Retención de datos de sesión y auditoría

`IdentityRetentionService` ejecuta limpieza periódica (24 horas por defecto): elimina refresh tokens expirados hace más del plazo configurado, borra el ciphertext del sucesor cuando vence su ventana de gracia y aplica la retención configurada de auditoría. `Identity:Retention:AuditLogRetentionDays` tiene un valor predeterminado de 365 días y admite entre 30 y 3650 días. Ajuste la retención según las necesidades de seguridad, soporte y cumplimiento del responsable de la plataforma.


## Ingreso con Google (OAuth 2.0 / OIDC)

Es opcional: sin `Authentication:Google:ClientId` y `ClientSecret` Google queda desactivado, la API arranca y `GET /api/auth/options` informa `google: false`.

- **Flujo:** `GET /api/auth/google/start?returnUrl=…` redirige a Google (código de autorización con PKCE, ámbitos `openid email profile`, sin guardar tokens de Google). Google vuelve a `/api/auth/google/callback`; la identidad verificada queda 5 minutos en la cookie `__Host-pastel_ext` (`HttpOnly`, `Secure`, `SameSite=Lax`). `GET /api/auth/google/complete` aplica las reglas de cuenta, emite **las mismas cookies de sesión** que el ingreso con contraseña, borra la cookie externa y redirige.
- **`returnUrl`:** solo rutas internas conocidas (sin esquema ni host, sin `//` ni `/\`, también tras decodificar); si no cumple, se usa `/`. Viaja dentro del estado protegido de OAuth.
- **Identidad:** la clave estable es el `sub` de Google (tabla `identity.external_logins`), no el correo. Solo se vincula por correo si Google lo declara verificado.
- **Reglas de cuenta:**
  | Situación | Resultado |
  |---|---|
  | Vínculo existente por `sub` | Ingreso, si la cuenta está activa. El bloqueo por contraseña **no** aplica |
  | Sin vínculo y correo no verificado | `email_unverified` |
  | Sin vínculo y existe cuenta con ese correo | Se vincula; se deja la contraseña en nulo, `MustChangePassword=false`, `TokenVersion++` y se revocan los refresh tokens; auditoría `auth.google.linked` |
  | Sin vínculo y correo nuevo | Se crea una cuenta `Member` sin contraseña (`auth.google.registered`) si `Auth:Google:AllowSignUp` es `true`; si no, `signup_closed` |
  | Cuenta inactiva | `account_disabled` (mensaje genérico) |
- **Por qué la vinculación invalida la contraseña:** si alguien creó antes una cuenta con el correo de otra persona (o quedó una contraseña temporal sin usar), esa contraseña y esas sesiones dejan de servir en cuanto la persona dueña del correo ingresa con Google. El costo es que una cuenta vinculada pierde el ingreso por contraseña; para recuperarlo, administración restablece la contraseña. El primer administrador que use su cuenta de Google debe tener el mismo correo en `BOOTSTRAP_ADMIN_EMAIL`.
- **Errores:** siempre redirigen a `/ingresar?error=<codigo>` con `google_denied`, `email_unverified`, `account_disabled`, `signup_closed` o `failed`. Los registros no incluyen ni el `code` ni el `state` de OAuth, ni el correo.
- **Configuración:** `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (ver `docs/phase0/GOOGLE_OAUTH_SETUP.md`), `APP_PUBLIC_BASE_URL` (`App:PublicBaseUrl`, define el `redirect_uri` sin depender del proxy) y `AUTH_GOOGLE_ALLOW_SIGNUP`. nginx debe enviar `Host $http_host` y `X-Forwarded-Host $http_host`; con `$host` se pierde el puerto y Google responde `redirect_uri_mismatch`.
- **Límites conocidos:** el secreto no debe versionarse ni registrarse; rótelo en la consola de Google si se expone. Las claves de Data Protection del esquema de correlación de OAuth deben persistirse antes de producción (ver advertencia de Development en `PROGRESS.md`).
