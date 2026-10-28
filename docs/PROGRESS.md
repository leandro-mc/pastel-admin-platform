# Estado del proyecto

Único documento de estado vigente. Se actualiza **una vez por unidad de trabajo**, dentro del mismo commit (ver `docs/GIT_WORKFLOW.md`). Última actualización: 2026-10-25.

## 1. Resumen
**La Fase 0 está cerrada** (base modular, Identity, infraestructura y validación). El propietario aceptó los requisitos diferidos, que ya no son obligatorios y quedan como backlog (§5). La rama de trabajo es `refactor/modular-foundation`; no hay integración a `dev` ni a `main` todavía y no hay PR abierto.

## 2. Qué existe
- **Backend:** host .NET 10, `Pastel.SharedKernel` y `Pastel.Platform`, y un proyecto por módulo (Identity, Ágora, Brisa, Balance, Cosecha, Huella) con esquema y migración inicial propios. **Solo Identity tiene lógica de negocio**; los otros cinco son esqueletos con permisos, roles, manifiesto y fichas.
- **Identity (completo):** correo y contraseña con política por longitud, ingreso con Google, sesión con refresh tokens rotados y ventana de gracia, limitación de intentos, roles y permisos con jerarquía de privilegios (Owner/Superuser, Administrator, gestores), bloqueo y restablecimiento de contraseña, auditoría, módulos y catálogo, cuenta de arranque, sembrador de QA, validación de configuración en producción.
- **Frontend:** shell y router por módulo, cliente API (un solo refresco ante varios 401), autenticación, páginas de ingreso, cuenta y Configuración (usuarios, roles, permisos, módulos, auditoría), sistema de componentes y guardas de diseño. Los módulos de negocio son esqueletos.
- **Infraestructura:** Docker Compose, Nginx con cabeceras de seguridad sin duplicados, compilación por subconjunto de módulos, CI manual por etiqueta/aprobación (`docs/GIT_WORKFLOW.md` §3), scripts de validación en Docker y hook de pre-commit.

## 3. Validación (ejecutada por el propietario, 2026-10-24 y 25)
Backend 51/51 (formato, build Release, NuGet sin vulnerabilidades) · PostgreSQL 46/46 · frontend completo (Vitest 21/21, `npm audit` limpio, guardas) · stack aislado 10/10 (salud real del API, esquemas migrados desde base vacía, caída y recuperación de la base, cabeceras sin duplicados) · construcción de las imágenes de los cinco módulos · verificación manual de Google (cuenta nueva y vinculación a la cuenta de arranque).
**Defectos reales que esta validación encontró y corrigió:** ediciones simultáneas de un rol que se fundían, cabeceras de seguridad duplicadas en `/api/*` y advertencias por cada acceso denegado repetido.

## 4. Pendiente de producto (fuera de la Fase 0)
- **Identidad visual por aplicación**: no definida; la investigación y los prototipos están en la rama `research/requirements-and-prototypes`. Hasta entonces los tokens de `module-themes.css` son provisionales (`docs/DESIGN_SYSTEM.md`).
- **Selección de apps en el registro**: hoy el registro pide nombre, correo y contraseña y asigna solo `Member`; no existen entidades ni API de membresías. Reglas acordadas en `docs/product/PASTEL-PRODUCT-AND-UX.md`.
- **Huella** (tablas, enlace público, `noindex`), **catálogo persistente de aplicaciones**, **membresías y concesión de Cosecha por el Owner/Superuser** y **feed real de Ágora**.
- Lógica de negocio de Ágora, Brisa, Balance, Cosecha y Huella.

## 5. Backlog diferido (candidatos de la siguiente planificación de pruebas; no se trabajan sin decisión del propietario)
- **Pruebas:** eventos de seguridad con antes/después (el núcleo ya está cubierto por las de privilegios), endpoint `/api/client-errors`, límite de errores de render, expiración de token por tiempo, pantalla de sesión vencida, esperas crecientes y aislamiento de Google en el limitador, recorridos en navegador (navegación, permisos, responsive y temas), regresión frente a `dev` y revisión visual y de contraste.
- **Técnicas:** `SetUserPermissionsHandler` y `CreateRole` en transacción serializable (mismo patrón que corrigió el de roles); estrategia de reintento de EF Core ante conexiones caídas (tras reiniciar la base, la primera petición puede responder 503); nivel `Microsoft.AspNetCore` en Warning también en Development (hoy registraría la URL del callback con `code` y `state`); job de aislamiento por módulo en CI; bundle principal de ~520 kB y `app-shell.css` de 684 líneas; la importación sin extensión en `vite.config.ts` que avisa Vite.

## 6. Historia de la rama `refactor/modular-foundation`
La rama llegó a 488 commits (446 propios y 42 de `dev`); el análisis y las reglas nuevas están en `docs/GIT_WORKFLOW.md` §4. El 2026-10-25 los 446 propios se unificaron en unidades lógicas **sin cambiar el contenido final** (árbol idéntico). El estado anterior se conserva en la rama de respaldo `backup/refactor-modular-foundation-2026-10-25`; puede borrarse cuando el propietario lo decida. La rama `research/requirements-and-prototypes` nació de la historia anterior y debe rebasarse sobre la nueva (ver el informe de entrega del 2026-10-25).

## 7. Cómo continuar
1. Lee `AGENTS.md` y este documento. 2. Rama corta desde `refactor/modular-foundation` (o `dev` cuando se integre). 3. Implementa tu módulo con los esqueletos existentes y `docs/modules/<MODULO>.md`. 4. Valida con los scripts de `docs/TESTING.md` y entrega por PR con commits lógicos.
