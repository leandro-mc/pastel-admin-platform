# ADR-0005 — Sistema visual de Pastel

- Estado: decisión aprobada por el propietario; la interfaz de esta tanda está aprobada visualmente.
- Contexto: el shell y las apps necesitan coherencia sin perder la identidad por módulo.

## Decisión
La plataforma usa tokens semánticos para neutros, superficies, bordes, texto y foco. Cada app define sus acentos claro/oscuro mediante `data-module` y los tokens `--accent*`. El color suave se reserva para fondos; texto y botones con texto usan el acento fuerte para cumplir contraste. Se prohíben tonos morados y símbolos decorativos asociados a IA.

## Consecuencias
No se agregan hexadecimales arbitrarios en JSX/CSS. Las variaciones visuales compartidas se centralizan en el sistema de diseño y en componentes comunes. La aceptación estética requiere inspección visual de escritorio/móvil y temas claro/oscuro; compilar no equivale a aprobar UX.

## Referencia
`docs/DESIGN_SYSTEM.md`, `docs/product/PASTEL-PRODUCT-AND-UX.md` y CCR-003.
