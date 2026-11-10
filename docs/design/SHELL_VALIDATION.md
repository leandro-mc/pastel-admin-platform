# Validación del shell compartido

Qué se comprobó, cómo y con qué resultado, y **qué no se pudo comprobar**. Justificación del diseño: `docs/design/SHELL_RESEARCH.md`. Reglas vigentes: `docs/DESIGN_SYSTEM.md` §9. Fecha: 2026-11-10.

## 1. Resumen
- El shell nuevo cumple las comprobaciones automáticas del frontend, no tiene incumplimientos de accesibilidad propios en Chrome real (axe, WCAG 2.2 A/AA y buenas prácticas, 8 estados), mide ≥ 4,79:1 en todos sus pares de color en las 6 identidades y los 2 temas, y no desborda en 320, 390, 768, 1024 ni 1440 px.
- **El backend del modo desarrollador no se compiló ni se ejecutó** (el entorno no tiene .NET ni acceso a NuGet). Hay que correr `scripts/test-backend.ps1` y las pruebas con PostgreSQL antes de aceptar (§5).
- No hubo pruebas con personas ni con lector de pantalla ni en dispositivos físicos (§5).

## 2. Entorno y método
- Chrome for Testing 153 (headless) sobre el servidor de desarrollo de Vite, con la **API simulada** (`page.route`): se valida el comportamiento del frontend, no el del servidor. Las respuestas simuladas siguen los esquemas Zod de la aplicación.
- Herramienta repetible: `node scripts/shell-visual.mjs gallery|audit` (ver su cabecera). Requiere `npm ci` en `web/`, el servidor de desarrollo en marcha y, si Playwright no tiene su navegador, `CHROME_PATH`.
- Las capturas citadas están en `docs/design/evidence/`: `antes-*` (shell anterior) y `despues-*` (shell nuevo).

## 3. Resultados automáticos
| Comprobación | Resultado |
|---|---|
| `tsc -b`, ESLint (con reglas de accesibilidad), Prettier | Sin hallazgos |
| Vitest | **50/50** (21 previas + 12 de `core/devmode`, 14 del shell y 3 del alcance de permisos de Identity) |
| Mutación deliberada de la lógica | Se rompió `applySimulation`, la regla de activo exacto y el límite de la barra inferior: las pruebas fallaron. Una primera versión de la prueba de «Inicio exacto» **no** detectaba la mutación; se reforzó y se repitió |
| `check-design` | Sin hallazgos |
| `check-module-boundaries` | Sin hallazgos; regla nueva: un módulo no puede importar `@/core/devmode` (probada con un import prohibido en Brisa y revertida) |
| `tailwind-audit` | Ningún CSS de más de 400 líneas (`shell.css` 263, `shell-nav.css` 316, `shell-menus.css` 61) |
| `vite build` | Correcto; bundle principal de 533 kB (antes ≈ 520 kB, ya listado como deuda en `PROGRESS.md`) |
| Partición del CSS | 0 píxeles de diferencia contra la captura previa (escritorio y móvil) |

## 4. Resultados en navegador real
### 4.1 Accesibilidad (axe-core, WCAG 2.2 A/AA y buenas prácticas, incluido tamaño de objetivo)
Estados: escritorio claro (Workspace), escritorio oscuro (Brisa), móvil 390 (Workspace, con barra inferior), móvil 320 (Brisa), menú de apps abierto, menú de cuenta abierto, barra lateral plegada, visitante anónimo (Ágora) y, en el modo desarrollador, vista previa activa con aviso.

**Incumplimientos del shell: 0 en todos.** La primera pasada encontró 3 reales y se corrigieron: nombre accesible que no contenía el texto visible en el selector de app, la cuenta y «Ver como» (WCAG 2.5.3; ahora el nombre sale del contenido) y la barra lateral fuera de un landmark (ahora `aside` con nombre).

Fuera del shell, axe marcó 6 coincidencias de `color-contrast` en contenido de páginas, repartidas en 6 de los 9 estados (texto `muted`, §6).

### 4.2 Contraste medido (6 apps × 2 temas, valores computados del navegador)
| Par | Peor caso | Mínimo |
|---|---|---|
| Ítem activo (acento fuerte sobre acento suave) | 4,79:1 | 4,5 |
| Avatar (inicial sobre acento suave) | 4,79:1 | 4,5 |
| Ítem inactivo | 5,80:1 | 4,5 |
| Descripción de la app | 5,80:1 | 4,5 |
| Pie | 6,04:1 | 4,5 |
| Barra inferior, inactivo / activo | 6,48:1 / 11,42:1 | 4,5 |
| Miga actual, nombre de la app, Ayuda | ≥ 11,5:1 | 4,5 |
| Anillo de foco sobre sidebar / contenido | 5,40:1 / 5,62:1 | 3 |
| Icono de marca (no textual) | 3,64:1 | 3 |

Las identidades son las provisionales de `module-themes.css`; si una app cambia sus tokens hay que repetir `node scripts/shell-visual.mjs audit`.

### 4.3 Responsive
| Ancho | Comportamiento comprobado | Desborde horizontal |
|---|---|---|
| 1440 / 1024 | Sidebar de 256 px (plegable a 72 px, recordado); migas; sin barra inferior | 0 |
| 768 | Sin sidebar: control de app y Ayuda con texto arriba; barra inferior con 4 destinos | 0 |
| 390 / 320 | Control de app compacto, Ayuda y cuenta en iconos; barra inferior con etiqueta de 12 px | 0 |
| Brisa (1 destino) en todos | Sin barra inferior: un único «Inicio» no navega | 0 |

Con más de 5 destinos la barra muestra 4 y «Más» (probado con 7 destinos en Vitest; ninguna app real lo necesita hoy). A 320 px la etiqueta más larga de Workspace cabe tras reducir el relleno lateral; con tamaño de texto «Muy grande» puede truncarse con puntos suspensivos y el nombre completo se conserva para tecnología de apoyo.

### 4.4 Adaptación a las identidades
Las seis aplicaciones (Ágora, Brisa, Balance, Cosecha, Huella y Workspace) comparten la misma estructura y solo cambian por los tokens de cada una (acento, tinte de la pestaña activa, mosaico del control de app, avatar, anillo de foco); los menús, que se dibujan en un portal, repiten `data-module` para heredar el tema. `despues-identidades-claro.png` y `despues-identidades-oscuro.png` lo muestran. Los fondos (`--app-bg`, `--sidebar-bg`) hoy son neutros globales: cada app puede redefinirlos sin tocar el shell.

### 4.5 Interacciones (27 comprobaciones, todas correctas)
Plegado (256 → 72 px), nombre accesible y `aria-current` al plegar, descripción emergente, plegado recordado tras recargar; selector con las 6 apps y tema heredado por el menú; Escape cierra y devuelve el foco; menú de cuenta con tema y tamaño de texto y cambio de tema efectivo; visitante anónimo con «Preferencias» e «Ingresar», sin cuenta ni «Ver como»; orden de teclado: enlace de salto, marca, control de app y destinos.

### 4.6 Modo desarrollador (frontend, API simulada)
- Una cuenta Administrator sin permisos de Brisa ve la pantalla de acceso denegado; el selector «Ver como» aparece igualmente, y al elegir «Brisa — Usuario» se muestra la app, con aviso permanente y salida con un clic.
- La elección sobrevive a recargar (misma pestaña y cuenta) y se guarda solo como nombre de rol.
- **Ninguna petición lleva el rol simulado y no se genera ninguna petición de escritura.** El cliente solo consulta las definiciones de rol.
- Salir restaura el acceso real. Sin el permiso no hay selector ni consulta. El rol que deja de existir se descarta solo.

## 5. Lo que NO se verificó
1. **Backend del modo desarrollador** (permiso, siembra para `Administrator` y `Owner/Superuser`, reglas de la guardia, endpoint `GET /api/admin/developer/roles`, errores nuevos): sin compilar. Se añadieron 3 pruebas unitarias y 4 de integración (PostgreSQL) que **no se ejecutaron**. Deben correr en el entorno del propietario; si alguna falla, el defecto está en el código nuevo o en la prueba, no en lo previo.
2. **Lector de pantalla real** (NVDA, JAWS, VoiceOver, TalkBack): axe no sustituye la escucha del flujo.
3. **Dispositivos físicos y táctil**: solo ventanas de Chrome de escritorio con el tamaño correspondiente.
4. **Otros navegadores** (Firefox, Safari): el CSS usa `color-mix`, `:has` y `dvh`, compatibles con versiones actuales, sin prueba.
5. **Personas usuarias**, en particular con poca práctica tecnológica (el público de `DESIGN_SYSTEM.md` §2): la propuesta se apoya en investigación publicada, no en una prueba propia.
6. Zoom del 200 %, `prefers-reduced-motion`, modo de contraste forzado y datos reales de la API.

## 6. Hallazgos fuera del shell (se entregan al propietario; no se modificaron)
1. **Foco visible de `core/ui` bajo 3:1.** Con los tokens reales en tema claro, `--focus` mide 1,55:1 y `ring-accent-strong/45` mide 2,4:1 (WCAG 1.4.11). Propuesta: contorno sólido de 3 px con el acento fuerte de la app, como el del shell. Es una zona compartida: requiere autorización.
2. **`--muted` como texto: 4,44:1** sobre el fondo claro, justo por debajo de 4,5:1; produjo las coincidencias de `color-contrast` de las páginas. Cada app puede ajustar su token; en tema oscuro mide 7,26:1.
3. **Patrones de «AI slop» en páginas** (no en el shell): encabezado `eyebrow` en mayúsculas espaciadas del `PageHeader`, héroe de Workspace con degradados radiales y portada de Ágora con órbitas decorativas. Pertenecen a cada app.
4. **Texto duplicado** en Accesos de una cuenta: la frase «Los roles de cada app se administran desde esa aplicación» aparece dos veces seguidas en el mismo párrafo.

## 7. Antes y después (medido)
| Medida | Antes | Después |
|---|---|---|
| Ancho de la sidebar (escritorio) | 300 px | 256 px (−15 %) |
| Alto de cada destino | 68 px (dos líneas) | 44 px (una línea) |
| Destinos de Workspace visibles a 390 px | 1 de 4 | 4 de 4 |
| Texto más pequeño del shell | 9 px | 12 px |
| Controles para cambiar de app | 2 (selector + tarjeta) | 1 |
| Elementos de relleno | tarjeta de seguridad, «Fase 0» con indicador, 5 subtítulos, «MENÚ PRINCIPAL», «WORKSPACE», «Su espacio de trabajo», enlace decorativo del pie | ninguno |
| Controles permanentes de la barra superior (escritorio, con sesión) | 3 (plegar y tema como fichas con borde, cuenta) | 2 sin borde (Ayuda, cuenta) |
| CSS del shell | 684 líneas en un archivo | 640 en tres, máximo 316 |
| Foco del shell | 28–45 % de opacidad (1,6–2,4:1) | Sólido, ≥ 5,4:1 |

## 8. Cómo repetirlo
```powershell
cd web; npm ci; npm run dev            # en una terminal
node scripts/shell-visual.mjs audit    # en otra; sale con 1 si hay incumplimientos
node scripts/shell-visual.mjs gallery  # capturas en web/test-results/shell-visual
```
