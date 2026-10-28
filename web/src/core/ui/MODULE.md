# Core UI — componentes compartidos

## Propósito

Kit común del shell y las subaplicaciones. Centraliza patrones de formularios, acciones, estados y estructura sin borrar la composición visual propia de cada pantalla.

## Componentes

- **Button:** variantes primary, secondary, danger, ghost y link; botón nativo, deshabilitado y estado ocupado.
- **TextField:** etiqueta visible, ayuda y error asociados; opción de mostrar u ocultar contraseña.
- **SelectField / CheckboxField:** controles nativos con etiqueta, ayuda, errores y referencias ARIA.
- **Dialog / ConfirmDialog:** diálogo modal basado en React Aria y acciones de confirmación separadas.
- **Alert:** error, advertencia, éxito e información; icono, texto y semántica `alert`/`status`.
- **PageHeader / Panel / Badge:** jerarquía de página, panel de contenido y etiqueta de estado.
- **Tabs:** primitivas de React Aria con navegación accesible por teclado.
- **StateView:** presentación consistente de carga, vacío, error o éxito.
- **Toast:** sigue en `core/notifications`, donde se controla duración y anuncio accesible.

## Reglas de uso

1. En nuevas pantallas, usar los componentes desde `@/core/ui`.
2. Colores solo con tokens (los valores son provisionales); sin hexadecimales sueltos, sin morado y sin iconografía asociada con IA (reglas duras de `docs/DESIGN_SYSTEM.md`).
3. Los controles requieren etiqueta accesible, foco visible y objetivos táctiles adecuados (44 px cuando aplique).
4. Los módulos conservan sus propios textos y pueden inyectar variantes a través de props.
5. No sustituir composiciones específicas por una tarjeta genérica; el kit apoya la jerarquía del producto, no la uniformiza.
6. Build/QA valida tipado, formato, accesibilidad y comportamiento antes de considerar cerrado WP8.
