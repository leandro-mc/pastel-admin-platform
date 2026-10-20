# CCR-005 — Sembrador de identidades de prueba

- **Estado:** autorizada por el propietario el 2026-10-20; implementación publicada en `refactor/modular-foundation`, pendiente de pruebas Build/QA.
- **Fecha:** 2026-10-20.
- **Ámbito:** WP10 de `docs/phase0/FASE-0-REFACTOR-BASE.md`.
- **Motivo:** WP10 requiere cuentas de prueba locales para QA. Identity figura como zona protegida en `AGENTS.md`, por lo que esta ficha registra el alcance solicitado antes de modificar esa área.

## Implementación realizada

1. Agregar un sembrador de usuarios exclusivamente de desarrollo/pruebas dentro de Identity, integrado al sistema de tareas de arranque existente, sin reemplazar ni debilitar `BootstrapAdminTask`.
2. Crear identidades de prueba para los roles que ya existan en el catálogo local (Owner/Superuser, Administrator y Member) con credenciales fijas exclusivamente locales, documentadas en la sección «Datos para pruebas» de `docs/phase0/PROGRESS.md`.
3. El sembrador debe ejecutarse únicamente en `Development` o `Testing`. Debe abortar explícitamente si se habilita en `Production`; por defecto estará deshabilitado en producción y no registrará contraseñas ni tokens.
4. Usar las políticas existentes de hashing, rol, auditoría y seguridad; no insertar hashes manuales ni convertir al Member en administrador. Las credenciales de prueba no deben funcionar contra un entorno compartido ni producción.
5. Build escribirá pruebas que demuestren: seeding determinista e idempotente; credenciales no expuestas en logs; los roles asignados son exactos; el sembrador no puede ejecutarse en Production; y la cuenta bootstrap sigue restaurándose como define el contrato actual.

## Límites

El sembrador quedó registrado como tarea Identity de orden 30, después de la sincronización de catálogo y Bootstrap. Es idempotente, usa `IPasswordHasher<AppUser>`, limita los roles exactos, revoca sesiones al restaurar una fixture, audita sin incluir credenciales y falla si se habilita fuera de Development/Testing. `ProductionSecurityValidationTask` también bloquea `TestingSeed:Enabled=true` en Production. **No se compiló ni se probó**; Build debe demostrar idempotencia, roles exactos, ausencia de secretos en logs y denegación en Production. Esta CCR no autoriza cambios adicionales al modelo de sesiones, permisos ni migraciones.
