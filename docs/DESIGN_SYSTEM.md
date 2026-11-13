# Sistema de diseño y experiencia de usuario

Reglas vigentes de diseño de Pastel. La identidad visual de cada aplicación **todavía no está definida**: se determinará con la investigación y los prototipos en curso, y este documento se ampliará entonces.

**Qué obliga y qué orienta:** solo la sección 1 (reglas duras) **bloquea**, además de la sección 9 para quien toque el shell compartido (zona compartida, con autorización expresa del propietario; ver `AGENTS.md` §8). El resto son **guías** para construir pantallas coherentes y accesibles sin burocracia: se siguen por criterio, no se verifican pantalla por pantalla en la Etapa 1, y su revisión sistemática es de la Etapa 2 (`docs/TESTING.md`).

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
- **Navegación:** sidebar visible con texto en escritorio y barra inferior visible en móvil (§9). La app actual se distingue con icono, texto y `aria-current="page"`, no solo con color. No arrastrar acciones de un módulo a otro.
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
- Shell (solo si se toca; manual y opcional en la Etapa 1): `node scripts/shell-visual.mjs audit` (axe del shell, contraste por app y tema, desbordes) y `gallery` (capturas); resultados y límites en `docs/design/SHELL_VALIDATION.md`.

## 9. Shell compartido (sidebar, barra superior y navegación móvil)

Código: `web/src/app/shell` y `web/src/core/design/components/shell*.css`. Justificación y fuentes: `docs/design/SHELL_RESEARCH.md`. Verificación: `docs/design/SHELL_VALIDATION.md`. Es una zona compartida: cambiarla exige autorización expresa del propietario (`AGENTS.md` §8). **El shell es un marco, no una función: el contenido es el producto.**

### 9.1 Estructura
| Región | Escritorio (≥ 64 rem) | Pantallas estrechas (< 64 rem) |
|---|---|---|
| Marca | Arriba de la sidebar, a la altura de la barra superior; vuelve al inicio de la app activa | Se omite (el control de app ocupa su lugar) |
| Control de app | Un solo control en la sidebar: icono, nombre y descripción de la app, con menú de aplicaciones | Mismo control, compacto, en el extremo inicial de la barra superior |
| Navegación de la app | Sidebar de 16 rem (riel de 4,5 rem si se pliega; se recuerda), con el botón de plegar **arriba**, junto a la marca (plegada, justo debajo de ella). Un renglón de 44 px por destino | Barra inferior fija con etiqueta: hasta 5 destinos visibles; con más, 4 y «Más». Con menos de 2 no hay barra |
| Barra superior | Migas reales, selector «Ver como» (solo modo desarrollador), Ayuda, cuenta | Selector «Ver como» (icono), Ayuda (icono) y cuenta (avatar) |
| Pie | Una línea | Una línea |

La barra superior contiene **solo acciones globales entre aplicaciones** (patrón de Atlassian: lo global arriba, lo propio de la app al lado). Las acciones de una página van en el encabezado de la propia página, nunca en el shell. El tema y el tamaño de texto se fijan una vez, por eso viven en el panel de cuenta (o en «Preferencias» para quien no ha iniciado sesión) y **son controles de icono, no listas de texto**: el tema es un único botón luna/sol, igual que en el inicio de sesión, y el tamaño es una fila de cuatro «A» de tamaño creciente con la elegida marcada. Cada botón muestra su nombre (Pequeño, Normal, Grande, Muy grande) al pasar el cursor o enfocarlo. El cierre de sesión es el último elemento del panel, separado y de ancho completo, con icono y texto.

### 9.2 Qué hereda toda app y qué personaliza
| Hereda (no se rediseña por app) | Personaliza cada app |
|---|---|
| Estructura, geometría, puntos de ruptura, plegado, barra inferior y menús | **Tokens de tema** claro y oscuro (`module-themes.css` o el archivo de la app), incluidos fondo, superficies, bordes y acentos |
| Landmarks, enlace «Saltar al contenido», foco al `h1`, orden de teclado | Nombre, descripción corta, icono y orden en el manifiesto |
| Control de app, ayuda, preferencias, cuenta, migas y modo desarrollador | Ítems de navegación: etiquetas, iconos, permisos y, si hay muchos, `group` |
| Aviso de vista previa y pie | Composición y contenido de sus páginas; tipografía autoalojada; radios mediante `--shell-radius` |

### 9.3 Tokens y geometría
- El shell **solo lee** tokens semánticos: `--app-bg`, `--surface`, `--surface-raised`, `--sidebar-bg`, `--text`, `--text-secondary`, `--muted`, `--border`, `--border-strong`, `--accent`, `--accent-strong`, `--accent-soft`, `--on-accent`. No define ni impone ningún color: la identidad llega por `data-module` y `data-theme`. Una app puede redefinir cualquiera (incluidos `--app-bg` y `--sidebar-bg`) sin tocar el shell.
- Geometría como variables con especificidad cero: `--shell-sidebar-width` (16 rem), `--shell-sidebar-rail-width` (4,5 rem), `--shell-topbar-height` (3,5 rem), `--shell-bottomnav-height` (4 rem), `--shell-radius` (0,5 rem). Se redefinen con el selector de la app (`[data-module="brisa"] { --shell-radius: … }`).
- Los menús y descripciones emergentes se dibujan en un portal fuera del shell: reciben `data-module` con `useShell().moduleCode` para repetir el tema. Cualquier menú nuevo del shell debe hacerlo.
- Sin degradados, vidrio ni sombras decorativas; la elevación es solo para superficies flotantes (menús, descripciones).

### 9.4 Comportamiento obligatorio
1. **Navegación visible y con texto** (NN/g). El riel de iconos es una opción recordada, con nombre accesible y descripción emergente; no es el estado por defecto. Nunca una hamburguesa para lo principal.
2. **Un renglón por destino**: icono y texto, objetivo ≥ 44 px, texto ≥ 12 px. Sin subtítulos, sin mayúsculas espaciadas, sin tarjetas.
3. **Activo = `aria-current="page"`** más barra de acento, peso y fondo suave; nunca solo color. El ítem activo es el de coincidencia más específica; la raíz del módulo (`to: ""`) coincide exacta. Las pantallas de detalle se declaran en el manifiesto con `alsoActiveOn`; **el shell no inspecciona rutas ni textos de un módulo**.
4. **Nombre accesible desde el contenido visible** (WCAG 2.5.3): no sobrescribir con `aria-label` un botón que muestra texto; si el texto se oculta en pantallas estrechas, ocultarlo solo visualmente (`sr-only`).
5. **Foco visible** de 3 px sólidos con `--accent-strong`, ≥ 3:1 sobre los fondos contiguos. `scroll-padding` superior e inferior para que la barra fija no tape el elemento enfocado (WCAG 2.4.11).
6. **Landmarks**: `aside` con nombre para la sidebar, `nav` con nombre por app, `header`, `main#contenido`, `footer`. Solo una navegación (sidebar o barra inferior) está en el árbol de accesibilidad a la vez.
7. **Controles de preferencias con icono y nombre emergente**: el nombre accesible sale del propio botón (la «A» es un dibujo, no texto) y la opción elegida no depende solo del color (fondo, contorno y trazo más grueso). **Ayuda siempre en la misma posición** (WCAG 3.2.6). Sin indicadores de estado que no provengan de un dato real consultado.
8. **El documento se desplaza** (no un contenedor interno); el pie queda al final del contenido.
9. **Migas** solo con jerarquía real (`handle.crumb`); sin repetir el nombre de la app; en móvil se omiten.

### 9.5 Prueba de eliminación (antes de añadir algo al shell)
Responda por escrito: ¿qué pregunta de la persona contesta (dónde estoy, a dónde voy, qué puedo hacer globalmente)?, ¿ya existe en otro lugar de la pantalla?, ¿se basa en un dato real?, ¿sigue funcionando sin color? Sin respuesta a la primera, no entra. No sustituya una plantilla genérica por otra: el shell no impone paleta ni tipografía.

### 9.6 Modo desarrollador (vista previa por rol)
- Permiso `platform.developer.mode`: automático para `Administrator` y `Owner/Superuser`; asignable a cuentas concretas desde Configuración › Usuarios › Accesos; nunca por rol personalizado. Detalle en `docs/SECURITY.md`.
- Solo **cambia lo que se muestra**: `core/devmode` reemplaza la porción de permisos de la app activa y la entrega por `useAuth()`. Los módulos lo heredan sin conocerlo: **no importan `@/core/devmode`** (lo verifica `check-module-boundaries`), no leen `sessionStorage` ni deciden nada según estar en vista previa.
- El cliente **nunca envía el rol simulado**; el servidor autoriza con la sesión real. Mientras se simula, las acciones que la cuenta real sí puede ejecutar se ejecutan de verdad (el aviso lo indica). Los datos de la API son los de la cuenta real.
- Aviso permanente con el rol y salida con un clic; selector «Ver como» en la barra superior solo con el permiso; la elección se guarda por pestaña y por cuenta (solo el nombre del rol).

### 9.7 Cómo adapta una app el shell
1. Definir sus tokens claros y oscuros (§9.3). 2. Declarar nombre, descripción, icono, `basePath` y `nav` en el manifiesto (`alsoActiveOn` y `group` son opcionales). 3. Nada más: no hay ranuras, ni componentes del shell que reemplazar. Si una app necesita algo que el shell no ofrece, se plantea al propietario; no se bifurca el shell por app.

