# ADR-0001 — Monolito modular

- Estado: decisión aprobada; validación de fronteras pendiente de Build.
- Contexto: arquitectura base de Pastel.

## Decisión
Pastel se despliega como un único host .NET que descubre módulos compilados. Cada aplicación mantiene su dominio, permisos, endpoints verticales y esquema de datos. Se mantienen `Pastel.SharedKernel` y `Pastel.Platform` como las únicas bases compartidas de backend, además del host de composición.

## Consecuencias
La operación local y el despliegue son sencillos, pero las fronteras se deben hacer cumplir mediante referencias de proyecto, tipos internos y pruebas de arquitectura. No se permiten claves foráneas ni joins entre esquemas de módulos. Los módulos se retiran de un artefacto de despliegue mediante configuración de compilación; no se convierten en microservicios por separado.

## Referencia
`docs/ARCHITECTURE.md`. El código y las pruebas de arquitectura deben verificar esta decisión antes de dar por cerrada la Fase 0.
