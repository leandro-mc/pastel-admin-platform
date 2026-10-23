# Sistema de diseño y guía de experiencia de usuario

> La visión de aplicaciones y disponibilidad de cada app está en [`docs/product/PASTEL-PRODUCT-AND-UX.md`](product/PASTEL-PRODUCT-AND-UX.md). Ese documento define el modelo de producto; esta guía define la experiencia y la implementación visual.

La experiencia de usuario es la prioridad número uno. Muchas personas distintas usarán Pastel, incluidas personas mayores y con poca práctica tecnológica. Ante una duda entre "más bonito" y "más claro", gana lo más claro.

## 1. Principios

1. **Claridad antes que decoración.** Una acción principal por pantalla, lenguaje simple, jerarquía visible.
2. **El sistema habla como una persona.** Mensajes en español de Costa Rica, tono cálido y directo; nunca culpar a quien usa la aplicación.
3. **Nada depende solo del color.** Siempre texto o icono además del color.
4. **Primero móvil.** Se diseña desde 360 px de ancho; el escritorio es una ampliación.
5. **Reversible y predecible.** Confirmar lo destructivo, ofrecer deshacer, no perder lo escrito.
6. **Accesible por defecto.** WCAG 2.2 nivel AA como mínimo.

## 2. Color

### 2.1 Neutros de la plataforma (shell, hub, cuenta, configuración)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--app-bg` | `#f7f6f0` | `#191b20` | Fondo de página |
| `--surface` | `#fffefa` | `#22262d` | Tarjetas, paneles |
| `--surface-raised` | `#fffefa` | `#2b313a` | Menús, diálogos |
| `--text` | `#26313a` | `#e9eae7` | Texto principal (contraste 12,2:1 en claro) |
| `--text-secondary` | `#445059` | `#c0c6cc` | Texto secundario |
| `--muted` | `#5b6670` | `#a2a9b1` | Ayudas, metadatos (5,4:1 mínimo) |
| `--border` | `#e2e6de` | `#3b424e` | Bordes suaves |
| `--border-strong` | `#c9d0c6` | `#56606d` | Bordes de campos |
| `--ink` (acento de plataforma) | `#26313a` | `#e9eae7` | Botón primario del shell |

El shell es **neutro a propósito**: el color pertenece a cada subaplicación y aparece al entrar en ella. El verde anterior de la plataforma pasa a ser el color de Brisa.

### 2.2 Color de cada subaplicación

Un módulo activa su identidad con `data-module="<codigo>"` en su contenedor raíz. Los componentes solo usan `--accent*`, nunca hexadecimales.

| Módulo | `--accent` (decorativo/íconos) | `--accent-strong` (texto y botones) | `--accent-soft` (fondos) |
|---|---|---|---|
| Brisa | `#48775b` | `#416b52` | `#e3f0e7` |
| Balance | `#367c78` | `#2e6966` | `#e3f1ef` |
| Ágora | `#4d7898` | `#416681` | `#e2eef7` |
| Cosecha | `#927b3c` | `#6e5c2d` | `#f6efd8` |
| Huella | `#a96c4a` | `#87563b` | `#f8e7de` |

Modo oscuro (mismos módulos):

| Módulo | `--accent` | `--accent-soft` | Texto sobre botón (`--on-accent`) |
|---|---|---|---|
| Brisa | `#8daa98` | `#2a3636` | `#14181c` |
| Balance | `#81adab` | `#26373c` | `#14181c` |
| Ágora | `#8ba7bc` | `#2b3642` | `#14181c` |
| Cosecha | `#b3a376` | `#383730` | `#14181c` |
| Huella | `#c59c85` | `#3d3433` | `#14181c` |

En modo oscuro `--accent-strong` es igual a `--accent`.

**Contrastes verificados** (calculados con la fórmula WCAG): blanco sobre `--accent-strong` entre 6,1:1 y 6,5:1; `--accent-strong` sobre `--accent-soft` entre 5,1:1 y 5,7:1; en oscuro, `--accent` sobre `--surface` ≥ 6,0:1 y texto `--on-accent` sobre el acento ≥ 7,0:1.

**Regla de uso:** los acentos de Cosecha, Huella, Ágora y Balance sin oscurecer no alcanzan 4,5:1 sobre sus fondos suaves. Por eso `--accent` solo se usa en elementos gráficos (iconos grandes, bordes, indicadores ≥ 3:1) y **todo texto o botón con texto usa `--accent-strong`**.

Otros tokens por módulo derivados: `--focus` (anillo de foco = `--accent-strong` al 45 % de opacidad más contorno de 3 px) y `--accent-subtle` (fondo de filas seleccionadas).

### 2.3 Estados

| Estado | Texto (claro) | Icono obligatorio |
|---|---|---|
| Error | `#9b2f2f` (7,3:1) | `CircleAlert` |
| Advertencia | `#7a5200` (6,9:1) | `TriangleAlert` |
| Éxito | `#2f6b3f` (6,3:1) | `CircleCheck` |
| Información | `#2f5f86` (6,7:1) | `Info` |

Los estados siempre llevan icono y texto; el verde de éxito nunca sustituye al color del módulo.

### 2.4 Prohibiciones

- **Morado y derivados** (violeta, púrpura, índigo, lila, magenta, fucsia, degradados que los incluyan): tono HSL entre **235° y 345°** con saturación > 10 % queda prohibido en cualquier archivo de CSS, TS/TSX, SVG o imagen propia. Aplica también al modo oscuro, ilustraciones, gráficas y estados.
- **Símbolos de IA:** iconos `Sparkles`, `Sparkle`, `Stars`, `Wand`, `Wand2`, `WandSparkles`, `Bot`, `Brain`, `BrainCircuit`, `Cpu`; emojis ✨ 🤖 🪄 🔮 🧠; estrellas decorativas; textos como "asistente mágico" o "con IA". Marca de plataforma: `Flower2`.
- **Excepción documentada:** el logotipo oficial "G" del botón de Google es multicolor por requisito de marca de Google; se usa tal cual, solo en ese botón.
- `scripts/check-design.mjs` falla el CI ante cualquier incumplimiento.

### 2.5 Identidad por módulo

| Módulo | Icono (Lucide; verificar que exista en la versión instalada) | Tono |
|---|---|---|
| Brisa | `ListChecks` | Ligero, calmado |
| Balance | `Scale` | Preciso, justo |
| Ágora | `Landmark` | Editorial, sobrio |
| Cosecha | `Sprout` | Práctico, operativo |
| Huella | `Footprints` | Profesional, personal |

## 3. Tipografía y espacio

- Fuente: **Inter variable autoalojada** (`@fontsource-variable/inter`); la política de seguridad solo permite fuentes del propio sitio. Alternativas del sistema como respaldo.
- Base **16 px**; texto de lectura nunca menor de 16 px; etiquetas de formulario de 14–16 px en negrita media.
- Escala: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36. Interlineado 1,5 en párrafos, 1,25 en títulos.
- **Tamaño de texto ajustable** en el menú de cuenta: Pequeño 90 %, Normal 100 %, Grande 115 % y Muy grande 130 %. Normal es la opción recomendada; la escala se aplica a la raíz, por lo que también ajusta medidas expresadas en `rem`, y se guarda como preferencia no sensible.
- Espaciado en múltiplos de 4 px. Contenido de lectura con ancho máximo de ~70 caracteres.
- Radios 8–12 px. Sombras suaves; los bordes comunican la estructura, no solo la sombra.

## 4. Estructura de pantallas

- Pastel es un anfitrión de apps independientes, no un dashboard de tarjetas. La visión y los destinos por app están definidos en `docs/product/PASTEL-PRODUCT-AND-UX.md`.
- **Shell:** marca floral común, selector desplegable en la sidebar con icono de actualización y tarjeta de la app activa inmediatamente debajo; la barra superior muestra la ubicación, el tema y la cuenta sin repetir el nombre de la app. Ayuda, preferencias, menú de cuenta y footer permanecen disponibles. Login/registro usan la identidad Pastel Workspace.
- La marca/nombre lleva al inicio de la app activa. La ruta raíz va a Ágora; el catálogo de apps vive en el selector/configuración, no como landing de cada sesión.
- **Navegación de app:** sidebar en escritorio y navegación táctil equivalente en móvil. La app actual se distingue mediante icono, texto y estado (`aria-current="page"`), no solo color. No arrastrar acciones de un módulo a otro.
- **Configuración por app:** puede reutilizar estructura y componentes compartidos, pero solo lista y edita miembros, roles, permisos y datos del contexto actual. El rol de una app no se hereda a otra ni equivale a Workspace.
- **Cada página:** título claro (un `h1`), descripción corta opcional, acción principal visible, contenido jerarquizado. Sin desplazamiento horizontal a 320 px.
- **Tablas:** en móvil se convierten en listas de tarjetas o se adaptan con prioridad explícita a los campos clave; no imponer una tabla ilegible ni scroll horizontal por defecto.
- **Diálogos:** solo para tareas breves; tareas largas son páginas completas. Mantener encabezados, navegación, estados y pie de página del lenguaje visual acordado.
- **Tema claro/oscuro** disponible desde login/registro y cuenta, consistente entre rutas y respetuoso de la preferencia guardada.
- Las composiciones editoriales y elementos de marca del diseño original deben conservarse cuando sea posible. La refactorización de CSS no justifica simplificar ni eliminar diseño, navegación, contenido o controles visibles.

## 5. Componentes y patrones (resumen normativo)

| Elemento | Regla |
|---|---|
| Botones | Una acción primaria por vista. Etiquetas con verbo ("Guardar pedido"). Área táctil ≥ 44×44 px. Estado "cargando" sin cambiar el tamaño. |
| Campos | Etiqueta visible siempre (no solo *placeholder*), ayuda debajo, `autocomplete` correcto, `inputmode` numérico o telefónico donde aplique. Marcar lo opcional, no lo obligatorio. |
| Validación | Al salir del campo y al enviar; mensaje junto al campo y resumen enfocable arriba; nunca borrar lo escrito; el mensaje dice cómo corregir ("Escriba 8 dígitos, por ejemplo 8888 1234"). |
| Selectores | Para pocas opciones, botones de opción visibles; para muchas, combo con búsqueda accesible. |
| Fechas | Selector que acepte escritura (`dd/mm/aaaa`) y teclado; mostrar el día de la semana ("jueves 22 de octubre"). |
| Números | Aceptar coma o punto como decimal; mostrar con formato `es-CR`; unidades visibles ("kg", "₡"). |
| Diálogos | Solo tareas breves. `Escape` cierra, el foco queda atrapado dentro y vuelve al elemento que abrió el diálogo; título accesible. Se usa el componente del kit, nunca un `div` con `role="dialog"` a mano. |
| Notificaciones | `aria-live="polite"`, mínimo 6 s y descartables; los errores permanecen hasta cerrarlos. |
| Confirmaciones | Para acciones destructivas: botón con verbo y consecuencia ("Eliminar productor"), texto que explica qué ocurre; preferir **Deshacer** durante 10 s cuando sea posible. |
| Vacíos | Explicar qué es, por qué está vacío y ofrecer la acción primaria. |
| Carga | Esqueletos tras 300 ms; sin saltos de diseño; texto "Cargando…" para lectores de pantalla. |
| Errores | Lenguaje humano + qué hacer + botón "Reintentar". Página 403/404/500 con salida clara al hub. |
| Sin conexión | Mensaje visible, conservar datos del formulario, reintento automático cuando vuelva la red. |
| Listas largas | Búsqueda, filtros y orden con estado en la URL (se puede compartir y volver con "atrás"). |

## 6. Heurísticas aplicadas (checklist de revisión)

1. **Visibilidad del estado:** carga, guardado, errores y éxito siempre visibles; indicar el paso en flujos largos ("Paso 2 de 4").
2. **Lenguaje del usuario:** términos del oficio (envío, pedido, productor), no de base de datos.
3. **Control y libertad:** cancelar, deshacer, volver; nada de callejones sin salida.
4. **Consistencia:** mismos patrones, mismas etiquetas y mismas posiciones en todos los módulos.
5. **Prevención de errores:** valores por defecto sensatos, validación temprana, confirmaciones, límites de entrada.
6. **Reconocer antes que recordar:** datos visibles, buscadores con sugerencias, historial reciente.
7. **Flexibilidad:** atajos para quien usa mucho (teclado, acciones masivas) sin estorbar a quien empieza.
8. **Diseño minimalista:** ocultar lo avanzado tras "Más opciones"; sin ruido decorativo.
9. **Recuperación de errores:** mensajes que explican y ofrecen solución.
10. **Ayuda:** ayuda contextual breve y enlace "¿Cómo funciona?" por módulo; sin manuales largos.

## 7. Accesibilidad (WCAG 2.2 AA, mínimos obligatorios)

- Todo operable con teclado; orden de foco lógico; **foco visible** de ≥ 3 px y contraste ≥ 3:1; enlace "Saltar al contenido".
- Al cambiar de ruta: mover el foco al `h1` y anunciar el título de la página.
- Objetivos táctiles ≥ 44 px (el mínimo AA es 24 px; aquí se exige más).
- Contraste: texto 4,5:1; texto grande y componentes gráficos 3:1.
- Etiquetas, `aria-describedby` para ayudas y errores, `role="alert"` solo en errores críticos.
- Zoom al 200 % y ancho de 320 px sin pérdida de contenido; respetar `prefers-reduced-motion` (sin animaciones esenciales).
- **Autenticación accesible:** sin pruebas cognitivas (Google y contraseñas con pegado permitido).
- Imágenes con texto alternativo; iconos decorativos con `aria-hidden`.

## 8. Contenido y tono (español de Costa Rica)

- **Trato predeterminado:** formulaciones impersonales o de usted. Ejemplos: "Ingrese su correo", "Revise los datos", "No se pudo guardar. Intente de nuevo". **Voseo y otras voces:** se permiten cuando el propietario lo solicite, para toda la plataforma o para un módulo (ficha o instrucciones específicas). Es una preferencia de estilo, no una regla bloqueante: no hay pruebas automatizadas ni revisión obligatoria de tono. Lo importante es que cada pantalla use un tono coherente.
- Títulos y botones preferiblemente nominales o infinitivos: "Nuevo pedido", "Guardar cambios".
- Frases cortas, palabras comunes, sin tecnicismos ("no se pudo conectar", no "error de red 502").
- Formatos: fecha `22/10/2026` (y larga "jueves 22 de octubre"), hora de 24 h o 12 h con a. m./p. m. de forma consistente, moneda `₡12 500` (`Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" })`), teléfonos `8888 1234` (+506), pesos en kg.
- Todos los textos de un módulo viven en `strings.ts` (no dispersos en el JSX).

## 9. Para personas con poca práctica tecnológica

- Texto grande por defecto en pantallas de operación; botones grandes y etiquetados; iconos siempre con texto.
- Flujos guiados paso a paso con un resumen antes de confirmar.
- Sin gestos ocultos (deslizar, mantener presionado) como único camino.
- Sin cierre de sesión ni expiración que haga perder lo escrito sin aviso.
- Acciones de contacto directas: "Llamar" (`tel:`) y "Escribir por WhatsApp" (`wa.me`) en cada contacto.

## 10. Verificación

- Automática: `scripts/check-design.mjs` (morado, símbolos de IA, hexadecimales fuera de tokens), ESLint (`jsx-a11y`), `vitest-axe` en las pantallas principales.
- Manual por módulo antes de entregar: recorrido solo con teclado, 320 px y 200 % de zoom, modo oscuro, lector de pantalla en un flujo clave, texto "Muy grande".
- Cada entrega de UI incluye capturas (claro, oscuro, móvil) para validación visual del propietario.

## 11. Implementación visual: Tailwind CSS 4 + CSS de componentes gobernado

Pastel **mantiene Tailwind CSS 4**. La migración anterior demostró que la política de cero clases semánticas y la sustitución de componentes completos llevaron a una interfaz genérica; no demuestra una limitación de Tailwind.

- **Tailwind utilities:** composición local de JSX, layout, grid/flex, espaciado, breakpoints, tipografía utilitaria y estados simples.
- **Componentes compartidos:** botones, campos, menús, diálogos, tarjetas, tablas, avisos y estados viven en componentes reutilizables de `@/core/ui` con variantes explícitas. Reutilizar comportamiento y patrones sin obligar a todas las apps a compartir la misma pantalla de negocio.
- **Tokens CSS:** colores, superficies, sombras, foco y tema se declaran una sola vez en `core/design/tokens.css` y `core/design/module-themes.css`, expuestos como utilidades mediante `@theme inline`. No hexadecimales sueltos ni valores arbitrarios de color en JSX o CSS de componentes.
- **CSS de componentes permitido:** `core/design/components/*.css` para composiciones expresivas y acotadas que no se describen bien con una lista enorme de utilidades (por ejemplo, composición editorial del login, ilustración floral/geométrica o detalles del shell). Debe usar variables/tokens, mantener cada archivo por debajo de 400 líneas y no duplicar reglas por app.
- **Prohibido** convertir toda la aplicación en selectores CSS globales, agregar estilos inline arbitrarios, repetir estilos iguales en cada módulo o usar `@apply` fuera de `core/design/base.css`. El objetivo es CSS gobernado y componentes visuales legibles, no prohibir todo CSS.
- El color del módulo lo da `data-module`; los componentes leen `--accent*` en vez de condicionales por app. En oscuro las variables cambian; `dark:` se usa solo cuando no se resuelve con tokens.
- Ordenar las clases con `prettier-plugin-tailwindcss`; mantener componentes enfocados y con una responsabilidad clara.
- `scripts/tailwind-audit.mjs` mide cobertura de utilidades, clases de componente acotadas/sin uso, tamaño CSS y `@apply`. No debe imponer cero clases semánticas si esas clases viven únicamente en la carpeta permitida. `scripts/check-design.mjs` sigue bloqueando morados, símbolos de IA, color fuera de tokens y `@apply` no permitido.
- No cambiar a otro framework sin una prueba comparativa documentada de una pantalla representativa que valore fidelidad visual, accesibilidad, mantenibilidad, legibilidad, CSS generado y facilidad de trabajo para agentes.
- Cada entrega de UI conserva captura de referencia y requiere revisión visual de propietario en claro/oscuro, escritorio/móvil; el CI por sí solo no valida UX.

