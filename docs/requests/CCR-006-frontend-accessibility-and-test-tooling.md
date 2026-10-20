# CCR-006 — Herramientas frontend de accesibilidad y pruebas

- **Estado:** autorizada por el propietario el 2026-10-20; instalación pendiente porque este entorno no puede resolver el registry de npm y no tiene ejecución de npm con acceso a red.
- **Fecha:** 2026-10-20.
- **Ámbito:** WP9/WP10 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.
- **Motivo:** las guardas de accesibilidad, pruebas de componentes React y scaffold E2E requeridos por la Fase 0 necesitan dependencias nuevas. `AGENTS.md` reserva los cambios de dependencias y el lockfile; no deben modificarse por separado ni escribirse a mano.

## Dependencias propuestas

- `eslint-plugin-jsx-a11y`: reglas de accesibilidad para ESLint.
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` y `vitest-axe`: pruebas de componentes React con un entorno DOM y aserciones de accesibilidad.
- `@playwright/test` y `@axe-core/playwright`: scaffold de humo E2E y verificación automatizada de accesibilidad en navegador, cuya configuración/casos los prepara Build/QA.

## Implementación propuesta después de la autorización

1. Consultar versiones actuales compatibles con Node 24, Vite 8, React 19 y el resto de dependencias antes de instalar; no fijar versiones por memoria o copiar rangos desactualizados.
2. Agregar las dependencias necesarias a `web/package.json` con npm y regenerar `web/package-lock.json` en el mismo cambio.
3. Ajustar ESLint para utilizar `jsx-a11y` y añadir los scripts Vitest mínimos; no crear los casos de prueba de producto que corresponden a Build.
4. Confirmar reproducibilidad con `npm ci`, Prettier, ESLint y build antes de declarar que el lockfile quedó sincronizado.
5. Dejar a Build la creación/ejecución de las pruebas de arquitectura, Vitest/Testing Library/axe y del scaffold Playwright; registrar los resultados reales en su informe.

## Límites

Esta solicitud no autoriza a ejecutar CI, a introducir triggers automáticos ni a fusionar con `dev`/`main`. Aun con la CCR aprobada, los controles no se dan por completados hasta validar el lockfile y ejecutar las comprobaciones en un entorno Node/Docker real.


## Estado tras la autorización

Se intentó preparar el lote y se comprobó con `npm view eslint-plugin-jsx-a11y version --fetch-retries=0 --fetch-timeout=5000`; npm devolvió `EAI_AGAIN getaddrinfo registry.npmjs.org`. Este entorno de autoría no puede resolver el registry, por lo que no es posible consultar las versiones instalables ni generar/verificar `package-lock.json` con `npm install`. Para no dejar `npm ci` roto, no se modificaron `web/package.json`, `web/package-lock.json` ni los imports/configuración de ESLint que requieren esos paquetes. La solicitud sigue autorizada y abierta: debe completarse desde un entorno con acceso al registry y confirmar compatibilidad con React 19/Vite 8/Node 24, además de ejecutar `npm ci`, Prettier, ESLint y build. No se disparó CI.
