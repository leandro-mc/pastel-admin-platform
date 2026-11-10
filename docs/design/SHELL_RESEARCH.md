# Investigación y propuesta de diseño del shell compartido

Alcance: **solo el shell** que comparten Ágora, Brisa, Balance, Cosecha, Huella y Pastel Workspace (sidebar y navegación, barra superior, proporciones y distribución, y el modo desarrollador). No define ni modifica la identidad visual de ninguna aplicación (paletas, tokens de tema, tipografía propia, componentes y pantallas de cada una). Fecha de la investigación: 2026-11-10.

Este documento es la justificación. Las reglas normativas que deben seguir los agentes quedan en `docs/DESIGN_SYSTEM.md` §9 y las decisiones en `docs/DECISIONS.md`; el resultado verificado, con sus límites, está en `docs/design/SHELL_VALIDATION.md`. Las capturas citadas están en `docs/design/evidence/`.

## 1. Método y calidad de la evidencia

No hubo pruebas con personas usuarias de Pastel. La propuesta se apoya en cuatro tipos de fuente, de más a menos fiable; cada hallazgo indica cuál sostiene la decisión.

| Tipo | Uso | Fiabilidad |
|---|---|---|
| **Estudios cuantitativos y normas** (NN/g con 179 participantes, WCAG 2.2, WAI-ARIA) | Decidir visibilidad de la navegación, tamaños, semántica | Alta |
| **Documentación de sistemas de diseño en producción** (Atlassian, Material 3 y guías de Android) | Decidir reparto de responsabilidades y comportamiento adaptable | Media: son convenciones de producto, no experimentos |
| **Auditoría del código y de capturas del shell actual** (este repositorio) | Detectar qué sobra, qué está duplicado y qué es falso | Alta para este caso: es evidencia directa |
| **Literatura de profesionales sobre «AI slop»** (blogs, repositorios de habilidades para agentes) | Catálogo de patrones repetitivos | Baja como evidencia, útil como vocabulario: coinciden entre sí, pero ninguna es un estudio empírico |

Lo que **no** se ha podido validar: comprensión real por personas con poca práctica tecnológica (el público que fija `DESIGN_SYSTEM.md` §2), lectores de pantalla reales (NVDA, JAWS, VoiceOver) ni dispositivos físicos. Está declarado en `SHELL_VALIDATION.md`.

## 2. Auditoría del shell actual

Capturas en `docs/design/evidence/antes-*.png` (shell real, API simulada). Cada fila es un hallazgo comprobable en el código (`web/src/app/layouts`, `web/src/app/shell`, `web/src/core/design/components/app-shell.css`).

| # | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| A1 | El selector «Cambiar aplicación» (icono de actualizar) y la tarjeta de la app activa son **dos controles para un solo concepto**; el icono de actualizar sugiere «recargar» | `ModuleSwitcher.tsx`, `AppSidebar.tsx` | Duplicación (NN/g la desaconseja) y una señal engañosa |
| A2 | Cada ítem de navegación tiene un **subtítulo fijo** («Vista general» se repite bajo cada «Inicio»). El shell lo decide comparando `item.to === "usuarios"`: conoce el interior de un módulo | `AppSidebar.tsx` líneas de `workspace-nav-copy` | Altura de 68 px por ítem, texto repetido y acoplamiento que rompe la arquitectura modular |
| A3 | **Tarjeta «Su espacio, protegido»** y pie con punto verde y «Pastel Workspace · Fase 0» | `AppSidebar.tsx` | Tranquilizan sin información: el punto parece un estado de salud que nadie consulta, y «Fase 0» es un dato interno mostrado a las personas |
| A4 | Etiquetas en **mayúsculas espaciadas de 9 y 10 px** («WORKSPACE», «MENÚ PRINCIPAL») | `app-shell.css` (`0.58rem`, `0.62rem`) | Por debajo de la escala mínima de 12 px de `DESIGN_SYSTEM.md` §3; rasgo típico de plantilla |
| A5 | La barra superior muestra «Workspace › Usuarios» con una miga **constante** («Pastel» o «Workspace») y un texto fijo «Su espacio de trabajo» | `RootLayout.tsx`, `TopBar.tsx` | La primera miga no orienta (nunca cambia); el texto fijo no informa |
| A6 | `Breadcrumbs.tsx` (migas reales por ruta) **existe pero no se usa** | `layouts/Breadcrumbs.tsx` | Código muerto mientras la barra usa una miga inventada |
| A7 | En móvil, la sidebar se convierte con CSS (`!important`, 9 px de texto) en una barra inferior **con scroll horizontal**: en 390 px solo se ve «Usuarios» de cuatro destinos | `antes-workspace-movil.png` | Navegación oculta: es exactamente el problema medido por NN/g (§3.2) |
| A8 | El selector de apps en móvil queda comprimido en 4,1 rem con texto de 9 px | `app-shell.css` | Ilegible y con objetivo táctil insuficiente |
| A9 | Sidebar de **300 px** (≈21 % de 1440 px) con ≈45 % de su altura vacía o de relleno | `antes-workspace-escritorio.png` | Mal aprovechamiento del espacio |
| A10 | Contenedor con `height: 100vh; overflow: hidden` y scroll interno | `app-shell.css` | Se pierde el comportamiento nativo de scroll y de la barra del navegador en móvil; en móvil ya se revierte con otra regla |
| A11 | «Mi cuenta» está **dentro de la navegación de la app**, y además en el menú de cuenta | `AppSidebar.tsx`, `AccountMenu.tsx` | Duplicado; mezcla navegación global con la de la app |
| A12 | El foco visible usa `--focus` (verde global, 28 % de opacidad) y `ring-accent-strong/45` | `tokens.css`, `shell/styles.ts` | Medido con los tokens reales en tema claro: **1,55:1** y **2,4:1**, ambos por debajo de 3:1 (WCAG 1.4.11); además no sigue el color de la app activa. El shell usa ahora un contorno sólido (≥ 5,4:1); el foco de `core/ui` queda como hallazgo para el propietario (`SHELL_VALIDATION.md` §6) |
| A13 | Los botones de plegar y de tema son **fichas con borde** de 44 px, y tema y nombre de usuario compiten en la barra | `TopBar.tsx` | Peso visual igual para acciones de frecuencia muy distinta |

Observaciones fuera de alcance (pertenecen a las páginas, no al shell; se entregan al propietario): el `PageHeader` con «eyebrow» en mayúsculas espaciadas, el héroe de Workspace con degradados radiales y la portada de Ágora con órbitas decorativas siguen el catálogo de §4.

## 3. Hallazgos de la investigación

### 3.1 La navegación vertical izquierda, visible y con texto
- NN/g recomienda la navegación vertical a la izquierda para estructuras amplias o que crecen, con etiquetas de texto, no solo iconos, porque la atención se concentra en la mitad izquierda y la búsqueda en una lista vertical requiere menos fijaciones. Advierte contra duplicar el menú en dos formas y contra esconderlo. Admite el modo «solo iconos» únicamente como compromiso para aplicaciones de uso diario, con el texto como estado por defecto. Aconseja poner lo menos importante al final de menús largos. (Laubheimer, 2021)
- **Decisión:** sidebar visible por defecto con icono y texto; el modo de iconos es opcional, recordado y con nombre accesible; un solo menú por pantalla.

### 3.2 Ocultar la navegación empeora la tarea, también en móvil
- En 179 participantes y 6 sitios, la navegación oculta se usó menos y más tarde, y la descubribilidad del contenido cayó más de un 20 %; en escritorio el efecto fue mayor. Las tareas fueron al menos un 39 % más lentas en escritorio y un 15 % en móvil. Para teléfonos recomiendan mostrar los enlaces si son cuatro o menos; con más, una navegación **mixta** (parte visible, parte en «más») rinde mejor que ocultarla toda. (Pernice y Budiu, 2016)
- Material 3 y las guías de Android asignan barra de navegación a ventanas compactas y riel o cajón a las amplias; y la guía de SAP basada en Material indica no usar el cajón cuando hay menos de cinco destinos en pantallas compactas. Babich (Smashing) fija un máximo de cinco destinos en una barra inferior, siempre con etiqueta, y un «Más» para la cola larga.
- **Decisión:** en pantallas estrechas, **barra inferior con etiqueta**; hasta 5 destinos visibles, y con más de 5 se muestran 4 más «Más». Sin hamburguesa para lo principal. Con menos de 2 destinos no hay barra (un único «Inicio» no es navegación).

### 3.3 Reparto de responsabilidades: global arriba, de la app a un lado
- El sistema de navegación de Atlassian reserva la barra superior a acciones globales entre aplicaciones (selector de apps, ayuda, perfil, ajustes) y la navegación lateral a lo propio de cada app; el selector de apps y la marca van en el extremo inicial.
- **Decisión:** la barra superior no contiene nada de una app concreta (sin acciones de página) y solo ofrece ayuda, preferencias, cuenta y, si procede, el selector del modo desarrollador. Las acciones de una página van en el encabezado de la propia página.
- Pastel mantiene la decisión del propietario de que el selector viva en la sidebar (patrón de espacios de trabajo, como Slack o Linear); en móvil, donde no hay sidebar, pasa al extremo inicial de la barra superior, como en Atlassian.

### 3.4 Migas de pan: solo cuando hay jerarquía
- NN/g: no hacen falta en jerarquías de uno o dos niveles (basta indicar la sección actual), el último elemento no es un enlace, deben reflejar la jerarquía y no el historial, y en móvil conviene acortarlas o no mostrarlas si ocupan espacio.
- Las apps de Pastel son planas, con detalle a un nivel más (p. ej. usuario › accesos). El shell actual mostraba una miga constante. **Decisión:** migas reales por ruta (`handle.crumb`), sin repetir el nombre de la app (decisión del propietario), visibles en escritorio; en un nivel plano se muestra solo la sección actual como texto. En móvil se omiten: la barra inferior marca la sección y la página tiene su `h1`.

### 3.5 Accesibilidad con efecto directo sobre el shell
- **WCAG 2.5.8 (AA)**: objetivos de al menos 24×24 px; el criterio AAA 2.5.5 pide 44×44. `DESIGN_SYSTEM.md` ya exige 44 px: se mantiene en todo el shell.
- **WCAG 2.4.11 (AA)**: el elemento enfocado no puede quedar totalmente oculto por contenido fijo. La barra superior sticky y la barra inferior fija lo harían: el shell define `scroll-padding` superior e inferior.
- **WCAG 3.2.6 (A)**: la ayuda debe aparecer en el mismo orden relativo en todas las páginas. La ayuda ocupa siempre la misma posición en la barra superior.
- **Landmarks (WAI-ARIA, MDN)**: varias regiones `nav` necesitan nombre distinto; si repiten los mismos enlaces (sidebar en escritorio y barra inferior en móvil), el mismo nombre. Solo una está visible (la otra es `display: none`, fuera del árbol de accesibilidad).
- **`aria-current="page"`** en el destino activo; el estado nunca se comunica solo con color (barra de acento, peso y color).
- **Foco**: 3 px sólidos con el color de acento fuerte de la app activa; hoy el foco global no cumple el contraste (A12).

### 3.6 Vista previa por rol («ver como»)
La literatura es de profesionales (propuestas en repositorios abiertos), pero converge en lo esencial:
- La **vista previa de rol** es más ligera y segura que suplantar a una persona: no toca datos de otra cuenta. Debe ser visual, con **aviso permanente** que nombre el rol y **salida con un clic**.
- Algunos diseños limitan la vista previa a la intersección con los permisos reales para no elevar nunca; otros bloquean escrituras por defecto y auditan.
- **Control de acceso roto** es el riesgo nº 1 de OWASP: ocultar elementos de la interfaz no es autorización. Todo lo que muestre la simulación es presentación; la autoridad es el servidor.
- **Decisión (detalle en §6):** simulación puramente visual; la intersección con los permisos reales **no** se aplica porque anularía el propósito (una cuenta Administrator no posee permisos de negocio de Brisa y aun así debe poder ver cómo se presenta un rol de Brisa); la garantía de seguridad es que el cliente nunca envía el rol simulado y el servidor sigue decidiendo cada operación con la sesión real.

## 4. Patrones repetitivos del diseño generado por IA aplicados al shell

La literatura de profesionales coincide en un catálogo. Se traduce aquí a criterios comprobables para un shell administrativo; no es una lista de prohibiciones estéticas, sino de **elementos que no se justifican por una necesidad de la persona usuaria**.

| Patrón habitual | Cómo aparecía o podría aparecer en el shell | Criterio aplicado |
|---|---|---|
| Degradados morados o azul-violeta, brillo neón, vidrio esmerilado | Fondos de marca, activo con degradado | Regla dura vigente: sin morado. Sin degradados ni vidrio en el shell; superficies planas con tokens |
| Tarjeta para todo, tarjetas anidadas, borde gris en cada tarjeta | Tarjeta de app activa, tarjeta de seguridad, fichas con borde en los botones de la barra | El shell no usa tarjetas. Separa con **un** borde de 1 px entre regiones y usa fondo solo para el estado activo |
| Etiquetas «eyebrow» en mayúsculas espaciadas y cadenas decorativas | «MENÚ PRINCIPAL», «WORKSPACE» | Sin mayúsculas espaciadas. Los encabezados de grupo, si existen, van en minúscula normal y solo si el módulo los declara |
| Estadísticas y estados decorativos | Punto verde «Fase 0» | Todo indicador del shell debe provenir de un dato real; si no, no se muestra |
| Tranquilizar sin informar | «Su espacio, protegido», «Su espacio de trabajo» | Cada texto del shell responde una pregunta de la persona (dónde estoy, a dónde voy, qué puedo hacer) o se elimina |
| Subtítulo debajo de cada elemento de menú | «Vista general», «Directorio y accesos» | Un ítem es icono y una o dos palabras; el contexto va en el título y la descripción de la página |
| Sombras generosas y esquinas muy redondeadas en todo | Sombras y radios de 16 px en tarjetas | Radio contenido (8 px) y elevación solo en superficies flotantes (menús, cajón) |
| Hero centrado y rejilla de tres tarjetas | Hub de apps como inicio | Decisión del propietario vigente: no hay hub; el shell no genera páginas |
| Iconos finos genéricos sin función | Icono decorativo junto a texto | Los iconos acompañan siempre a una etiqueta de texto y marcan la sección; los decorativos llevan `aria-hidden` |
| Sustituir un default por otro («segunda ola»: crema con terracota, casi negro con acento ácido, líneas editoriales) | Riesgo al «arreglar» el aspecto | **El shell no impone paleta ni tipografía**: lee los tokens que define cada app. La personalidad nace de las apps, no del marco |

**Prueba de eliminación** (para agentes futuros): antes de añadir un elemento al shell, responda por escrito: ¿qué pregunta de la persona contesta?, ¿existe ya en otro lugar de la pantalla?, ¿se basa en un dato real?, ¿sigue funcionando si se quita el color? Si no hay respuesta a la primera, el elemento no entra.

## 5. Propuesta de diseño

### 5.1 Principios
1. **El shell es un marco, no una función.** El contenido es el producto: menos cromo, más contenido.
2. **Tres preguntas, una respuesta cada una:** dónde estoy (app y sección), a dónde puedo ir (secciones y apps) y qué puedo hacer de forma global (ayuda, preferencias, cuenta).
3. **Neutral por herencia, con identidad por tokens.** El shell solo lee tokens semánticos; cada app define los suyos, claros y oscuros.
4. **Visible y con texto** (NN/g); plegable como opción.
5. **Densidad serena:** filas de 44 px, texto de 14 px, mínimo 12 px, múltiplos de 4 px.

### 5.2 Anatomía en escritorio (≥ 1024 px)
```text
┌ sidebar 16 rem ────┬ columna principal ───────────────────────────────────────┐
│ 🌸 pastel          │ Usuarios › Ana Pérez            [Ver como ▾] Ayuda  (M) ▾ │ ← barra superior 3,5 rem
│ [▣ Brisa      ⇅]  │──────────────────────────────────────────────────────────│
│ ▌ Inicio           │                                                          │
│   Pendientes       │   contenido de la página (cada app decide su composición)│
│   …                │                                                          │
│                    │──────────────────────────────────────────────────────────│
│ « Contraer menú    │ © 2026 Pastel · Todo en su lugar. Todo fluye mejor.      │
└────────────────────┴──────────────────────────────────────────────────────────┘
```
- **Sidebar de 16 rem** (256 px; 4,5 rem plegada). Filas de 44 px, un solo renglón, icono de 20 px y etiqueta. Activo: barra de acento de 3 px, fondo suave de la app y peso 600; además `aria-current`.
- **Un solo control de app** (nombre, descripción corta e icono de la app, con indicador de menú) que sustituye al selector con icono de actualizar y a la tarjeta. Si la persona solo tiene una app, es un bloque informativo sin menú (sin controles muertos).
- **Marca** a la altura de la barra superior (misma línea horizontal); devuelve al inicio de la app activa.
- **Plegar** en la parte inferior; el estado se recuerda (`pastel-sidebar-collapsed`). Plegada, cada ítem tiene nombre accesible y descripción emergente accesible con teclado.
- **Barra superior**: migas reales a la izquierda; a la derecha, selector del modo desarrollador (solo si corresponde), Ayuda y menú de cuenta. Es `sticky`.
- **Pie**: se conserva (decisión del propietario), reducido a una línea de 2,5 rem. Se retira el enlace decorativo «Hecho para crecer» que duplicaba la marca.
- **Scroll del documento** (no de un contenedor interno).

### 5.3 Anatomía en móvil y tableta (< 1024 px)
- Barra superior de 3,5 rem: a la izquierda, el control de app (icono, nombre y menú); a la derecha, el selector del modo desarrollador (icono), Ayuda (icono) y cuenta (avatar).
- **Barra inferior fija** con la navegación de la app (§3.2), 4 rem más el área segura del dispositivo; etiqueta de 12 px bajo un icono de 24 px; marcador superior de 3 px en el activo.
- El contenido reserva el espacio de la barra inferior (`padding-bottom`) y `scroll-padding` (WCAG 2.4.11).

### 5.4 Menú de cuenta y preferencias
- **Cuenta**: avatar con la inicial y nombre (oculto en pantallas estrechas); al abrir, nombre y correo, «Mi cuenta», **Apariencia** (tema claro/oscuro) y **Tamaño de texto** y «Cerrar sesión».
- El tema deja de ser un botón fijo en la barra: se establece una vez y es poco frecuente (se agrupa con otras preferencias). Para visitas sin sesión (Ágora es pública) hay un menú **Preferencias** con lo mismo, junto al botón «Ingresar», de modo que nadie pierde el control de tema ni de tamaño de texto.
- **Ayuda**: siempre visible, con icono y texto desde 640 px (WCAG 3.2.6: misma posición en todas las páginas).

### 5.5 Qué hereda cada app y qué personaliza

| Hereda (no se rediseña por app) | Personaliza cada app |
|---|---|
| Estructura, geometría, puntos de ruptura y comportamiento (plegar, barra inferior, menús) | **Tokens de tema** claro y oscuro (`module-themes.css` o el archivo de la app), incluidos fondo, superficies, bordes y acentos |
| Landmarks, enlace «Saltar al contenido», foco al `h1`, orden de teclado | Nombre, descripción, icono y orden en el selector (manifiesto) |
| Selector de app, ayuda, preferencias, cuenta y modo desarrollador | Ítems de navegación: etiquetas, iconos, permisos y **grupos** opcionales (manifiesto) |
| Aviso de vista previa y migas | Tipografía (autoalojada) y radios, mediante `--shell-radius` y `--font-sans` |
| Pie de página | Composición y contenido de sus páginas (el shell no tiene ranuras para ellas) |

Variables de geometría disponibles (sin valores de color): `--shell-sidebar-width`, `--shell-sidebar-rail-width`, `--shell-topbar-height`, `--shell-bottomnav-height`, `--shell-radius`. El shell no introduce ningún color global: solo lee `--app-bg`, `--surface`, `--surface-raised`, `--sidebar-bg`, `--text`, `--text-secondary`, `--muted`, `--border`, `--border-strong`, `--accent`, `--accent-strong`, `--accent-soft` y `--on-accent`.

### 5.6 Decisiones que se apartan de documentos vigentes
Se registran en `docs/DECISIONS.md` como **propuestas pendientes de ratificación** porque `PASTEL-PRODUCT-AND-UX.md` pide plantear las diferencias al propietario:

1. Selector y tarjeta de la app activa pasan a **un único control** (se conserva su ubicación en la sidebar, la identidad y la descripción; se retira el icono de actualizar).
2. Pie de página: se conserva, sin el enlace decorativo.
3. Tema y tamaño de texto pasan al menú de cuenta (o «Preferencias» sin sesión).
4. «Mi cuenta» sale de la lista de navegación de la app (sigue en el menú de cuenta).
5. En móvil el selector pasa a la barra superior y la navegación a una barra inferior sin desplazamiento horizontal.
6. Se retiran la tarjeta de seguridad, el pie «Fase 0» con indicador y la frase «Su espacio de trabajo».

### 5.7 Alternativas consideradas y descartadas
- **Barra superior global con selector de apps al estilo Atlassian**: válida, pero contradice la decisión vigente de ubicar el selector en la sidebar; no aporta suficiente para reabrir la decisión.
- **Cajón (hamburguesa) en móvil**: menos descubrible (§3.2) y de uso innecesario con menos de cinco destinos.
- **Riel de iconos en tabletas (Material)**: añade un estado intermedio; con la barra inferior hasta 1023 px hay menos casos que probar. Puede añadirse después sin cambiar el contrato.
- **Saludo personalizado y tarjetas de acceso rápido en el inicio**: es una página, no el shell, y la decisión del propietario excluye el hub.
- **Bloquear escrituras durante la vista previa**: evitaría acciones accidentales, pero impide probar flujos completos y el servidor ya es la autoridad; queda como opción futura si el propietario la quiere (§6.4).

## 6. Modo desarrollador

### 6.1 Modelo
- Es un **permiso de plataforma** (`platform.developer.mode`, «Modo desarrollador»), no un rol funcional ni un indicador nuevo en la tabla de usuarios: reutiliza la fuente única de permisos efectivos (`PermissionEvaluator`), la auditoría existente y el esquema actual (sin migración).
- **Automático** para los roles de sistema `Administrator` y `Owner/Superuser` (siembra del catálogo en cada arranque).
- **Asignable a cuentas concretas** como excepción individual desde Configuración › Usuarios › Accesos, con las reglas vigentes: solo quien lo posee puede concederlo (Owner siempre), la acción se audita y se invalida el token de la cuenta.
- **Nunca por rol personalizado**: igual que Workspace y Owner, evita que un gestor de roles lo reparta por una vía lateral. Las cuentas con rol `Administrator` no admiten excepciones (regla vigente), de modo que no se les puede retirar.

### 6.2 Comportamiento
- Selector «Ver como» en la barra superior, solo para quien tenga el permiso: «Mi acceso real», los roles de la aplicación activa y «Sin rol en esta aplicación».
- La lista sale de `GET /api/admin/developer/roles?app=<código>`, protegida por el permiso. Devuelve definiciones de rol y sus permisos dentro de esa app; no devuelve personas ni datos.
- La simulación **reemplaza solo la porción de permisos de la app activa** (`permisos reales − permisos de la app + permisos del rol`). Así cambian la navegación, las secciones, las acciones y las rutas permitidas por la interfaz, y el resto de la plataforma (otras apps, cuenta) queda como es.
- Un aviso fijo debajo de la barra nombra el rol y tiene «Salir de la vista previa». La elección vive en `sessionStorage` (solo identificadores, nunca permisos), por pestaña y por cuenta; se borra al cerrar sesión, al cambiar de cuenta o si la cuenta pierde el permiso.

### 6.3 Garantías de seguridad
1. **El cliente no envía el rol simulado**: ninguna petición, cookie o cabecera lo transporta; no existe nada que el servidor pueda confundir con una concesión.
2. **Toda autorización sigue en el servidor** con la sesión real; una acción visible por la simulación que la cuenta no puede ejecutar responde 403.
3. **Entrar al modo exige el permiso en el servidor** (el endpoint lo valida); el estado del navegador por sí solo no concede nada.
4. **Alcance acotado de información**: el endpoint expone solo definiciones de rol (permisos por app). Es un ensanchamiento deliberado respecto del principio «Workspace solo recibe permisos de plataforma» y queda anotado en `docs/SECURITY.md` para revisión.
5. **Sin dependencias entre módulos**: ningún módulo de negocio importa ni conoce el modo desarrollador; el cálculo vive en `core` y se aplica en `useAuth()`, de modo que los módulos lo heredan sin cambios.

### 6.4 Límites conocidos
- Los **datos** que devuelve la API siguen siendo los de la cuenta real; la simulación cambia lo que se muestra, no lo que contestan los endpoints. Una vista previa fiel de datos requeriría un mecanismo de servidor (lectura con ámbito de rol, auditoría y escritura bloqueada) que no se implementa aquí por su riesgo.
- Mientras se simula, las acciones que la cuenta real sí puede ejecutar **se ejecutan de verdad**. El aviso lo dice. Bloquear escrituras queda como opción futura.

## 7. Plan de validación
Automática: tipos, Prettier, ESLint (reglas de accesibilidad), Vitest con axe, `check-design`, fronteras de módulos. Visual: capturas del shell real en 320, 390, 768, 1024 y 1440 px, claro y oscuro, con las seis identidades. Medida: contraste de los pares de color del shell por app y tema, tamaño de los objetivos y desbordes. Los resultados y lo no verificado están en `SHELL_VALIDATION.md`.

## 8. Referencias consultadas
- Laubheimer, P. (2021). *Left-Side Vertical Navigation on Desktop: Scalable, Responsive, and Easy to Scan*. NN/g. <https://www.nngroup.com/articles/vertical-nav/>
- Pernice, K. y Budiu, R. (2016). *Hamburger Menus and Hidden Navigation Hurt UX Metrics*. NN/g. <https://www.nngroup.com/articles/hamburger-menus/>
- Laubheimer, P. (2018, revisado 2026). *Breadcrumbs: 11 Design Guidelines for Desktop and Mobile*. NN/g. <https://www.nngroup.com/articles/breadcrumbs/>
- Android Developers. *Build adaptive navigation* (barra, riel y cajón según clase de ventana). <https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation>
- SAP Fiori para Android. *Navigation Drawer* (guía basada en Material 3). <https://www.sap.com/design-system/fiori-design-android/v25-4/components/m3-standard-components/navigation-drawer/usage>
- Atlassian. *Navigation system: guía de migración* (barra superior global, navegación lateral por app). <https://cdn.jsdelivr.net/npm/@atlaskit/navigation-system@9.4.2/constellation/index/migration-guide.mdx>; *Navigation design guidelines* de Jira. <https://developer.atlassian.com/cloud/jira/platform/navigation/>; *Cambiar entre apps*. <https://support.atlassian.com/platform-experiences/docs/how-to-switch-between-apps-and-organizations/>
- Babich, N. (2017). *Basic Patterns for Mobile Navigation: Pros and Cons*. Smashing Magazine. <https://shop.smashingmagazine.com/2017/05/basic-patterns-mobile-navigation/>; (2016) *The Golden Rules of Bottom Navigation Design*. <https://smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design>
- W3C. *Understanding SC 2.5.8 Target Size (Minimum)*. <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>; *What's New in WCAG 2.2* (2.4.11 Focus Not Obscured, 3.2.6 Consistent Help). <https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/>
- MDN. *ARIA: navigation role*. <https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/Navigation_Role>; W3C APG. *Disclosure navigation*. <https://www.w3.org/WAI/ARIA/apg/example-index/disclosure/disclosure-navigation.html>
- Control de acceso roto (OWASP A01): *Broken access control*. <https://www.indusface.com/learning/broken-access-control>
- Vista previa por rol (discusiones de profesionales, baja fiabilidad): Apache Superset #37705 <https://github.com/apache/superset/discussions/37705>; VerifyWise #5169 <https://github.com/verifywise-ai/verifywise/issues/5169>; Lots #156 <https://github.com/carnufex/Lots/issues/156>; lms-cms-dashboard #58 <https://github.com/Saurabh-Taylor/lms-cms-dashboard/issues/58>
- Patrones de «AI slop» (profesionales, baja fiabilidad): funboy322/avoid-ai-design <https://github.com/funboy322/avoid-ai-design>; SmoothUI <https://smoothui.dev/blog/ai-design-slop>; 925 Studios <https://www.925studios.co/blog/ai-slop-design-tells>; VibeCodeKit <https://vibecodekit.dev/ai-slop-design>; bswen <https://docs.bswen.com/blog/2026-03-20-ai-generated-ui-anti-patterns/>
