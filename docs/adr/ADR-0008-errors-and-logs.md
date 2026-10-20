# ADR-0008 — Errores, trazabilidad y logs

- Estado: estándar implementado como base; cobertura integral y redacción de datos pendiente de Build/QA.
- Contexto: los módulos deben reportar fallos homogéneamente sin filtrar información sensible.

## Decisión
Los fallos de dominio esperables se modelan como `Result` y se traducen centralmente a HTTP `application/problem+json`, con código estable y `traceId`. Los errores inesperados devuelven un mensaje genérico. Serilog escribe JSON compacto a la salida estándar con plantillas y enriquecimiento de contexto. La auditoría de acciones privilegiadas es distinta de los logs técnicos.

## Consecuencias
No se devuelven excepciones, SQL ni detalles internos al usuario. Nunca se registran contraseñas, tokens, cookies, valores OAuth, cuerpos de petición ni datos personales. Los módulos mantienen sus códigos de error en `Errors.cs` y sus endpoints usan las reglas de permiso o anonimato explícito.

## Referencias
`docs/ERROR_HANDLING_AND_LOGGING.md`, `src/BuildingBlocks/Pastel.Platform/Errors` y `src/BuildingBlocks/Pastel.Platform/Observability`.
