# Sistema de diseño y experiencia de usuario

Reglas vigentes de diseño de Pastel. La identidad visual de cada aplicación **todavía no está definida**: se determinará con la investigación y los prototipos en curso, y este documento se ampliará entonces. Hasta entonces solo rigen las reglas de este archivo.

## 1. Reglas duras (no negociables)
- **No usar morado ni sus derivados**, ni nada de lo habitual del diseño generado por IA: colores, elementos, iconos de destellos/robot/varita, emojis como adorno, símbolos de IA.
- `scripts/check-design.mjs` (parte de `test-frontend.ps1`) verifica morado, iconos y emojis de IA y colores literales fuera de los archivos de tokens.
- No hay otras restricciones de paleta, acento ni identidad por subaplicación. No inventar ni fijar paletas por módulo mientras la investigación no las defina.

## 2. Principios
1. **Claro y predecible**: una acción primaria por vista, jerarquía visible, mismo patrón para lo mismo.
2. **Seguro y comprensible para personas con poca práctica tecnológica**: frases cortas, sin tecnicismos, confirmaciones en acciones destructivas, deshacer cuando sea posible.
3. **Accesible por defecto**: WCAG 2.2 nivel AA como mínimo (sección 5).
4. **Responsive**: móvil primero; todo funciona desde 320 px.
5. **Coherente sin uniformar**: se comparten comportamiento y componentes (`@/core/ui`), no pantallas de negocio.

## 3. Tipografía y espacio
- **Fuente:** hoy se usa la pila de fuentes del sistema; no hay fuente propia. La política de seguridad solo permite fuentes del propio sitio, así que cualquier tipografía que se adopte (por ejemplo tras la investigación de identidad visual) debe **autoalojarse**.
- Base 16 px; el texto de lectura nunca baja de 16 px. Escala 12/14/16/18/20/24/30/36; interlineado 1,5 en párrafos y 1,25 en títulos. Ancho de lectura máximo ≈ 70 caracteres.
- Espaciado en múltiplos de 4 px.

## 4. Estructura y componentes
- **Navegación:** sidebar en escritorio y navegación táctil equivalente en móvil. La app actual se distingue con icono, texto y `aria-current="page"`, no solo con color. No arrastrar acciones de un módulo a otro.
- **Tablas:** en móvil se convierten en listas de tarjetas o priorizan los campos clave; sin scroll horizontal por defecto.
- Los componentes compartidos viven en `web/src/core/ui` con variantes explícitas y se usan siempre (no se arma un `div` con `role="dialog"` a mano).

| Patrón | Regla |
|---|---|
| Botones | Una acción primaria por vista; etiquetas con verbo («Guardar pedido»); área táctil ≥ 44×44 px; estado «cargando» sin cambiar el tamaño. |
| Fechas | Selector que acepte escritura (`dd/mm/aaaa`) y teclado; mostrar el día de la semana. |
| Diálogos | Solo tareas breves; `Escape` cierra, el foco queda atrapado y vuelve a quien abrió; título accesible. |
| Notificaciones | `aria-live="polite"`, mínimo 6 s y descartables; los errores permanecen hasta cerrarlos. |
| Vacíos | Explicar qué es, por qué está vacío y ofrecer la acción primaria. |
| Carga | Esqueletos tras 300 ms sin saltos de diseño; «Cargando…» para lectores de pantalla. |
| Errores | Lenguaje humano, qué hacer y botón «Reintentar»; páginas 403/404/500 con salida clara. |
| Sin conexión | Mensaje visible, conservar los datos del formulario y reintentar al volver la red. |

## 5. Accesibilidad (mínimos obligatorios)
- Todo operable con teclado, con orden de foco lógico y **foco visible** (≥ 3 px, contraste ≥ 3:1); enlace «Saltar al contenido».
- Al cambiar de ruta, mover el foco al `h1` y anunciar el título.
- Objetivos táctiles ≥ 44 px. Etiquetas, `aria-describedby` para ayudas y errores; `role="alert"` solo en errores críticos.
- Zoom al 200 % y ancho de 320 px sin pérdida de contenido; respetar `prefers-reduced-motion`.
- Imágenes con texto alternativo; iconos decorativos con `aria-hidden`.
- Contraste de texto ≥ 4,5:1 (3:1 en texto grande); el estado nunca se comunica solo con color.

## 6. Contenido y tono (español de Costa Rica)
- Por defecto, formulaciones impersonales o de usted («Ingrese su correo», «Revise los datos», «No se pudo guardar. Intente de nuevo»). El **voseo y otras voces se permiten cuando el propietario lo pida**, para toda la plataforma o un módulo; es una preferencia, no un criterio de bloqueo.
- Frases cortas y palabras comunes («no se pudo conectar», no «error de red 502»).
- Todos los textos de un módulo viven en `strings.ts`, no dispersos en el JSX.

## 7. Implementación: Tailwind CSS 4 y CSS gobernado
- **Tailwind 4** para utilidades en JSX (layout, espaciado, breakpoints, tipografía, estados simples), con clases ordenadas por `prettier-plugin-tailwindcss`.
- **Tokens CSS** (`web/src/core/design/tokens.css` y `module-themes.css`, expuestos con `@theme inline`): colores, superficies, sombras, foco y tema se declaran una sola vez; no hay hexadecimales sueltos ni valores arbitrarios de color en JSX o CSS de componentes. **Los valores actuales de los tokens, incluidos los de `module-themes.css`, son provisionales** y cambiarán con la definición de identidad visual; el mecanismo (`data-module`) se conserva.
- CSS de componentes acotado en `core/design/components/*.css` para composiciones que no se describen bien con utilidades; usa tokens. `@apply` solo en `core/design/base.css`. Sin estilos inline arbitrarios ni selectores globales que reemplacen la composición de componentes.
- `scripts/tailwind-audit.mjs` informa métricas (el único criterio estructural que bloquea es el de CSS fuera de lo permitido).

## 8. Verificación
- Automática: `check-design`, axe en las pruebas de componentes, Prettier/ESLint (incluye reglas de accesibilidad).
- Manual antes de entregar una pantalla nueva: solo teclado, 320 px y zoom 200 %, modo oscuro y lector de pantalla en el flujo principal.
