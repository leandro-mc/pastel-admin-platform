# CCR-008 — Autorregistro local y recuperación de administrador

- **Estado:** autorizado mediante solicitud directa del propietario el 2026-10-20; configuración y documentación actualizadas en `refactor/modular-foundation`, pendientes de validación local.
- **Ámbito:** corregir dos problemas de usabilidad de Identity observados después del arranque local de WP9: credenciales antiguas de la cuenta bootstrap y opción de autorregistro oculta.
- **Motivo:** el propietario confirmó que Compose y la app responden correctamente, pero `POST /api/auth/login` devuelve 401 para la cuenta de administrador y no aparece la opción de registro simple.

## Diagnóstico

1. `BootstrapAdminTask` establece el hash de contraseña al crear la cuenta. Para una cuenta existente, restaura roles que falten y puede limpiar un bloqueo; no restablece la contraseña en cada arranque. Por tanto, cambiar `BOOTSTRAP_ADMIN_PASSWORD` no es un procedimiento de recuperación para una cuenta ya creada.
2. `GET /api/auth/options` devuelve `localRegistration=true` solo si `Auth:Local:Enabled` y `Auth:Local:SelfRegistrationEnabled` están activos. El frontend ya oculta/muestra el enlace según esa respuesta; el endpoint de registro y su asignación básica a Member siguen implementados.
3. La plantilla de entorno y la configuración Compose local mantenían el autorregistro desactivado, por eso desaparecía de la interfaz.

## Cambio aprobado

- Habilitar el autorregistro de contraseña en el perfil local de Compose y en `.env.example`, respetando una variable explícita `AUTH_LOCAL_SELF_REGISTRATION_ENABLED=false`.
- Mantener desactivado el autorregistro por defecto en la configuración general (`appsettings.json`), para no abrirlo involuntariamente fuera del perfil de desarrollo.
- Documentar que el valor de bootstrap no cambia la contraseña de una cuenta existente y que las fixtures `test.owner` son un recurso exclusivo de Development/Testing para recuperar acceso local y restablecer la contraseña desde Administración de usuarios.
- Añadir el diagnóstico y los resultados reales de las pruebas aportados por el propietario a `docs/phase0/PROGRESS.md`.

## Criterios de aceptación

- En el perfil Compose local, `GET /api/auth/options` devuelve `localRegistration=true` cuando el entorno no establece una opción explícita.
- Con `AUTH_LOCAL_SELF_REGISTRATION_ENABLED=false`, el endpoint de opciones mantiene `localRegistration=false`.
- Un registro nuevo recibe solo el rol Member y no obtiene permisos de Administrator ni Owner/Superuser.
- Los cambios de `BOOTSTRAP_ADMIN_PASSWORD` no alteran silenciosamente una contraseña ya establecida.
- No se borran volúmenes ni bases de datos, no se cambian credenciales de usuarios existentes, no se abre un PR, no se integra en `dev`/`main` y no se ejecuta CI.

## Validación pendiente

El propietario aportó resultados: compilación de backend y frontend correctas, 34/34 pruebas unitarias .NET y 5/5 pruebas de integración PostgreSQL aprobadas. `scripts/test-all.ps1` sigue fallido por formato .NET (`ENDOFLINE`/`CHARSET`), Prettier (127 archivos) y un color sin token en `app-shell.css:76`. La configuración modificada en esta CCR no se ha reconstruido ni validado en un nuevo arranque. No declarar la validación completa aprobada hasta atender dichos hallazgos y volver a ejecutar las comprobaciones afectadas.
