# Progreso — Brisa

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-15.

## Estado
- **Código:** esqueleto (permisos, roles, manifiesto y fichas); sin lógica de negocio ni rama de implementación abierta.
- **Especificación:** ficha de migración `docs/modules/BRISA.md`; requisitos, investigación, inventario de la app Android (su §13 prevalece) y prototipo aprobado en `docs/requirements/brisa/`.

## Pendiente
- Implementar la migración según la ficha.
- Revisión visual: tarjetas oscuras al 28 %, aviso con «Deshacer» y acento claro (`#315B4A` en los documentos aprobados frente a `#48775b`/`#416b52` en el prototipo y los tokens).

## Decisiones del propietario pendientes
- ¿La reversión segura del «Deshacer» pasa a prueba esencial? ¿Bastan 8 s?
- La prueba esencial 3 de la ficha (idempotencia con `Guid` de cliente) contradice su §3, que deja ese mecanismo para la sincronización: ¿se ajusta la prueba?
