# Progreso — Cosecha

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-15.

## Estado
- **Código:** esqueleto (permisos, roles, manifiesto y fichas); sin lógica de negocio ni rama de implementación abierta. El acceso lo concede el Owner/Superuser.
- **Especificación:** ficha `docs/modules/COSECHA.md`; requisitos, investigación, modelo de pago, política de reclamos, prototipo (9 roles) y guías por rol en `docs/requirements/cosecha/`.

## Pendiente
- Implementar el MVP según la ficha; al hacerlo, renombrar `Campaign → Season` en el código y en la ficha.
- Cotizaciones, fichas y recibos: usar `Pastel.Documents` (CCR-2) cuando esté en `dev`.

## Validación externa pendiente (no se asumió ningún valor)
Parámetros del modelo de pago y de la política de reclamos (productores, compradores, técnico poscosecha, abogado; asamblea), personería jurídica y registros (SFE), socio exportador, cuarto frío, dominio de correo, admisibilidad, factura electrónica y datos personales (`docs/requirements/DECISIONES-Y-HALLAZGOS.md` §7).

## Decisiones del propietario pendientes
- Capital para el tope de caja o financiamiento puente; SINPE como medio único y productores sin cuenta.
