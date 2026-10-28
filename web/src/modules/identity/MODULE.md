# Identity — ficha técnica frontend

Estado: **implementación publicada; validación de Build/QA pendiente**.

- Código de manifiesto: `identity`; archivo: `web/src/modules/identity/manifest.ts`.
- Dependencias permitidas: solo `@/core/*`. No importar otra subapp ni el shell desde sus páginas.
- Contratos HTTP y validación: `api/queries.ts`, `api/mutations.ts`, `api/schemas.ts`; errores traducidos en `errors.ts` y `strings.ts`.
- El frontend solo adapta navegación según permisos; nunca sustituye la autorización backend.

## Rutas actuales

- `/ingresar`: ingreso/registro según `GET /api/auth/options`, contraseña o Google si está configurado.
- `/cuenta` y `/cuenta/contrasena`: perfil/seguridad y cambio de contraseña.
- `/configuracion`: resumen de Workspace; requiere `platform.workspace.access`.
- `/configuracion/usuarios`, `/configuracion/roles`, `/configuracion/modulos`, `/configuracion/auditoria`.
- `/configuracion/accesos/usuario/:userId` y `/configuracion/accesos/rol/:roleId`.

## Límites

- Workspace general administra solo alcance de plataforma; no gestiona membresías de aplicaciones ni concede permisos reservados a Owner.
- No existe aún la gestión propia de membresías de Cosecha; Huella no tiene editor/endpoint real del perfil público; Ágora no dispone todavía del feed de contenido real.
- Pruebas de frontend: Vitest, Testing Library y axe (cliente API, diálogos, login) y un smoke de Playwright; los recorridos completos en navegador están diferidos (`docs/PROGRESS.md`).

La validación completa en navegador con usuarios Owner, Administrator y Member, ambas apariencias, móvil y escritorio, queda diferida (`docs/PROGRESS.md`).
