# Balance — ficha técnica (frontend)

Estado: **en construcción** (rama `feat/balance-mvp`): flujos completos de grupos, gastos, saldos, liquidación, personas, gestión de gastos y ajustes. Estado vigente: `docs/progress/BALANCE.md`.

- Código `balance` · ruta `/balance` · icono `Scale` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`; no se inventó paleta).
- Acceso en el manifiesto: `permission`; permiso `balance.access`. Escribir exige además `balance.groups.manage`; la interfaz solo oculta lo que el servidor rechazaría, que decide siempre.
- Backend: `src/Modules/Balance/MODULE.md`. Producto: `docs/modules/BALANCE.md`.

## Estructura

`manifest.ts` · `strings.ts` (todos los textos) · `api/` (`schemas.ts` zod en el borde, `keys.ts`, `queries.ts`, `mutations.ts`) · `lib/` (`money.ts`, `errors.ts`, `timeZones.ts`) · `components/` · `pages/` (una por ruta; exportan `Component`).
Reglas: solo se importa de `@/core/*`; utilidades de Tailwind en el JSX; sin CSS propio; sin almacenamiento en el navegador.

## Rutas

| Ruta | Página |
|---|---|
| `/balance` | `GroupsPage`: mis grupos, búsqueda, filtro por estado y mi situación |
| `/balance/grupos/nuevo` | `NewGroupPage` |
| `/balance/unirse` | `JoinPage`: el token llega en el fragmento `#` (no viaja al abrir la página); se puede pegar el enlace |
| `/balance/grupos/:groupId` | `SummaryPage` (resumen y liquidación abreviada) |
| `…/gastos` · `…/saldos` · `…/liquidar` | `ExpensesPage` (filtros, paginación, alta/edición/baja) · `BalancesPage` · `SettlePage` |
| `…/personas` · `…/gestion` · `…/ajustes` | `PeoplePage` (roles, quitar, salir, enlace y código) · `SheetPage` (borrador y guardado atómico) · `SettingsPage` (datos, moneda, cierre, borrado, historial; solo administración) |
| `/balance/ayuda` | `HelpPage` |

## Decisiones de interfaz

- **Dinero:** siempre cadenas decimales con punto; nunca `number` (sin coma flotante). `lib/money.ts` valida lo que se escribe (acepta coma o punto, rechaza miles, ceros y exceso de decimales) y da formato es-CR. El servidor reparte y liquida.
- **El signo no depende del color:** saldos con texto («Le deben», «Debe», «Está al día») y signo explícito.
- **Hoja de gestión:** el borrador vive en memoria; nada se guarda hasta «Guardar cambios». Si una fila falla no se guarda ninguna; los errores del servidor (`rows.N.campo`) se muestran en su fila. Los borrados viajan como lista explícita de ids.
- Accesibilidad: tablas con `caption` y `scope`, etiquetas por fila en la hoja, objetivos táctiles de 44 px del kit, estados de carga/vacío/error con `StateView`.

## Pruebas

`web/tests/components/balance-money.test.ts` (validación y formato de montos). Las pruebas de flujo (E2E) y la revisión visual y de accesibilidad son de la Etapa 2.

## Pendiente

- **Página para quien no tiene cuenta (BL-13):** necesita una ruta pública y conservar el fragmento `#` al redirigir al inicio de sesión (zona compartida; ver `src/Modules/Balance/MODULE.md`).
- Revisión visual con la identidad definitiva, cifras tabulares y la hoja en móvil.
