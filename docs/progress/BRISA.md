# Progreso — Brisa

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-17.

## Estado
- **Código:** MVP completo en la rama `feat/brisa-mvp` (PR a `dev` abierto, sin integrar). Backend: regla de fechas, persistencia, API de pendientes, «Deshacer» seguro, ajustes e importación. Frontend: Semana, Mes, Vencidas, Fechas límite, editor, búsqueda, «Deshacer», Importar y Configuración.
- **Especificación:** ficha de migración `docs/modules/BRISA.md`; requisitos, investigación, inventario de la app Android (su §13 prevalece) y prototipo aprobado en `docs/requirements/brisa/`.

## Por verificar (nada de esto se ejecutó)
- **Backend sin compilar ni ejecutar.** El entorno donde se escribió no tiene SDK de .NET ni acceso a NuGet. Se revisó a mano (nulabilidad, conversiones `Result`, reglas de arquitectura), pero falta `dotnet build` y las pruebas.
- **Migración `AddBrisaTasks`, su `Designer` y el snapshot están escritos a mano.** Build debe regenerarlos con `dotnet ef` y comparar; una diferencia en el snapshot (p. ej. anotaciones de generación de valores de las claves) se corrige regenerando.
- **Pruebas escritas y no ejecutadas** (`AGENTS.md` §4): `TaskRulesTests`, `ImportParserTests`, `tests/Pastel.IntegrationTests/QA/BrisaApiTests.cs` (necesita PostgreSQL aislado) y `web/tests/components/brisa-dates.test.ts`.
- **Lo que sí se comprobó:** `tsc --noEmit` sin errores; y el port TypeScript de la regla de fechas coincide con `prototype/logic.js` en 32 467 comparaciones aleatorias (5 zonas, con horario de verano), 0 diferencias.
- **Sin probar en navegador:** diseño, foco, teclado, carrusel de la semana, tarjetas oscuras al 28 % y lector de pantalla. Tampoco `lint`, `check-design` ni `build` del frontend.

## Pendiente
- Revisión visual con el acento claro definitivo (se usan los tokens provisionales de `data-module="brisa"`; `#315B4A` en los documentos aprobados frente a `#48775b`/`#416b52` en el prototipo y los tokens).
- Tema «Del sistema» (BR-12): la plataforma solo tiene Claro/Oscuro; exige cambiar `web/src/core/preferences` (zona compartida).
- Contador de Vencidas en el menú lateral: el manifiesto no admite contadores.
- Sincronización con Android (`updatedSince`, borrado lógico y `Version` ya están preparados; falta el mecanismo de ids de cliente).

## Decisiones del propietario pendientes
- ¿La reversión segura del «Deshacer» pasa a prueba esencial? ¿Bastan 8 s? (Está implementada y sin prueba esencial propia.)
- La prueba esencial 3 de la ficha (idempotencia con `Guid` de cliente) contradice su §3, que deja ese mecanismo para la sincronización: ¿se ajusta la prueba? No se implementó.
- El texto normativo de eliminar dice «No podrás recuperarla…», pero ahora existe «Deshacer» durante 8 s: ¿se mantiene la confirmación tal cual, se matiza o se deja solo «Deshacer»?
- La eliminación es `POST /tasks/{id}/delete` (no `DELETE`) porque devuelve el id para deshacer y el cliente central no lee el cuerpo de un `DELETE`: ¿se acepta o se amplía el cliente?
