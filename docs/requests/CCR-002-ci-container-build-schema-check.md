# CCR-002 — Corregir la consulta de esquema del smoke test Docker Compose

- **Estado:** aprobada por el propietario el 2026-10-19 en esta conversación.
- **Solicitante:** agente Dev, Tipo 2.
- **Rama:** `refactor/modular-foundation`.
- **Área protegida:** `.github/workflows/ci.yml`.
- **Evidencia:** GitHub Actions run [39355182030, job container-build](https://github.com/leandro-mc/pastel-admin-platform/actions/runs/39355182030/job/118408209093).

## Motivo

La construcción de las imágenes API/web y el arranque de DB, API y frontend finalizaron correctamente, pero el smoke test de la pila completa agotó sus 40 intentos y terminó con código 1. El chequeo buscaba la tabla `public."Modules"`.

El código de `IdentityDbContext` establece el esquema predeterminado `identity` y mapea `ModuleDefinition` a la tabla `modules`. La ubicación correcta es `identity.modules`. Los logs de ese run también registran la sincronización del catálogo de Identity durante el arranque. Por eso, la condición sobre `public."Modules"` no podía confirmar la tabla esperada, aunque la aplicación arrancara.

## Cambio aprobado y aplicado

- Cambiar en `.github/workflows/ci.yml` la expresión `to_regclass('public."Modules"')` por `to_regclass('identity.modules')`.
- Ajustar el mensaje de éxito para nombrar `identity.modules` con precisión.
- No cambiar migraciones, esquema, datos ni comportamiento de la aplicación.
- Actualizar `docs/phase0/PROGRESS.md` con la causa y el estado de validación.

## Riesgo y validación

El cambio solo afecta la aserción SQL de la prueba de arranque. No usa `EnsureCreated` ni modifica la base real del desarrollador. La validación definitiva requiere que el job `container-build` ejecute de nuevo y pase el chequeo completo. Hasta que el nuevo run termine, la corrección se considera publicada pero pendiente de verificación en CI.

## Decisión

- [x] Aprobada
- [ ] Rechazada
- [ ] Requiere ajustes

**Decisión del propietario:** “Sí, si estas seguro que es eso haslo, acepto la solicitud para que lo corrijas también”.
