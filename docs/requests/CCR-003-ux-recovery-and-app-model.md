# CCR-003 — Recuperar la experiencia visual y definir el modelo de subaplicaciones

- **Estado:** aprobada por el propietario el 2026-10-19 mediante autorización explícita para recuperar la interfaz, documentar la visión de producto y modificar las áreas necesarias.
- **Rama autorizada:** `refactor/modular-foundation`.
- **Tipo de trabajo:** Tipo 1; checkpoints coherentes con actualización de progreso.
- **Áreas protegidas:** `web/src/app/**`, `web/src/core/**`, `docs/DESIGN_SYSTEM.md`, controles de auditoría de diseño, rutas de autenticación y shell compartido.
- **Evidencia visual:** PDF adjunto «Degradación de la interfaz.pdf» (comparación Antes/Ahora, una página y seis parejas de pantallas).
- **Extensión aprobada por el propietario (2026-10-19):** la conversación de decisiones de producto amplía el alcance para separar Owner/Superuser y Administrator general, restringir privilegios de Workspace/apps, definir Huella como perfil único del propietario, y fijar el contrato seguro del enlace/retorno tras login. Se autoriza aplicar estos contratos únicamente en `refactor/modular-foundation`.
- **Continúa prohibido:** integrar en `dev` o `main`, abrir o fusionar un PR, o afirmar validación sin ejecutar las pruebas sobre el SHA actual.

## Hallazgos de la comparación

El antes conserva una jerarquía de diseño deliberada: login de dos columnas con mensaje de marca, lista de beneficios, ilustración floral y selector de tema; página de inicio de bienvenida con jerarquía y resumen; navegación lateral con identidad de espacio; configuración, directorio de usuarios, permisos y cuenta con paneles, agrupación y estados visuales coherentes.

El después pierde buena parte de esa composición: autenticación reducida a una tarjeta centrada; la bienvenida sustituida por un directorio de tarjetas de aplicaciones; desaparición o pérdida de énfasis del footer, selector de tema e identidad de navegación; páginas de administración y cuenta con una jerarquía mucho más plana.

La comparación del código entre `dev` y `refactor/modular-foundation` confirma que el cambio no fue solo sintáctico: se retiraron `App.tsx` y componentes de autenticación, dashboard, perfil y workspace, sustituyéndolos por un shell y páginas nuevos. Eso fue una decisión de implementación/composición, no una limitación intrínseca de Tailwind.

## Decisiones aprobadas para esta recuperación

1. **Mantener Tailwind CSS 4.** No migrar a otro framework en este momento; no existe evidencia de que Tailwind impida lograr el diseño requerido.
2. **Adoptar un enfoque híbrido gobernado.** Utilidades Tailwind para layout, espaciado, responsive y estados simples; tokens CSS como fuente única de color/tema; hojas de estilo pequeñas y dedicadas para composiciones visuales complejas o identidad de marca. No permitir CSS arbitrario disperso.
3. **Recuperar el lenguaje visual original** usando el código disponible en `dev` como referencia real, no inventar una nueva interfaz genérica. Preservar la arquitectura modular, el contrato API, las rutas, guardas y flujos de seguridad actuales.
4. **Pastel funciona como plataforma anfitriona con subaplicaciones**, no como un dashboard de tarjetas que sirve para entrar a módulos. El selector desplegable de la sidebar cambia de app; el icono de actualización es el control y la app activa aparece inmediatamente debajo. El nombre de la app no se repite en la barra superior; la marca compartida conserva la flor y el color de acento corresponde a la app activa.
5. **Agora es la aplicación predeterminada**, con acceso público y sin posibilidad de desactivarla. La ruta inicial debe abrir Agora, no un hub de tarjetas.
6. **Pastel Workspace es el espacio de administración global**, visible como opción de aplicación solo a la identidad privilegiada del sistema. En login y registro la marca de acceso continúa siendo Pastel Workspace. La autorización real de cada vista/operación sigue siendo del backend.
7. **La configuración se organiza por ámbito:** plataforma global y configuración independiente por app. Los roles de una app no conceden privilegios en otra. Las apps usan una plantilla de configuración común tematizada por app, pero conservan sus propios miembros, roles, permisos y datos.
8. **Preservar las identidades cromáticas** de Brisa, Balance, Ágora, Cosecha y Huella; el shell de plataforma es neutral. No morados/violetas, no iconos decorativos de IA, y la marca usa `Flower2`.
9. **Seguridad de la UI:** filtrar opciones no reemplaza la autorización del servidor; no exponer Cosecha en el catálogo de autoactivación; el perfil público de Huella debe ser deliberadamente no listado y revelar solo datos escogidos.
10. **No declarar recuperación visual completa por pasar CI.** Requiere validación visual de propietario en claro/oscuro y móvil/escritorio.

## Implementación por etapas

- **R0 — Fuente de verdad:** documentar modelo de producto, selector de apps, permisos por ámbito, reglas por aplicación y preguntas abiertas.
- **R1 — Shell y autenticación:** restaurar composición de login/registro, toggle de tema, marca, selector real de aplicación, footer, navegación y comportamiento de volver al inicio de la app actual.
- **R2 — Pantallas de trabajo:** restaurar jerarquía visual de bienvenida/inicio, perfil, directorio de usuarios, roles, permisos y formularios usando las APIs actuales.
- **R3 — Sistema visual:** componentes compartidos con variantes, tokens, auditoría ajustada para el enfoque híbrido y estados responsive/accesibles.
- **R4 — Validación:** Build/QA debe ejecutar compilación, pruebas y recorridos de navegador; el propietario compara capturas con el PDF. No promover a `dev` o `main` sin autorización explícita.

## Decisiones de producto confirmadas por el propietario (2026-10-19)

1. **Owner/Superuser y Administrator general son roles distintos.** El bootstrap establece ambos roles en la cuenta propietaria; solo el bootstrap restaura la membresía Owner. Ambos pueden abrir Workspace mediante `platform.workspace.access`; Owner posee todos los permisos y Administrator se limita a permisos de plataforma (`dashboard.view`, `settings.*` y Workspace), sin acceso de negocio a las apps por defecto.
2. **Los permisos son por ámbito.** Los roles de una app no se convierten en permisos de plataforma. Los roles y excepciones funcionales se administran dentro de la configuración de su app. Owner puede conceder Cosecha; Administrator general no puede conceder privilegios de Owner, Workspace o Cosecha. Las APIs deben rechazar cualquier intento de eludir el límite, aunque se construya una solicitud manual.
3. **Huella pertenece únicamente a Owner/Superuser.** No se autoactiva, no aparece en directorios/búsquedas y no se asignan permisos `huella.*` a otras cuentas. El enlace público usará token opaco aleatorio de alta entropía, almacenando solo su hash. Regenerar rota el token e invalida inmediatamente el anterior. La página pública solo sirve el snapshot publicado y debe enviar meta robots y `X-Robots-Tag: noindex,nofollow,noarchive`. Cualquier visitante con el enlace vigente puede leerla sin iniciar sesión.
4. **Destino tras login.** Un `returnUrl` interno seguro tiene prioridad; en ausencia de uno válido, la primera entrada abre Ágora y los siguientes logins vuelven a la última app de producto usada. La implementación actual guarda la preferencia en el navegador; no se sincroniza entre dispositivos.
5. **Estado real frente al requisito.** Se han iniciado los límites de roles/permisos en código y se ha actualizado la documentación. El módulo Huella sigue siendo un esqueleto sin entidades/API/ruta pública; token, publicación, revocación/regeneración y noindex son requisitos aprobados, no funcionalidades implementadas todavía.
6. **Validación pendiente.** Los cambios de esta extensión de CCR aún no están compilados ni probados. Requieren Build/QA, pruebas de autorización y verificación del flujo de login. No integrar en `dev` ni `main` sin nueva autorización expresa.
