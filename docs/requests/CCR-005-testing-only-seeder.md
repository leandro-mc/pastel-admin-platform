# CCR-005 — Sembrador de identidades de prueba

- **Estado:** propuesta pendiente de autorización explícita.
- **Fecha:** 2026-10-20.
- **Ámbito:** WP10 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.
- **Motivo:** WP10 requiere cuentas de prueba locales para QA. Identity figura como zona protegida en `AGENTS.md`, por lo que esta ficha registra el alcance solicitado antes de modificar esa área.

## Cambio propuesto

1. Agregar un sembrador de usuarios exclusivamente de desarrollo/pruebas dentro de Identity, integrado al sistema de tareas de arranque existente, sin reemplazar ni debilitar `BootstrapAdminTask`.
2. Crear identidades de prueba para los roles que ya existan en el catálogo local (Owner/Superuser, Administrator y Member) con credenciales fijas exclusivamente locales, documentadas en la sección «Datos para pruebas» de `docs/phase0/PROGRESS.md`.
3. El sembrador debe ejecutarse únicamente en `Development` o `Testing`. Debe abortar explícitamente si se habilita en `Production`; por defecto estará deshabilitado en producción y no registrará contraseñas ni tokens.
4. Usar las políticas existentes de hashing, rol, auditoría y seguridad; no insertar hashes manuales ni convertir al Member en administrador. Las credenciales de prueba no deben funcionar contra un entorno compartido ni producción.
5. Build escribirá pruebas que demuestren: seeding determinista e idempotente; credenciales no expuestas en logs; los roles asignados son exactos; el sembrador no puede ejecutarse en Production; y la cuenta bootstrap sigue restaurándose como define el contrato actual.

## Límites

Esta CCR no autoriza alterar el modelo general de sesiones, permisos, bootstrap ni las migraciones. No se implementó el sembrador y no se deben documentar cuentas Member como existentes hasta que el código y las pruebas estén publicados. Las pruebas las escribe y ejecuta Build, no el agente Dev.
