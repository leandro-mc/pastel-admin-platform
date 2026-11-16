# Progreso — Balance

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-15.

## Estado
- **Código:** esqueleto (permisos, roles, manifiesto y fichas); sin lógica de negocio ni rama de implementación abierta.
- **Especificación:** ficha de migración `docs/modules/BALANCE.md`; requisitos, investigación, roles, inventario de SaldApp (decisiones D1–D9) y prototipo rediseñado con el motor de dinero probado (casos dorados G01–G41) en `docs/requirements/balance/`.

## Pendiente
- Implementar la migración según la ficha.
- Revisión visual: tipografía real, cifras tabulares, hoja de miembros y fechas.
- Preselección de la casilla de Balance al registrarse (inventario §12.11, P23): depende de Identity.

## Decisiones del propietario pendientes
- ¿Columnas adicionales (categoría, notas) o importar un CSV en la hoja?
- ¿Se muestra «Su parte será ₡…» al registrar un gasto?
- ¿Una marca de «recibido»? (Reabriría D6: Balance no registra pagos.)
- Al reabrir, ¿se borra la fecha de cierre o se conserva? ¿El inicio por defecto es «hoy» en la zona del grupo?
