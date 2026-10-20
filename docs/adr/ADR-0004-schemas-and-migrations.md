# ADR-0004 — Esquemas y migraciones por módulo

- Estado: decisión aprobada; la validación integral de migraciones continúa en Build.
- Contexto: los datos deben tener un propietario claro y un camino de extracción futuro.

## Decisión
Cada módulo backend posee su `DbContext`, su esquema PostgreSQL y su historial de migraciones. Identity usa `identity`; las apps usan `agora`, `brisa`, `balance`, `cosecha` y `huella`. El host descubre los módulos, y cada implementación del módulo expone sus operaciones de migración. Build genera las migraciones con EF Core; no se escriben manualmente.

## Consecuencias
Las relaciones entre módulos se expresan por identificadores, sin claves foráneas ni joins entre esquemas. El arranque puede aplicar migraciones según `Database:ApplyMigrationsAtStartup`; si la aplicación no las aplica, comprueba que no existan pendientes. Un artefacto que omite un módulo no debe cargar su ensamblado ni sus endpoints.

## Referencias
`docs/ARCHITECTURE.md`, `src/BuildingBlocks/Pastel.Platform/Persistence` y `src/Host/Pastel.Host`.
