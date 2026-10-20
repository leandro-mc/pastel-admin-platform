# CCR-003 — Recuperar la experiencia visual y definir el modelo de subaplicaciones

- **Estado:** aprobada por el propietario el 2026-10-19 mediante autorización explícita para recuperar la interfaz, documentar la visión de producto y modificar las áreas necesarias.
- **Rama autorizada:** `refactor/modular-foundation`.
- **Tipo de trabajo:** Tipo 1; checkpoints coherentes con actualización de progreso.
- **Áreas protegidas:** `web/src/app/**`, `web/src/core/**`, `docs/DESIGN_SYSTEM.md`, controles de auditoría de diseño, rutas de autenticación y shell compartido.
- **Evidencia visual:** PDF adjunto «Degradación de la interfaz.pdf» (comparación Antes/Ahora, una página y seis parejas de pantallas).
- **No autorizado por esta CCR:** modificar la autorización del backend o el modelo de base de datos sin una decisión específica; integrar cambios en `dev` o `main`; abrir o fusionar un PR.

## Hallazgos de la comparación

El antes conserva una jerarquía de diseño deliberada: login de dos columnas con mensaje de marca, lista de beneficios, ilustración floral y selector de tema; página de inicio de bienvenida con jerarquía y resumen; navegación lateral con identidad de espacio; configuración, directorio de usuarios, permisos y cuenta con paneles, agrupación y estados visuales coherentes.

El después pierde buena parte de esa composición: autenticación reducida a una tarjeta centrada; la bienvenida sustituida por un directorio de tarjetas de aplicaciones; desaparición o pérdida de énfasis del footer, selector de tema e identidad de navegación; páginas de administración y cuenta con una jerarquía mucho más plana.

La comparación del código entre `dev` y `refactor/modular-foundation` confirma que el cambio no fue solo sintáctico: se retiraron `App.tsx` y componentes de autenticación, dashboard, perfil y workspace, sustituyéndolos por un shell y páginas nuevos. Eso fue una decisión de implementación/composición, no una limitación intrínseca de Tailwind.

## Decisiones aprobadas para esta recuperación

1. **Mantener Tailwind CSS 4.** No migrar a otro framework en este momento; no existe evidencia de que Tailwind impida lograr el diseño requerido.
2. **Adoptar un enfoque híbrido gobernado.** Utilidades Tailwind para layout, espaciado, responsive y estados simples; tokens CSS como fuente única de color/tema; hojas de estilo pequeñas y dedicadas para composiciones visuales complejas o identidad de marca. No permitir CSS arbitrario disperso.
3. **Recuperar el lenguaje visual original** usando el código disponible en `dev` como referencia real, no inventar una nueva interfaz genérica. Preservar la arquitectura modular, el contrato API, las rutas, guardas y flujos de seguridad actuales.
4. **Pastel funciona como plataforma anfitriona con subaplicaciones**, no como un dashboard de tarjetas que sirve para entrar a módulos. El selector superior cambia de app; la marca compartida mantiene la flor; el nombre visible y el color de acento corresponden a la aplicación activa.
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

## Decisiones de producto que continúan abiertas

Los valores provisionales están en `docs/product/PASTEL-PRODUCT-AND-UX.md`. Ninguno autoriza a inventar permisos en backend: si el comportamiento necesita una nueva política, se registra y se confirma antes de implementarla.
