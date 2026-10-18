<!-- Entrada de la Fase 0: análisis del estado de la rama dev (2026-10-17). No es normativo; la normativa está en FASE-0-REFACTOR-BASE.md -->
# Análisis del estado actual — rama `dev`

| | |
|---|---|
| **Repositorio** | `leandro-mc/pastel-admin-platform` |
| **Rama analizada** | `dev` (única fuente de este informe) |
| **Commit** | `b705614` — "feat: refine admin UI and fix full-screen dialogs" (2026-10-17) |
| **Fecha del análisis** | 2026-10-17 |
| **Tipo de análisis** | Estático (lectura de código, historial, PRs, CI y configuración), más ejecución real del frontend |

---

## 1. Alcance y método

**Qué revisé:** todo el código de `src/` (≈2 100 líneas de C#), `tests/`, `web/` (≈6 200 líneas entre TS, TSX y CSS), `compose.yaml`, Dockerfiles, `deploy/nginx`, `.github/`, `docs/`, `README.md`, `AGENTS.md`, el historial de commits de `dev`, los PRs integrados en `dev` (#12 a #21) y las ejecuciones de CI sobre `dev`.

**Qué ejecuté:** en `web/`, `npm ci`, `npm run build`, `npm run lint`, `npm run format:check`, `npm audit` y `npm outdated`.

**Qué no pude ejecutar:** el backend. El entorno no tiene `dotnet` ni acceso a NuGet, así que no compilé ni corrí las pruebas de .NET. Me apoyo en el CI: las 8 ejecuciones registradas sobre `dev` terminaron en verde.

**Nota sobre confianza:** los hallazgos de seguridad vienen de leer el código; no los he explotado. Conviene validarlos antes de actuar.

---

## 2. Resumen ejecutivo

La base es buena para un proyecto de dos días: arquitectura por capas, un modelo de sesión cuidado, CI que levanta el stack y documentación muy completa y honesta sobre sus límites. Los puntos débiles se concentran en cuatro áreas:

1. **Delegación de privilegios en administración:** varios permisos "menores" equivalen en la práctica a ser administrador.
2. **Sesión del frontend:** nunca se renueva mientras se usa la app.
3. **Pruebas:** solo 12 casos, sobre funciones puras.
4. **Brechas entre lo documentado y lo implementado:** incluida la integración de Tailwind (sección 3).

| # | Hallazgo | Severidad |
|---|---|---|
| S1 | Escalada de privilegios por permisos administrativos sin jerarquía | Alta |
| S2 | La SPA no renueva la sesión tras 10 minutos | Alta |
| T1 | Cobertura de pruebas mínima, sin pruebas de integración | Alta |
| S3 | Bloqueo de cuenta como DoS, enumeración por tiempos, admin predecible | Media |
| B1 | Hasta 5 consultas a BD por petición autenticada | Media |
| D1 | Sin TLS, `AllowedHosts` fijo y IP real detrás de otro proxy | Media |
| D2 | Builds web no reproducibles (se ignora `package-lock.json`) | Media |
| F1 | Diálogos modales sin Escape ni gestión de foco | Media |
| F2 | Tailwind usado solo como preprocesador `@apply` | Media (mantenibilidad) |
| G1 | Sin protección de ramas, historial con estrategias de merge mezcladas | Media |

---

## 3. Respuesta sobre Tailwind CSS: ¿está el mismo problema en `dev`?

**Sí. El problema existe en `dev`**, y el último PR lo acentuó.

### Qué dice la documentación de `dev`

- `AGENTS.md`: "Para nuevos estilos, usa utilidades Tailwind en JSX… `@apply` se reserva para patrones semánticos reutilizados y selectores complejos."
- `docs/ARCHITECTURE.md`: "Preferencia para código nuevo: escribe las clases de utilidad directamente en `className`" y "Usa `@apply` solo para patrones visuales compartidos o selectores complejos."

### Qué hay realmente en `dev`

Medido sobre el árbol actual (`b705614`), con un analizador que extrae todos los literales dentro de cada `className`:

| Métrica | Valor |
|---|---|
| Atributos `className` en TSX | 346 (en 21 archivos) |
| **Utilidades Tailwind usadas en JSX** | **0** (ninguna, ni siquiera variantes `hover:`, `focus-visible:`, `md:`, `dark:`) |
| Clases semánticas definidas en `styles.css` | 217 |
| Líneas de `styles.css` | 2 209 |
| Líneas con `@apply` | 592 (2 119 utilidades dentro de `@apply`, 777 distintas) |
| Declaraciones CSS crudas fuera de tokens y keyframes | 0 |
| Clases semánticas usadas **una sola vez** en el TSX | **146 de 217 (67 %)** |
| Clases usadas 2 o más veces | 67 |
| Clases definidas y sin uso | 4 (`form-hint`, `override-list`, `override-row`, `space-top`) |

**Conclusión técnica:** Tailwind funciona aquí como un compilador de `@apply`. Todo el estilo vive en una hoja monolítica con clases semánticas (`startup-screen`, `brand-mark`, …) y el JSX no contiene utilidades. Como dos tercios de esas clases se usan una sola vez, no son "patrones compartidos": es una hoja de estilos de componentes escrita con sintaxis Tailwind.

### Cómo evolucionó dentro de `dev`

| Punto del historial | Utilidades en JSX | Líneas de `styles.css` | `@apply` |
|---|---|---|---|
| PR #19 "migrar estilos a Tailwind" (`f205014`) | 0 | 786 | 482 |
| Tras el PR #20 (`b176081`) | **45 distintas** (101 usos) | 786 | 482 |
| PR #21, commit final (`b705614`) | **0** | **2 209** | 592 |

- El PR #19 convirtió CSS plano a `@apply`; no llevó utilidades al JSX, a pesar de su título ("migrate component styles to Tailwind utilities").
- Tras el PR #20 el código nuevo sí usaba utilidades en JSX, como pide la guía.
- El PR #21 las volvió a centralizar en `styles.css`, que pasó de 786 a 2 209 líneas (+1 423).

### Impacto real

- **Funcional/rendimiento:** sin problema. El CSS generado pesa 74 KB (13,5 KB gzip) y el build tarda menos de 1 s.
- **Mantenibilidad:** se pierde la co-ubicación estilo/markup, que es el principal beneficio de Tailwind. Un archivo de 2 200 líneas es difícil de revisar y propenso a conflictos de merge. Cualquier cambio visual exige editar dos archivos.
- **Coherencia:** `AGENTS.md` y `ARCHITECTURE.md` piden utilidades en JSX, mientras que el código y la propia descripción de `ARCHITECTURE.md` ("los componentes usan `@apply`") describen otra cosa. Hay que decidir cuál de las dos es la regla real.

### Opciones

1. **Alinear el código con la guía:** migrar gradualmente a utilidades en JSX, empezando por las 146 clases de un solo uso, y dejar en `styles.css` solo tokens, tema y los patrones realmente compartidos (las 67 clases con 2+ usos).
2. **Alinear la guía con el código:** declarar oficialmente "CSS semántico con `@apply`" y corregir `AGENTS.md`/`ARCHITECTURE.md`. Es válido, pero entonces conviene dividir `styles.css` por feature.

Mezclar ambas sin decidir es lo que provoca el vaivén visto entre #19, #20 y #21.

---

## 4. Fortalezas

- **Sesión y tokens:** JWT en cookie `HttpOnly`/`Secure`/`SameSite=Strict`; refresh token guardado solo como hash, con rotación y detección de reutilización; `TokenVersion` para invalidar sesiones; validación estricta del JWT (algoritmo fijado, issuer, audience, tolerancia de 30 s); la clave de firma se valida al arrancar (mínimo 32 bytes).
- **CSRF y cabeceras:** double-submit con comparación en tiempo constante; CSP restrictiva en nginx (`script-src 'self'`, `style-src 'self'`).
- **Autorización:** policies dinámicas `permission:<codigo>`, regla "deny gana", módulo deshabilitado deniega todo (con pruebas unitarias), y `FallbackPolicy` que exige autenticación por defecto.
- **Invariantes protegidas:** el último administrador activo no puede quitarse ni bloquearse (transacción serializable); la auditoría se escribe en la misma transacción que el cambio.
- **Contenedores:** API con `read_only`, `tmpfs`, usuario no root y `no-new-privileges`; API y web publicadas solo en `127.0.0.1`.
- **CI útil:** compila toda la solución, ejecuta las pruebas, valida formato/build/lint del frontend y levanta Docker verificando que las migraciones crean el esquema. Tarda cerca de 1 minuto (container-build 62 s, backend 31 s, frontend 10 s) y las 8 ejecuciones en `dev` están en verde.
- **Frontend sano:** `build`, `lint` y `format:check` limpios; 0 vulnerabilidades en `npm audit`; sin `innerHTML`/`dangerouslySetInnerHTML`; el único uso de `localStorage` es el tema; paleta sin tonos violeta; contraste WCAG AA en casi todos los pares de tokens.
- **Documentación:** `AGENTS.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md` y `SECURITY.md` son claros y reconocen límites conocidos (sin MFA, sin correo, verificación por petición).
- **Historial:** los 32 commits sin merge usan formato Conventional Commits.

---

## 5. Hallazgos detallados

### 5.1 Seguridad y autorización

**S1 — Escalada de privilegios por permisos administrativos (Alta).** No hay jerarquía entre quien administra y quien es administrado (`AdministrationService.cs`):

- `SetUserRolesAsync`: quien tenga `settings.users.update` puede asignar el rol Administrator a cualquier usuario, incluido sí mismo. Solo se impide quitar al último admin.
- `ResetPasswordAsync`: quien tenga `settings.users.reset_password` puede resetear a un administrador. La API devuelve la contraseña temporal en la respuesta, por lo que puede iniciar sesión como él.
- `SetRolePermissionsAsync`: `settings.roles.update` permite añadir cualquier permiso a un rol (no administrador) que el actor ya posea.
- `SetUserPermissionOverridesAsync`: `settings.users.update` permite concederse permisos mediante overrides, sin impedir actuar sobre uno mismo.
- `BlockUserAsync`: se puede bloquear a un administrador mientras no sea el último.
- `DatabaseSeeder`: en cada arranque devuelve el rol Administrator al correo bootstrap si lo perdió, sin dejar registro en la auditoría. Puede ser útil como "break-glass", pero debería documentarse y auditarse.

*Recomendación:* regla de contención ("solo concedes lo que tú tienes"), restringir las acciones sobre cuentas Administrator a otros administradores, y prohibir actuar sobre uno mismo en roles, overrides y reseteos.

**S2 — La sesión no se renueva mientras se usa la app (Alta).** `web/src/App.tsx` llama a `/api/auth/refresh` solo una vez, al cargar la página. `web/src/lib/api.ts` no tiene interceptor de 401. El access token dura 10 minutos y su cookie expira con él, así que, pasado ese tiempo, cada acción falla con "La solicitud falló (401)" hasta recargar.

Al corregirlo hay que atender dos cosas del backend (`AuthService.RefreshAsync`):

- La rotación no tiene ventana de gracia: dos pestañas refrescando a la vez pueden activar la "detección de reutilización", que revoca todas las sesiones e incrementa `TokenVersion`.
- La transacción es `Serializable` sin reintento; un conflicto (40001) se convierte en un 500.

*Recomendación:* refresh automático ante 401 con una sola petición en vuelo (single-flight) y tolerancia breve a reutilización concurrente.

**S3 — Bloqueo, enumeración y registro (Media).**

- Cinco intentos fallidos bloquean la cuenta 15 minutos. El correo del administrador por defecto es predecible (`admin@pastel.local`), así que cualquiera puede dejarlo fuera repetidamente; además, un admin bloqueado deja de contar como "admin activo".
- `LoginAsync` responde de inmediato cuando el correo no existe, sin calcular el hash (600 000 iteraciones). La diferencia de tiempo permite enumerar cuentas.
- `Register` es público (`[AllowAnonymous]`) y asigna el rol Member. Para una plataforma administrativa conviene un interruptor de configuración o registro por invitación.
- nginx limita `login`, `register` y `refresh` a 10 req/min por IP, compartido entre todos los usuarios de una misma NAT.

**S4 — Detalles menores (Baja).**

- Clave JWT única HMAC, sin soporte de rotación (`kid`). La validación solo comprueba la longitud, así que la clave de `.env.example` pasaría en producción si no se cambia.
- Reglas de composición de contraseña (mayúscula, minúscula, número, símbolo) en lugar de longitud + lista de contraseñas filtradas, que es lo que recomienda NIST 800-63B.
- La regla de contraseña está duplicada en cliente (`App.tsx`) y servidor (`PasswordPolicy`).
- Los overrides de un usuario que luego se promueve a administrador permanecen en la base y el handler de permisos los respeta, aunque el servicio impide crearlos para admins.

### 5.2 Backend y arquitectura

**B1 — Consultas por petición (Media).** Una petición autenticada con permiso hace hasta 5 consultas: `OnTokenValidated` (1), `ForcePasswordChangeMiddleware` (1) y `PermissionAuthorizationHandler` (3). `docs/SECURITY.md` lo reconoce. Las dos primeras pueden fusionarse en una sola proyección.

**B2 — Capas más nominales que reales (Media).**

- `Pastel.Application` referencia `Microsoft.EntityFrameworkCore` porque `IAppDbContext` expone `DbSet<T>`, contradiciendo "sin depender de implementaciones de persistencia".
- Los casos de uso (`AuthService`, `AdministrationService`) viven en `Infrastructure` y usan el `AppDbContext` concreto. `Application` es casi solo interfaces y DTOs.
- `AuthController.Me` consulta la base de datos directamente, y los middlewares usan `AppDbContext`.
- `Me` reimplementa la lógica de permisos en lugar de usar `PermissionDecision`; si una cambia, la otra puede divergir.
- Las entidades de dominio son anémicas (setters públicos); las invariantes están en los servicios.
- `Program.cs` mezcla 152 líneas de composición; conviene extraerla a métodos de extensión.

**B3 — Manejo de errores (Media).** `ExceptionHandlingMiddleware` traduce tipos de excepción a códigos HTTP y devuelve `ex.Message` al cliente:

- Una `InvalidOperationException` del framework o de EF (por ejemplo, "Sequence contains no elements") saldría como 409 con ese texto.
- Los conflictos de índice único bajo concurrencia (por ejemplo, correo duplicado) generan `DbUpdateException` y acaban en 500 genérico.
- Usar excepciones como control de flujo dificulta probar y razonar.

**B4 — Datos y concurrencia (Media).**

- No hay tokens de concurrencia (`xmin` o `RowVersion`): dos administradores editando el mismo rol se sobrescriben (se reemplaza el conjunto completo).
- No hay estrategia de reintentos de EF ante fallos de serialización.
- Las migraciones se aplican al arrancar por defecto (`ApplyMigrationsAtStartup=true`). Existe el interruptor, pero no hay un job de migración separado documentado para producción con varias réplicas.
- Solo existe `/health/live`; falta una comprobación de disponibilidad (`readiness`) con la base de datos.

**B5 — Auditoría y retención (Media).**

- `DetailsJson` no se usa nunca. Los cambios de permisos registran "N override(s)" o solo el nombre del rol, no qué cambió.
- Los accesos denegados (403) no se auditan.
- `AuditLogs` y `RefreshTokens` crecen sin limpieza ni retención.
- La bitácora devuelve como máximo 200 filas, sin paginación ni filtros; `GetUsersAsync` carga todos los usuarios.

### 5.3 Pruebas

**T1 — Cobertura mínima (Alta).** Hay un solo archivo (`SecurityPolicyTests.cs`, 32 líneas) con 12 casos, y solo prueba `PasswordPolicy` y `PermissionDecision`. El proyecto de pruebas referencia únicamente `Pastel.Application`.

Sin pruebas quedan: `AuthService` (bloqueo, rotación, reutilización), el handler de autorización, el CSRF, `ForcePasswordChangeMiddleware`, los controladores, la regla del último administrador y la API completa. No hay pruebas en el frontend.

`AGENTS.md` exige "pruebas con cada cambio de seguridad o de permisos" y `Program` ya es `partial`, lista para `WebApplicationFactory`. Falta usarlo, idealmente con PostgreSQL real (Testcontainers) para los flujos serializables.

### 5.4 Frontend

**F1 — Diálogos sin teclado ni foco (Media).** Hay 7 usos de `role="dialog"`/`aria-modal`, pero no encontré manejo de `Escape`, de atrapar foco ni de devolverlo al elemento que abrió el diálogo (no hay `<dialog>`, `showModal`, `onKeyDown` ni `focus()`). `aria-modal="true"` sin atrapar el foco incumple el patrón WAI-ARIA y choca con la regla de `AGENTS.md` ("preserve accessible labels, keyboard focus"). El elemento nativo `<dialog>` con `showModal()` resuelve ambas cosas.

**F2 — Tailwind:** ver sección 3.

**F3 — Estado y navegación (Media).**

- `useSettingsAdmin.ts` tiene 466 líneas, 23 `useState` y 11 llamadas a la API, sin caché ni invalidación de datos del servidor.
- La navegación es un `useState<Screen>` en `App.tsx`: no hay URLs, ni botón "atrás", ni enlaces directos.
- Las respuestas se tipan con `as T` sin validación en tiempo de ejecución.
- No hay división de código; el bundle es razonable (293 KB, 86 KB gzip), pero Configuración podría cargarse bajo demanda.

**F4 — Accesibilidad menor (Baja).** El texto `muted` sobre el fondo del tema claro tiene contraste 4,44:1 (AA pide 4,5:1 para texto pequeño). Hay una sola regla `prefers-reduced-motion`. El resto de pares de tokens, en ambos temas, supera AA. La regla de paleta se cumple: no hay tonos violeta/índigo en CSS ni en TSX.

### 5.5 Contenedores, despliegue y dependencias

**D1 — Preparación para producción (Media).**

- No hay TLS: nginx escucha solo en 8080 por HTTP. Las cookies `__Host-`/`Secure` dependen de que el navegador trate `localhost` como contexto seguro (Chrome y Firefox sí; Safari no). El README ya advierte que se necesita HTTPS.
- `appsettings.json` fija `AllowedHosts` en `localhost;127.0.0.1` y `compose.yaml` no lo expone, así que un dominio real devolverá 400.
- nginx fija `X-Forwarded-For` a `$remote_addr`. Detrás de otro proxy o balanceador, el rate limit y la auditoría verían siempre la IP del balanceador.
- `compose.yaml` publica Postgres en `127.0.0.1:5432` en el stack principal, que ejecuta la API con `ASPNETCORE_ENVIRONMENT=Production`. Va ligado a loopback, pero sería más limpio en un `compose.override.yaml` solo de desarrollo, sobre todo con una contraseña de ejemplo conocida.
- Faltan `healthcheck` en `api` y `web`, `cap_drop: [ALL]` y límites de recursos.
- nginx no comprime ni cachea los assets con hash, y las cabeceras de seguridad salen duplicadas (nginx y API).
- `ReverseProxy__TrustedAddress` depende de IP estáticas del compose (`172.30.0.x`), una configuración frágil.

**D2 — Reproducibilidad y cadena de suministro (Media).**

- `web/Dockerfile` copia solo `package.json` y ejecuta `npm install`: ignora `package-lock.json` (que sí existe en `dev`). El CI y `AI_WORKFLOW.md` también usan `npm install`. Debería ser `npm ci`.
- Cada `.csproj` fija sus propias versiones (EF Core 10.0.13 se repite en cuatro); sin `Directory.Packages.props` hay riesgo de desalineación.
- No hay CodeQL, análisis de dependencias de .NET ni escaneo de imágenes.
- Pendientes de actualización en `web/`: ESLint 10, `@eslint/js` 10, `globals` 17, `lucide-react` 1.x y TypeScript 7. `npm audit` reporta 0 vulnerabilidades.
- `dependabot.yml` en `dev` está bien formado (`target-branch: dev`, agrupación, límites bajos), pero GitHub solo lee ese archivo desde la rama por defecto del repositorio; hasta que llegue allí no tendrá efecto.

### 5.6 CI y flujo de Git

**G1 — Guardarraíles del repositorio (Media).**

- `dev` no tiene protección de rama ni rulesets, y los PRs no exigen que el CI pase.
- `delete_branch_on_merge` está desactivado: hay 5 ramas remotas ya integradas en `dev` (`chore/dev-workflow-and-pgadmin`, `feat/refined-visual-experience`, `feat/tailwind-css-migration`, `fix/database-migration-discovery`, `fix/docker-jwt-dependencies`).
- No hay `LICENSE` (el repositorio es público), ni `.editorconfig` ni `.gitattributes` (el desarrollo es desde Windows con PowerShell). El backend no verifica formato (`EnforceCodeStyleInBuild=false`, sin `dotnet format`).
- Nunca se ha promovido a `main` ni existe ningún tag, aunque `AI_WORKFLOW.md` exige un tag semántico en cada promoción.

**G2 — Historial de `dev` (Baja/Media).**

- Conviven 4 merge commits (#12, #18, #19, #20) con integraciones por squash (el resto); conviene fijar una sola estrategia.
- El squash del PR #21 (`b705614`) modifica unas 10 360 líneas en 38 archivos, incluida la reescritura de `styles.css`: difícil de revisar y de revertir.
- `feat/refined-visual-experience` se reutilizó en 6 PRs hacia `dev` (#15, #16, #17, #18, #20, #21).
- Los primeros commits incluyen varias correcciones por imports y paquetes faltantes (JWT, entidades en la migración, modelo de permisos): se subió código sin compilar y el CI inicial no compilaba la API. Ya está corregido (`ci: build every backend project…`).

**G3 — Configuración del CI (Baja).**

- Los disparadores incluyen `push` en ramas `feat/**`, `fix/**`… y `pull_request` hacia `dev`: cada PR genera dos ejecuciones.
- No hay `concurrency` con cancelación ni `timeout-minutes`.
- El workflow no cachea dependencias; hoy no importa, porque tarda cerca de 1 minuto.

### 5.7 Documentación

- `docs/ARCHITECTURE.md`, paso 7 de "Cómo agregar un módulo", cita `web/src/SettingsPage.tsx`, que ya no existe (ahora es `web/src/features/settings/SettingsPage.tsx`). Es justo lo que `AGENTS.md` pide evitar.
- Las restricciones de seguridad "no negociables" (denegar por defecto, autorización en la API, no versionar secretos) ya no figuran en `AGENTS.md`, que es la puerta de entrada obligatoria; quedan repartidas en `ARCHITECTURE.md` y `SECURITY.md`.
- `docs/SECURITY.md` describe el modelo de seguridad, pero no cómo reportar vulnerabilidades; GitHub lo mostrará como política de seguridad del repositorio.
- Contradicción sobre Tailwind entre `AGENTS.md` y la práctica (sección 3).

---

## 6. Prioridades recomendadas

| Prioridad | Acción | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Jerarquía de privilegios en administración (S1) | Medio | Cierra la mayor brecha de seguridad |
| 2 | Refresh automático ante 401 con single-flight y gracia en la rotación (S2) | Medio | Corrige un fallo visible de uso |
| 3 | Pruebas de integración con `WebApplicationFactory` y PostgreSQL real (T1): login/bloqueo, refresh, CSRF, matriz de permisos, último administrador | Alto | Red de seguridad para todo lo demás |
| 4 | `npm ci` (Dockerfile, CI y docs), protección de `dev`, borrado de ramas al fusionar, una sola estrategia de merge (D2, G1) | Bajo | Reproducibilidad y disciplina |
| 5 | Decidir la regla de Tailwind y alinear código y docs (sección 3) | Medio | Mantenibilidad del frontend |
| 6 | `<dialog>` nativo o gestión de foco y Escape en los modales (F1) | Bajo | Accesibilidad |
| 7 | TLS, `AllowedHosts` configurable e IP real antes de cualquier despliegue (D1) | Medio | Prerrequisito de producción |
| 8 | Fusionar consultas por petición, mapa de errores sin `ex.Message`, auditoría con detalle (B1, B3, B5) | Medio | Rendimiento y trazabilidad |
| 9 | Mover Application fuera de EF Core y los casos de uso a `Application` (B2) | Alto | Coherencia arquitectónica |

