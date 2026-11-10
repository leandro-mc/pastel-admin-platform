# Sistema de diseño y experiencia de usuario

Reglas vigentes de diseño de Pastel. La identidad visual de cada aplicación **todavía no está definida**: se determinará con la investigación y los prototipos en curso, y este documento se ampliará entonces.

**Qué obliga y qué orienta:** solo la sección 1 (reglas duras) **bloquea**. El resto son **guías** para construir pantallas coherentes y accesibles sin burocracia: se siguen por criterio, no se verifican pantalla por pantalla en la Etapa 1, y su revisión sistemática es de la Etapa 2 (`docs/TESTING.md`).

## 1. Reglas duras (no negociables)
- **No usar morado ni sus derivados**, ni nada de lo habitual del diseño generado por IA: colores, elementos, iconos de destellos/robot/varita, emojis como adorno, símbolos de IA.
- `scripts/check-design.mjs` (parte de `test-frontend.ps1`) verifica solo estas dos reglas: morado (en cualquier archivo) e iconos o emojis de IA.
- No hay otras restricciones de paleta, acento ni identidad por subaplicación. No inventar ni fijar paletas por módulo mientras la investigación no las defina.

## 2. Principios
1. **Claro y predecible**: una acción primaria por vista, jerarquía visible, mismo patrón para lo mismo.
2. **Seguro y comprensible para personas con poca práctica tecnológica**: frases cortas, sin tecnicismos, confirmaciones en acciones destructivas, deshacer cuando sea posible.
3. **Accesible por defecto**: WCAG 2.2 nivel AA como mínimo (sección 5).
4. **Responsive**: móvil primero; se diseña para funcionar desde 320 px (su revisión sistemática es de la Etapa 2).
5. **Coherente sin uniformar**: se comparten comportamiento y componentes (`@/core/ui`), no pantallas de negocio.

## 3. Tipografía y espacio (guía)
- **Fuente:** hoy se usa la pila de fuentes del sistema; no hay fuente propia. La política de seguridad solo permite fuentes del propio sitio, así que cualquier tipografía que se adopte (por ejemplo tras la investigación de identidad visual) debe **autoalojarse**.
- Referencia: base 16 px y texto de lectura sin bajar de 16 px; escala 12/14/16/18/20/24/30/36; interlineado 1,5 en párrafos y 1,25 en títulos; ancho de lectura ≈ 70 caracteres; espaciado en múltiplos de 4 px. Una aplicación puede apartarse si su identidad visual lo pide.

## 4. Estructura y componentes (guía)
- **Navegación:** sidebar en escritorio y navegación táctil equivalente en móvil. La app actual se distingue con icono, texto y `aria-current="page"`, no solo con color. No arrastrar acciones de un módulo a otro.
- **Tablas:** en móvil conviene convertirlas en listas de tarjetas o priorizar los campos clave.
- Los componentes compartidos viven en `web/src/core/ui` con variantes explícitas; se prefieren a armar a mano un `div` con `role="dialog"`. Si una pantalla necesita algo que el kit no ofrece, constrúyala y, si se repite, súbalo al kit.

| Patrón | Guía |
|---|---|
| Botones | Una acción primaria por vista; etiquetas con verbo («Guardar pedido»); área táctil ≥ 44×44 px; estado «cargando» sin cambiar el tamaño. |
| Fechas | Selector que acepte escritura (`dd/mm/aaaa`) y teclado; mostrar el día de la semana. |
| Diálogos | Solo tareas breves; `Escape` cierra, el foco queda atrapado y vuelve a quien abrió; título accesible. |
| Notificaciones | `aria-live="polite"`, mínimo 6 s y descartables; los errores permanecen hasta cerrarlos. |
| Vacíos | Explicar qué es, por qué está vacío y ofrecer la acción primaria. |
| Carga | Esqueletos tras 300 ms sin saltos de diseño; «Cargando…» para lectores de pantalla. |
| Errores | Lenguaje humano, qué hacer y botón «Reintentar»; páginas 403/404/500 con salida clara. |
| Sin conexión | Mensaje visible, conservar los datos del formulario y reintentar al volver la red. |

## 5. Accesibilidad (objetivo de calidad)
**Desde el principio, a bajo costo** (se logra usando los componentes de `@/core/ui` y buen HTML):
- Todo operable con teclado, con orden de foco lógico y **foco visible**; etiquetas en los controles y `aria-describedby` para ayudas y errores.
- El estado nunca se comunica solo con color; imágenes con texto alternativo e iconos decorativos con `aria-hidden`.
- Contraste de texto ≥ 4,5:1 (3:1 en texto grande) como meta al elegir colores.

**Revisión sistemática: Etapa 2** (no bloquea la Etapa 1): zoom al 200 % y ancho de 320 px, lector de pantalla, `prefers-reduced-motion`, enlace «Saltar al contenido», foco al `h1` al cambiar de ruta, objetivos táctiles ≥ 44 px, impresión y ambos temas pantalla por pantalla.

## 6. Contenido y tono (español de Costa Rica)
- Por defecto, formulaciones impersonales o de usted («Ingrese su correo», «Revise los datos», «No se pudo guardar. Intente de nuevo»). El **voseo y otras voces se permiten cuando el propietario lo pida**, para toda la plataforma o un módulo; es una preferencia, no un criterio de bloqueo.
- Frases cortas y palabras comunes («no se pudo conectar», no «error de red 502»).
- Los textos de un módulo se mantienen preferiblemente en `strings.ts` y no dispersos en el JSX (facilita revisar el tono y traducir).

## 7. Implementación: Tailwind CSS 4 y CSS gobernado
- **Tailwind 4** para utilidades en JSX (layout, espaciado, breakpoints, tipografía, estados simples), con clases ordenadas por `prettier-plugin-tailwindcss`.
- **Tokens CSS** (`web/src/core/design/tokens.css` y `module-themes.css`, expuestos con `@theme inline`): se recomienda declarar colores, superficies, sombras, foco y tema una sola vez como tokens (sin comprobación automática: no hay restricción sobre colores literales). **Los valores actuales de los tokens, incluidos los de `module-themes.css`, son provisionales** y cambiarán con la definición de identidad visual; el mecanismo (`data-module`) se conserva.
- CSS de componentes acotado en `core/design/components/*.css` para composiciones que no se describen bien con utilidades; usa tokens cuando existan. Se prefieren componentes a `@apply`, sin restricción automática. Evite estilos inline arbitrarios y selectores globales que reemplacen la composición de componentes.
- `scripts/tailwind-audit.mjs` solo **informa** métricas de mantenimiento; no bloquea nada.

## 8. Verificación
- **Etapa 1 (ahora):** `check-design` (reglas duras) y lo que ya existe (axe en las pruebas de componentes, Prettier/ESLint). **No** se exige un recorrido manual por cada pantalla nueva.
- **Etapa 2:** revisión visual y de accesibilidad sistemática (solo teclado, 320 px, zoom 200 %, modo oscuro, lector de pantalla en los flujos principales) y pruebas visuales automatizadas si el propietario las pide.
