# Cosecha — ficha de producto y MVP

Color `data-module="cosecha"` (ocre) · icono `Sprout` · esquema `cosecha` · ruta `/cosecha` · API `/api/cosecha`.

## 1. Propósito y usuario real

Una asociación de productores (caso inicial: **rambután**; después café pilado, granos y más) vende a varios compradores. Hoy la coordinación es manual (llamadas, WhatsApp, cuadernos). Cosecha permite **planear cada envío**: cuánto necesitan los compradores, cuánto se pide a cada productor, qué se recibió realmente, qué se entregó y qué se debe pagar.

**Quien opera la aplicación es una sola persona** (el gestor planificador, probablemente el propietario, con quizá un apoyo). Los productores son adultos con poca práctica tecnológica y **no usan la aplicación**: la persona gestora registra todo por ellos. Los compradores tampoco la necesitan para operar; su acceso es opcional y de solo lectura. Por eso la interfaz se optimiza para **una persona que registra rápido, desde el teléfono o el computador, con pocos errores**.

## 2. Roles y permisos del MVP

Se reducen los siete roles del catálogo a lo indispensable (el administrador de Pastel ya existe).

| Rol (rol sugerido) | Quién | Qué puede |
|---|---|---|
| **Gestor planificador** (`Cosecha — Gestor`) | Propietario y apoyo | Todo en Cosecha: catálogo, productores, compradores, pedidos, envíos, recepciones, entregas, pagos, reportes |
| **Comprador** (`Cosecha — Comprador`) | Comprador con cuenta (opcional) | Ver únicamente **sus** pedidos y el estado de sus envíos. Solo lectura |
| **Administrador de Pastel** | Ya existe | Todos los permisos; gestión de usuarios y roles |

Productores: **sin cuenta** en el MVP. Su ficha admite un `UserId` opcional para un futuro rol productor. Roles futuros (no implementar): coordinador de asociación, planificador logístico, transportista, productor con acceso propio.

Permisos (todos con prefijo `cosecha.`):
`access`, `catalog.read`, `catalog.manage`, `producers.read`, `producers.manage`, `buyers.read`, `buyers.manage`, `orders.read`, `orders.manage`, `orders.read.own` (comprador), `shipments.read`, `shipments.manage`, `settlements.read`, `settlements.manage`, `reports.read`.
- `Cosecha — Gestor`: todos excepto `orders.read.own`. `Cosecha — Comprador`: `access` + `orders.read.own`.
- El comprador solo ve datos de los compradores vinculados a su `UserId` (filtro en el servidor).

## 3. Modelo de datos (esquema `cosecha`)

Identificadores `Guid` v7; fechas UTC; dinero `numeric(18,2)` en colones (`CRC`); peso `numeric(12,2)` en kg. Todas las entidades editables: `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, token de concurrencia.

| Entidad | Campos principales |
|---|---|
| `Campaign` (Campaña) | nombre ("Rambután 2026"), producto, inicio, fin, estado (Activa/Cerrada), `defaultProducerPricePerKg` |
| `Product` | nombre, unidad (kg), activo |
| `Producer` | nombre, teléfono(s), finca o punto de recolección (texto), ubicación opcional (lat/lng + enlace de mapa), `estimatedCapacityKg` por campaña, activo, notas, `UserId?` |
| `Buyer` | nombre/razón social, contactos (nombre, teléfono, cargo), dirección (texto), cantón/zona, ubicación opcional (lat/lng), condiciones de entrega (horario, acceso), activo, notas, `UserId?` |
| `Order` (Pedido) | comprador, campaña, fecha requerida, estado, notas; líneas: producto, kg, `pricePerKg` |
| `Shipment` (Envío) | campaña, fecha, estado, notas, `bufferPercent` (margen sobre lo pedido, por defecto 0) |
| `ShipmentOrder` | envío, pedido, `plannedKg`, `deliveredKg?`, nota de entrega |
| `ProducerDelivery` (Entrega del productor) | envío, productor, `requestedKg`, `availableKg?` (tope de ese envío), `receivedKg?`, `rejectedKg` (mal estado, por defecto 0), `acceptedKg` (= recibido − rechazado), `pricePerKg`, estado, calidad (Buena / Con observaciones / Mala), notas, `expectedPaymentDate?` |
| `ProducerPayment` | productor, fecha, monto, método (Efectivo / SINPE / Transferencia), referencia, nota |
| `ProducerPaymentAllocation` | pago, entrega, monto |
| `ChangeLogEntry` | entidad, id, campo, valor anterior, valor nuevo, motivo/nota, usuario, fecha (para ediciones de cantidades y precios) |

Estados:
- **Pedido:** Borrador → Confirmado → Parcial → Entregado · Cancelado (el estado Parcial/Entregado se **deriva** de lo entregado).
- **Envío:** Planificado → En recolección → Recolectado → Entregado → Cerrado (se permite retroceder con nota; todo queda en el registro de cambios).
- **Entrega del productor:** Solicitada → Confirmada (acordó por teléfono) → Recibida · Sin entrega.

## 4. Flujos principales (en orden de uso real)

1. **Preparar la campaña (una vez):** crear campaña y producto; fijar precio base al productor por kg.
2. **Registrar productores:** nombre, teléfono, finca, capacidad estimada. Edición rápida de la capacidad durante la temporada.
3. **Registrar compradores:** nombre, contacto(s), ubicación (dirección y, si se tiene, enlace de mapa o coordenadas), condiciones de entrega.
4. **Registrar pedidos:** comprador, kg, **fecha requerida**, **precio por kg**. Lista de pedidos con filtros (fecha, comprador, estado).
5. **Planificar un envío:**
   1. Elegir fecha y seleccionar los pedidos que cubre (sugerir los pedidos pendientes con fecha cercana). Cada pedido aporta `plannedKg` (por defecto lo pendiente; editable para entregar parcialmente).
   2. El sistema muestra la **demanda total** (+ margen si se definió).
   3. **Reparto sugerido entre productores** (sección 5). Se puede excluir a un productor ese día, fijarle un tope (`availableKg`) o editar la cantidad a mano. El resumen en vivo muestra "Pedido: 480 kg · Solicitado a productores: 480 kg · Diferencia: 0 kg".
   4. Cada productor tiene botones **Llamar** y **WhatsApp** con mensaje prellenado (ver sección 7).
   5. Marcar cada solicitud como **Confirmada** cuando el productor acepta.
6. **Recepción:** el día de la recolección, por productor se registra lo **recibido** (kg), lo **rechazado por mal estado** (kg, opcional), la calidad y notas ("llegó golpeado", "entregó 20 kg de más, se aceptó"). Si recibe menos o más de lo solicitado se puede editar con una nota; se muestra la diferencia respecto a lo solicitado.
7. **Entrega a compradores:** por pedido del envío, registrar `deliveredKg` y notas; el estado del pedido se actualiza.
8. **Cierre del envío:** resumen de verificación (pedido vs. recibido vs. entregado; diferencias señaladas) y botón "Cerrar envío".
9. **Liquidación a productores:** lista de entregas pendientes de pago por productor con monto (`acceptedKg × pricePerKg`), fecha prevista de pago y saldo; **Registrar pago** (selecciona entregas, monto sugerido = suma, método, referencia). Estado de cada entrega: Pendiente / Parcial / Pagada.
10. **Reportes y exportación:** resumen por envío, por productor (estado de cuenta), por comprador y por campaña; exportar a CSV (compatible con Excel, codificación UTF-8 con BOM, separador acorde a Excel en español) y vista imprimible.

## 5. Reglas de cálculo (con pruebas unitarias exhaustivas)

**Reparto proporcional a la capacidad** (función pura y determinista en `Domain/`):
- Entrada: cantidad objetivo `T` (demanda + margen), productores incluidos con peso `w_i = estimatedCapacityKg` y tope opcional `u_i = availableKg`.
- Reparto proporcional a `w_i`; si una cuota supera su tope, se fija en el tope y el sobrante se redistribuye entre los restantes proporcionalmente (repetir hasta estabilizar).
- Redondeo a un paso configurable (por defecto 1 kg) con **método del mayor resto** para que la suma coincida exactamente con `T` cuando es factible.
- Si la suma de topes es menor que `T`, devolver el faltante (`shortfallKg`) y mostrarlo de forma destacada.
- Propiedades a probar: suma exacta cuando es factible; ningún valor negativo; respeta topes; productores con peso 0 o excluidos reciben 0; mismo resultado para la misma entrada (determinismo); estable ante el orden de entrada.

**Montos:** `acceptedKg = receivedKg − rejectedKg` (≥ 0); `amount = acceptedKg × pricePerKg` con redondeo a 2 decimales (hacia el más cercano, mitad hacia arriba); saldo del productor = suma de montos − suma de asignaciones de pago. **Margen informativo** por envío = Σ(`deliveredKg × precio del pedido`) − Σ(montos a productores).

## 6. Pantallas (primero móvil)

| Ruta | Pantalla | Notas de UX |
|---|---|---|
| `/cosecha` | **Hoy** | Próximos envíos, solicitudes sin confirmar, recepciones pendientes, pagos por vencer; accesos grandes a "Nuevo pedido" y "Nuevo envío" |
| `/cosecha/envios` · `/envios/:id` | Envíos | Lista por estado y fecha; detalle con pestañas *Pedidos · Productores · Recepción · Entrega · Resumen*; asistente de planificación paso a paso |
| `/cosecha/pedidos` · `/pedidos/nuevo` · `/pedidos/:id` | Pedidos | Formulario corto; lista con filtros guardados en la URL |
| `/cosecha/compradores` · `/:id` | Compradores | Ficha con contactos, ubicación (botón "Abrir en el mapa"), historial |
| `/cosecha/productores` · `/:id` | Productores | Ficha con capacidad, historial de entregas, saldo |
| `/cosecha/liquidacion` | Liquidación | Por productor; registrar pagos; fechas previstas |
| `/cosecha/reportes` | Reportes | Selector de período y exportación |
| `/cosecha/configuracion` | Campañas y productos | Solo gestor |
| `/cosecha/mis-pedidos` | Comprador | Solo lectura, texto grande, estado claro por pedido |

Requisitos de UX específicos:
- Botones y campos grandes, números con teclado numérico (`inputmode="decimal"`), valores por defecto inteligentes (fecha del próximo jueves, precio base, último comprador).
- Cada contacto muestra **Llamar** (`tel:`) y **WhatsApp**.
- Toda edición de cantidades o precios pide una **nota opcional** y queda en el registro de cambios; la pantalla muestra "Editado por … el …".
- Confirmación antes de cerrar un envío, cancelar un pedido o registrar un pago; opción de deshacer cuando sea posible.
- Listas con búsqueda, estados vacíos útiles y esqueletos de carga; tablas que en móvil se convierten en tarjetas.
- Estados siempre con icono y texto (no solo color); color del módulo usado con sobriedad.
- Funciona bien en una conexión inestable: no perder lo escrito, mensajes claros, reintento.

## 7. Mensajes de WhatsApp (sin API)

Enlaces `https://wa.me/506XXXXXXXX?text=<mensaje codificado>` con el número normalizado (+506, 8 dígitos). Plantillas editables en el código (`strings.ts`):
- Solicitud: "Hola don/doña {nombre}, para el envío del {día fecha} le pedimos {kg} kg de {producto}. ¿Nos confirma por favor?"
- Recordatorio de recolección y agradecimiento tras la recepción.
No se envía nada automáticamente: el gestor revisa y pulsa enviar en su WhatsApp. La integración con la API de WhatsApp queda para una etapa posterior.

## 8. Reglas, validaciones y bordes

- Teléfono: 8 dígitos de Costa Rica (acepta con o sin espacios y con +506); se normaliza al guardar.
- No se puede asignar a un envío un pedido cancelado; no se cierra un envío con recepciones o entregas sin registrar (permite cerrar con motivo).
- Editar un registro cerrado exige una nota y deja registro de cambio.
- Borrado lógico (archivar) de productores y compradores con historial; nunca borrado físico.
- Todas las lecturas y escrituras verifican el permiso y, para compradores, la propiedad del dato.
- Auditoría: se registran en `IAuditTrail` los cierres, pagos, cancelaciones y cambios de precio o cantidad.
- Zona horaria `America/Costa_Rica`; moneda colones; kg con hasta 2 decimales.

## 9. Fuera del MVP (no implementar)

Mapas incrustados y rutas optimizadas, vistas para transportistas, comprobante de entrega firmado, cobro y facturación a compradores, portal de productores, API de WhatsApp o correo, lotes y trazabilidad, varios productos por pedido en la interfaz (el modelo ya admite líneas; la interfaz usa una), importación masiva, aplicación móvil.

## 10. Criterios de aceptación

- Un gestor completa sin ayuda: crear campaña → 5 productores → 3 compradores → 4 pedidos → planificar un envío con reparto automático → registrar recepción con diferencias y notas → registrar entregas → cerrar → pagar a un productor → exportar CSV.
- Pruebas unitarias del reparto y montos (sección 5) y pruebas de integración de todos los endpoints con permisos concedidos y denegados, incluido el filtro por propiedad del comprador.
- Revisión de accesibilidad y recorrido a 320 px, claro/oscuro y texto "Muy grande".
- `MODULE.md` backend y frontend actualizados; el módulo compila y pasa pruebas aislado (`PASTEL_MODULES=cosecha`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

QA escribe `docs/testing/plans/COSECHA-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente, y lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

**Reparto proporcional (sección 5)**
1. `T=100`, capacidades A=50, B=30, C=20 → 50 / 30 / 20.
2. `T=101`, mismas capacidades → 51 / 30 / 20 (el resto va al mayor residuo; suma 101).
3. `T=100`, A con tope 20 → A=20 y los 80 restantes en proporción 30:20 → B=48, C=32.
4. `T=100`, topes A=10, B=10, C=10 → asignados 30, faltante 70 mostrado de forma destacada.
5. Productor excluido o con capacidad 0 → recibe 0; el resultado no depende del orden de entrada.

**Montos y pagos**
6. Recibido 100 kg, rechazado 10 kg, precio ₡650 → aceptado 90 kg, monto ₡58 500,00.
7. Redondeo: 3,33 kg × ₡100,55 = 334,8315 → ₡334,83.
8. Entregas por ₡58 500 y ₡30 000; pago de ₡70 000 → la primera queda Pagada, la segunda Parcial (₡11 500 abonados); saldo ₡18 500.
9. Margen informativo: entregado a comprador 90 kg × ₡900 = ₡81 000; costo ₡58 500 → margen ₡22 500.

**Permisos y datos**
10. Anónimo → 401; usuario sin `cosecha.access` → 403; Gestor → acceso completo.
11. Comprador A pide el pedido de comprador B → 404 (sin revelar existencia); su lista solo muestra lo suyo.
12. Comprador no puede crear, editar ni ver precios de productores, pagos ni márgenes.

**Reglas y errores**
13. Pedido cancelado no se puede asignar a un envío; cerrar un envío con recepciones sin registrar exige motivo.
14. Dos ediciones simultáneas de la misma entrega de productor → la segunda recibe 409 de concurrencia con mensaje claro.
15. Toda edición de cantidad o precio queda en el registro de cambios con antes/después, nota y usuario; los pagos y cierres quedan en la auditoría.
16. Teléfono: `8888 1234`, `+506 8888-1234` y `88881234` se normalizan igual; WhatsApp genera `https://wa.me/50688881234?text=…` con el mensaje codificado.
17. CSV: abre en Excel con tildes correctas (UTF-8 con BOM), decimales y separadores coherentes; los totales coinciden con la pantalla.
18. Flujo completo del criterio de aceptación (sección 10) en un teléfono de 360 px, claro y oscuro, texto "Muy grande".
