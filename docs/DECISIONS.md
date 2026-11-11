# Registro de decisiones

Decisiones vigentes de arquitectura y del propietario, en una línea cada una. El detalle técnico está en los documentos de arquitectura, seguridad y diseño; este registro responde «¿por qué es así?».

## Arquitectura
| Decisión | Resumen y motivo |
|---|---|
| **Monolito modular** | Un host .NET y un módulo por aplicación (proyecto propio, esquema propio), con frontera verificada por pruebas de arquitectura. Permite escindir una app más adelante sin reescribir. |
| **Esquemas y migraciones por módulo** | Un esquema PostgreSQL y un historial de migraciones por módulo; sin claves foráneas ni joins entre esquemas. Propietario de datos claro y extracción futura posible. |
| **Stack** | .NET 10 / ASP.NET Core, EF Core + Npgsql, React 19 + TypeScript + Vite, React Router 7 (rutas enlazables por módulo), TanStack Query, React Aria Components, React Hook Form + Zod, Tailwind 4; pruebas con Vitest y Playwright. Rutas enlazables en lugar de pantallas en estado local. |
| **Compilación por subconjunto de módulos** | `PASTEL_MODULES` decide qué apps se compilan (API y web); Identity siempre. Imágenes mínimas por despliegue. |
| **Tailwind 4 + CSS gobernado** | Tailwind para utilidades y tokens para el diseño, con CSS de componentes acotado. La migración anterior demostró que prohibir todo CSS empobrecía la interfaz; no es una limitación de Tailwind. |
| **Errores y logs** | Contrato `problem+json` con `code` y `traceId`, logs JSON (Serilog) con correlación y sin datos sensibles. |
| **Ingreso con Google (OIDC)** | Google autentica la identidad; Pastel conserva su propia sesión y autorización. Vincula por correo verificado a una cuenta existente o registra como Member; tokens de Google no se guardan. |
| **Refresh token con ventana de gracia** | La rotación de refresh tokens tolera peticiones concurrentes (varias pestañas) durante 10 s (`Auth:Refresh:ReuseGraceSeconds`) reemitiendo la misma sucesora; fuera de esa ventana un token reutilizado revoca todas las sesiones. |
| **Slices verticales** | Casos de uso en `Features/<Caso>/` con endpoints mínimos (sin controladores): cada slice agrupa petición, validación, handler y ruta. |

## Producto y proceso (propietario)
| Fecha | Decisión |
|---|---|
| 2026-10 | **Modelo multiaplicación**: Ágora es la app pública y obligatoria (solo el Owner/Superuser puede decidir no incluirla); Brisa y Balance las activa la persona; Cosecha solo para quienes el Owner/Superuser registre o autorice; Huella es exclusiva del Owner/Superuser. Detalle en `docs/product/PASTEL-PRODUCT-AND-UX.md`. |
| 2026-10 | **Owner/Superuser** es un rol distinto de Administrator: Administrator no hereda privilegios exclusivos del propietario ni puede escalarlos. |
| 2026-10-24 | **Pruebas esenciales**: solo lo fundamental; lo demás se difiere y se documenta. Los 20 requisitos obligatorios restantes de la Fase 0 pasaron a diferidos. |
| 2026-10-24 | **Voseo permitido** cuando el propietario lo pida; sin prueba ni revisión obligatoria. |
| 2026-10-25 | **Un solo tipo de agente**: commits lógicos por unidad de trabajo (se elimina la cadencia por checkpoints). Reglas en `docs/GIT_WORKFLOW.md`. |
| 2026-10-25 | **CI de GitHub**: nunca por commit; solo al aprobar un PR hacia `dev` y solo lo básico, salvo indicación expresa. |
| 2026-10-25 | **Diseño**: se eliminan las restricciones de paleta e identidad por subapp (en investigación); se mantienen las reglas duras (sin morado ni lo habitual del diseño de IA). |
| 2026-10-25 | **Historia de `refactor/modular-foundation`**: unificada en unidades lógicas con el mismo contenido final; el estado previo queda en la rama de respaldo. |
| 2026-10-25 | **`check-design` solo con reglas duras**: se retiran la exigencia de colores solo mediante tokens y la restricción de `@apply`; sigue verificando morado e iconos o emojis de IA. La identidad visual de cada app se define con la investigación. |

## Shell compartido y modo desarrollador
Propuestas del rediseño del shell (`docs/design/SHELL_RESEARCH.md`, 2026-11-10). **El propietario ratificó íntegramente, sin modificaciones ni aclaraciones, S1–S6 y M1–M4 el 2026-11-10**; son definitivas y los agentes no deben pedir confirmación de nuevo. **S7 no estaba incluida en esa ratificación: sigue como propuesta sin ratificar** (el código la implementa y se puede revertir por separado). Cualquier cambio posterior a una decisión ratificada exige una nueva decisión del propietario.

| ID | Decisión | Motivo y alcance | Estado |
|---|---|---|---|
| S1 | **Un solo control de app** en la sidebar (en móvil, en la barra superior) sustituye al selector con icono de actualizar y a la tarjeta de la app activa. Conserva ubicación, nombre, identidad y descripción; en Workspace dice «Pastel Workspace» | Eran dos controles para un concepto y el icono sugería «recargar». Modifica el punto 6 de `PASTEL-PRODUCT-AND-UX.md` §3 | **Ratificada** 2026-11-10 |
| S2 | **Pie conservado**, reducido a una línea y sin el enlace decorativo «Hecho para crecer» | El propietario pidió no retirar el pie; el enlace duplicaba la marca | **Ratificada** 2026-11-10 |
| S3 | **Tema y tamaño de texto** pasan al menú de cuenta (menú «Preferencias» sin sesión); **Ayuda** sigue visible | Se fijan una vez; para visitas sin sesión (Ágora) el control no se pierde | **Ratificada** 2026-11-10 |
| S4 | **«Mi cuenta» sale de la navegación de la app**; sigue en el menú de cuenta | Duplicaba el menú y mezclaba navegación global con la de la app | **Ratificada** 2026-11-10 |
| S5 | **Móvil**: control de app en la barra superior y **barra inferior visible con etiqueta** (≤ 5 destinos; con más, 4 y «Más»; sin barra con menos de 2) | La navegación oculta empeora la tarea (NN/g) y la barra anterior ocultaba 3 de 4 destinos a 390 px | **Ratificada** 2026-11-10 |
| S6 | **Se retiran** la tarjeta «Su espacio, protegido», el pie «Fase 0» con indicador, los subtítulos fijos de los ítems y la frase «Su espacio de trabajo» | No respondían una pregunta de la persona o mostraban un dato no consultado | **Ratificada** 2026-11-10 |
| S7 | **Contrato del manifiesto**: `alsoActiveOn` y `group` (opcionales) | El shell dejó de comparar rutas de Identity; las pantallas de detalle se declaran en el manifiesto | Propuesta, sin ratificar |
| M1 | **Modo desarrollador = permiso de plataforma** `platform.developer.mode`: automático para `Administrator` y `Owner/Superuser`, asignable a cuentas concretas, **nunca por rol personalizado** | Reutiliza la fuente única de permisos, la auditoría y el esquema (sin migración). Detalle en `SECURITY.md` | **Ratificada** 2026-11-10 |
| M2 | **La vista previa es solo visual**: sin intersección con los permisos reales (anularía el propósito) y sin bloquear escrituras; el cliente no envía el rol y el servidor autoriza con la sesión real | Los datos de la API siguen siendo los de la cuenta real. Bloquear escrituras queda como opción futura | **Ratificada** 2026-11-10 |
| M3 | **Ensanchamiento deliberado**: `GET /api/admin/developer/roles` entrega a quien tiene el modo los permisos funcionales de los roles de cada app (definiciones, no datos) | Cambia el principio «Workspace solo recibe permisos de plataforma». Si el propietario lo prefiere, se restringe en ese endpoint | **Ratificada** 2026-11-10 |
| M4 | Ningún módulo importa `@/core/devmode` (regla en `check-module-boundaries`) | Transversal, sin dependencias entre módulos | **Ratificada** 2026-11-10 |
| S8 | **El botón de plegar la sidebar va arriba**, junto a la marca (plegada, justo debajo de ella), no abajo | Indicación del propietario tras usar el shell. Sustituye la ubicación inferior de la propuesta inicial | **Vigente** 2026-11-10 (indicada por el propietario) |
| S9 | **Tema y tamaño de texto como controles de icono**: botón único luna/sol y fila de cuatro «A» con la elegida marcada y nombre emergente; sin listas de texto. Siguen en el panel de cuenta (S3) | Indicación del propietario; coherente con el interruptor del inicio de sesión | **Vigente** 2026-11-10 (indicada por el propietario) |
| S10 | **Cierre de sesión destacado**: último elemento del panel de cuenta, separado y de ancho completo, con icono y texto | Indicación del propietario, siguiendo las convenciones de interfaz | **Vigente** 2026-11-10 (indicada por el propietario) |

Hallazgos que se entregan sin decisión tomada (`docs/design/SHELL_VALIDATION.md` §6): foco visible de `core/ui` bajo 3:1 (1,55:1 y 2,4:1 en tema claro) y `--muted` como texto a 4,44:1.
