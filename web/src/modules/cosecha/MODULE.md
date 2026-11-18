# Cosecha — ficha técnica (frontend)

Estado: **MVP de la Etapa 1 construido** en la rama `feat/cosecha-mvp`; sin ejecutar en un navegador (ver «Pendiente»).

- Código `cosecha` · ruta `/cosecha` · icono `Sprout` (Lucide) · identidad visual por definir (tokens provisionales en `web/src/core/design/module-themes.css`).
- Acceso en el manifiesto: `permission`; permiso `cosecha.access`. Cada entrada del menú pide además el permiso de su pantalla (el servidor autoriza igual).
- Backend: `src/Modules/Cosecha/MODULE.md`. Producto: `docs/modules/COSECHA.md`.

## Estructura

`manifest.ts` (menú agrupado y rutas) · `strings.ts` (agrega `text/*.ts`: todos los textos, trato de usted) · `paths.ts` (permisos y rutas) · `format.ts` (kilos, colones, fechas y teléfonos es-CR; hoy y «próximo jueves» en `America/Costa_Rica`) · `errors.ts` · `styles.ts` · `api/` (`schemas.ts` zod, `keys.ts`, `queries.ts`, `mutations.ts`, `requests.ts`) · `components/` (estado de consulta, paginador, insignias, diálogo de motivo, contactos) · `pages/` (una por ruta, exportan `Component`; subcarpetas por área).
Reglas: no importar de otro módulo, solo de `@/core/*`; utilidades de Tailwind con tokens del sistema de diseño; sin CSS propio.

## Rutas

| Ruta | Página | Permiso del menú |
|---|---|---|
| `/cosecha` | `HomePage` → `TodayPage` (gestor), «Mis pedidos» (comprador) o aviso | `shipments.read` |
| `/envios`, `/envios/nuevo`, `/envios/:id` | `ShipmentsPage`, `NewShipmentPage`, `ShipmentPage` (+ `shipments/*`: pedidos, reparto, recepción, entrega, estado) | `shipments.read` |
| `/pedidos`, `/pedidos/nuevo`, `/pedidos/:id` | `OrdersPage` (filtros en la URL), `NewOrderPage`, `OrderPage` | `orders.read` |
| `/mis-pedidos`, `/mis-pedidos/:id` | `MyOrdersPage`, `MyOrderPage` | `orders.read.own` |
| `/compradores`, `/nuevo`, `/:id` | `BuyersPage`, `BuyerPage` | `buyers.read` |
| `/productores`, `/nuevo`, `/:id` | `ProducersPage`, `ProducerPage` (+ capacidad por temporada) | `producers.read` |
| `/liquidacion`, `/liquidacion/:producerId` | `SettlementPage`, `StatementPage` (pago en dos pasos, anular con motivo) | `settlements.read` |
| `/reportes` | `ReportsPage` (tabla, CSV por enlace GET, impresión) | `reports.read` |
| `/configuracion` | `SettingsPage` (temporadas, productos, parámetros de pago y reclamos) | `catalog.read` |

## Decisiones

- **Datos:** TanStack Query. Toda respuesta se valida con zod en el borde. Toda escritura invalida `["cosecha"]`: las cifras (totales, saldos, estados, montos) se leen del servidor y el cliente no las replica; solo previsualiza lo aceptado y la diferencia al recibir.
- **Formularios:** estado local y errores del servidor por campo (`fieldMessage(error, "phones[0]")`), sin react-hook-form. Cada ficha se reinicia con la versión nueva del registro (`key` con `version`), así se edita siempre lo último del servidor.
- **Comprador:** pantallas y endpoint propios (`/my/orders`); ninguna pantalla del gestor se reutiliza con campos ocultos.
- **Parámetros de pago y reclamos:** se muestran con el aviso «pendientes de validación»; vacío es «sin definir», nunca un valor precargado.
- **PDF:** no hay pantalla ni botón; depende de CCR-2 (ver backend).
- **Campos dentro de tablas:** `TextField` y `CheckboxField` no admiten `className` ni etiqueta oculta; se usan `<input>` nativos con `aria-label` y las clases del kit.

## Pendiente

- Las tablas son tablas con desplazamiento horizontal en móvil; la ficha pide convertirlas en tarjetas.
- No se ejecutó la interfaz en un navegador ni ESLint, Prettier, Vitest, `check-design` ni pruebas de accesibilidad (AGENTS §4: solo a pedido).
- El editor de reparto, la recepción y el pago no se recorrieron de punta a punta con datos reales.
- Valores por defecto inteligentes que la ficha menciona y no se hicieron: precio base y último comprador.
