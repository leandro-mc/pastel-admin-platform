# CCR-007 — Fichas técnicas del módulo Identity

- **Estado:** propuesta pendiente de autorización explícita.
- **Fecha:** 2026-10-20.
- **Ámbito:** WP10 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.
- **Motivo:** durante el inventario se confirmó que faltan `src/Modules/Identity/MODULE.md`, `web/src/modules/identity/MODULE.md` y `docs/modules/IDENTITY.md`. El módulo Identity y la documentación de contratos están reservados como áreas protegidas en `AGENTS.md`; no se crearán esas fichas por iniciativa propia.

## Alcance propuesto

1. Crear la ficha backend `src/Modules/Identity/MODULE.md` con estado real, esquema `identity`, contratos de permisos, inicio de sesión local/Google, cookies/CSRF, tareas de arranque, migraciones, endpoints/errores principales y pendientes de Build.
2. Crear la ficha frontend `web/src/modules/identity/MODULE.md` con estado real, manifiesto/rutas, dependencias permitidas (`@/core/*`), contratos API y pantallas presentes.
3. Crear `docs/modules/IDENTITY.md` con el alcance de identidad y Workspace, roles Owner/Superuser y Administrator, modelo de autorización y límites conocidos.
4. Mantener cada `MODULE.md` por debajo de 120 líneas y no declarar Google/seguridad/UX validados por el hecho de documentarlos.
5. Contrastar cada ficha con el código actual; Build/QA verificará luego los contratos, rutas y permisos implementados.

## Límites

Esta CCR autoriza la documentación del módulo únicamente si el propietario la aprueba. No autoriza cambios de código en Identity, cambios del modelo de permisos/sesiones, migraciones, ejecución de CI o integración en `dev`/`main`.
