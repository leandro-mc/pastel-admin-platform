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
