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


## Scaffold preparado — dependencia y validación pendientes (2026-10-20)

Se añadieron la configuración de Vitest, pruebas iniciales del kit `core/ui` con React Testing Library/axe, configuración de Playwright y pruebas de humo/accesibilidad para `/ingresar`. Los scripts npm `test`, `test:watch` y `test:e2e` quedaron definidos y Prettier incluirá los nuevos archivos.

**La CCR-006 sigue abierta.** Aún no se escribieron las dependencias en `package.json` ni se regeneró `package-lock.json`, para no dejar un lockfile inconsistente sin poder ejecutar npm desde este entorno. Versiones consultadas el 2026-10-20: Vitest 5.0.5 requiere Node `^22.12.0 || ^24.0.0 || >=26` y Vite `^6.4 || ^7 || ^8`; concuerda con Node 24 y Vite 8 del proyecto. `vitest-axe` 0.1.0 tiene varios años, por lo que se usará con jsdom (no happy-dom) y se debe reevaluar tras la prueba real. Fuentes: [requisitos de Vitest 5](https://vitest.dev/guide/migration) y [uso de vitest-axe](https://github.com/chaance/vitest-axe).

**Paso requerido en un entorno con acceso al registry npm:** desde `web/`, ejecutar `npm.cmd install --save-dev eslint-plugin-jsx-a11y vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vitest-axe @playwright/test @axe-core/playwright`. Mantener juntos `package.json` y `package-lock.json`, revisar el diff y ejecutar `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run build`. A continuación, instalar Chromium de Playwright y ejecutar `npm.cmd run test:e2e` con Compose local levantado. No declarar aprobada la cobertura hasta inspeccionar los resultados; se espera que axe identifique cualquier problema real de accesibilidad en la pantalla de ingreso.


## Integración con guardas de build (2026-10-20)

- Se conecta `eslint-plugin-jsx-a11y` mediante su configuración plana recomendada en `web/eslint.config.js`, conservando reglas existentes de límites modulares y `no-console`.
- `scripts/test-frontend.ps1` incorpora la ejecución de Vitest + axe en su resumen para que las pruebas unitarias no queden como un comando opcional invisible.
- Esta integración depende de instalar las dependencias propuestas y regenerar `web/package-lock.json`; de momento el import del plugin y los comandos de test no pueden ejecutarse con el lockfile anterior. La CCR continúa pendiente de npm install y validación local.
