# ADR-0002 — Stack de aplicación y enrutamiento

- Estado: decisión aprobada; validación del SHA actual pendiente.
- Contexto: la SPA anterior concentraba pantallas en estado local y hacía difícil enlazar rutas.

## Decisión
El backend usa .NET 10 / ASP.NET Core Minimal APIs. El frontend usa React 19, TypeScript 5.9, Vite 8, React Router 7 en modo datos, TanStack Query, Zod y Tailwind CSS 4. No se incorpora SSR en esta fase. El router se compone con rutas de plataforma y manifiestos de los módulos, con rutas reales, carga diferida y límites de error.

## Consecuencias
La URL identifica la ubicación y los filtros que necesitan enlace compartible. Las respuestas API se validan al entrar al cliente; el estado remoto no se duplica manualmente en varias pantallas. Un error de ruta o módulo no debe derribar el shell completo.

## Referencias
`docs/ARCHITECTURE.md`, `docs/ERROR_HANDLING_AND_LOGGING.md` y `web/src/app/router.tsx`. Build/QA debe probar navegación, rutas protegidas y errores en navegador.
