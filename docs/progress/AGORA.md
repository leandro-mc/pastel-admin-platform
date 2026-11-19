# Progreso — Ágora

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-19.

## Estado
- **Rama:** `feat/agora-mvp`, con PR a `dev` sin integrar. **F1 implementada** en backend y frontend.
- **Hecho (backend):** modelo y migración; sello por versión sustantiva con revisores requeridos configurables (`Agora:Verification:RequiredReviewers`, por defecto 1); separación de funciones (nadie verifica lo que escribió o editó); sanitizado de Markdown; video por identificador de YouTube; lectura pública (inicio finito, listado, pieza, noticias, vista previa para compartir); guardar, seguir, reaccionar y señalar errores; panel editorial (piezas, «Hoy en 5 minutos», temas y series, noticias, bandeja de errores); revisión y verificación auditadas.
- **Hecho (frontend):** páginas públicas, panel editorial, Markdown propio sin HTML, fachada de video, modo calma, trato de usted.
- **Validado:** nada se ejecutó. Solo `tsc --noEmit` (sin errores) y revisión de sintaxis de C# con un parser.

## Por verificar (no se ejecutó)
- Compilación de .NET (`TreatWarningsAsErrors`): el código se escribió sin `dotnet` ni NuGet.
- Migración `AddAgoraContentModel` (Designer y snapshot incluidos): escrita a mano; correr `dotnet ef migrations has-pending-model-changes` y aplicarla a una base real.
- Pruebas: unitarias del módulo, HTTP (`tests/Pastel.IntegrationTests/Agora`), Vitest (`web/tests/components/agora-content.test.tsx`) y de arquitectura.
- ESLint, formato (Prettier avisó de archivos sin formatear), `check-design` y fronteras de módulos.
- Recorrido en navegador: claro/oscuro, 320 px, texto «Muy grande» y teclado.
- Camino feliz de un revisor independiente por HTTP (requiere un usuario con `agora.content.review`).

## Fuera de esta entrega
- Resumen semanal (F2).
- Tarjetas PNG: detrás de `IShareCardRenderer`; esperan `Pastel.Documents` (CCR-2).
- Deseables de la F1 no construidos: glosario en línea, mini-comprobación, preguntas al especialista, métricas de autor, página de revisores, imágenes dentro de las piezas.

## Necesita zona compartida (propuestas; no se tocó)
- CSP de `nginx`: `frame-src https://www.youtube-nocookie.com` e `img-src` para miniaturas. Hoy el video solo abre por el enlace a YouTube.
- Metadatos en `/agora/p/:slug` (AG-SEO-01) servidos por `nginx` a rastreadores; hoy el enlace para compartir es `/api/agora/share/{slug}`.
- Caché HTTP pública: `SecurityHeadersMiddleware` fuerza `no-store` en toda la API.
- Identity: el rol `Member` no recibe `agora.saved.manage`, así que guardar, reaccionar y señalar errores funciona solo con un rol o concesión que lo incluya.
- `react-markdown` y `rehype-sanitize` figuran como aprobadas pero no están instaladas (el Markdown es propio).
- Las clases `agora-*` de `web/src/core/design/components/agora.css` quedaron sin uso.

## Decisiones del propietario pendientes
- Política de correcciones (texto de «Estándares editoriales», condición de lanzamiento). ¿Mínimo de revisores por tema? ¿Se paga la revisión? ¿Edad mínima? ¿Apelación?
- Valor de `RequiredReviewers` y si debe editarse desde la administración en vez de una variable de entorno.
- Cómo recibe `Member` el permiso de interacción (ver arriba).
- Envío de correos desde la plataforma (resumen semanal, F2): definición técnica pendiente.
- Revisión visual final de la paleta (dirección aprobada en D-112).
