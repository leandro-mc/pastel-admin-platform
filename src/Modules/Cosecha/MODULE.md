# Cosecha — ficha técnica (backend)

Estado: **en construcción** (rama `feat/cosecha-mvp`). Modelo de datos listo; los endpoints se documentan abajo a medida que se agregan.

- Código: `cosecha` · esquema de base de datos `cosecha` · API `/api/cosecha` · proyecto `Pastel.Modules.Cosecha`.
- Producto: `docs/modules/COSECHA.md` (fuente de verdad funcional). Frontend: `web/src/modules/cosecha/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `cosecha.access` | Entrar al módulo |
| `cosecha.catalog.read` / `.manage` | Ver / gestionar catálogo |
| `cosecha.producers.read` / `.manage` | Ver / gestionar productores |
| `cosecha.buyers.read` / `.manage` | Ver / gestionar compradores |
| `cosecha.orders.read` / `.manage` | Ver / gestionar pedidos |
| `cosecha.orders.read.own` | Comprador: ver solo sus pedidos y el estado de sus envíos |
| `cosecha.shipments.read` / `.manage` | Ver / gestionar envíos, recepciones y entregas |
| `cosecha.settlements.read` / `.manage` | Ver / gestionar liquidaciones y pagos |
| `cosecha.reports.read` | Ver reportes |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Cosecha — Gestor`: todos los permisos excepto `cosecha.orders.read.own`
- `Cosecha — Comprador`: `cosecha.access`, `cosecha.orders.read.own`

El rol `Administrator` no recibe estos permisos al sincronizar el catálogo; solo Owner/Superuser asigna los roles de Cosecha (`PermissionGrantPolicy.OwnerGrantsOnly`).

## Reglas de servidor (de la ficha)

- El comprador solo ve datos de los compradores vinculados a su `UserId` (filtro en el servidor).
- Productores sin cuenta en el MVP; su ficha admite un `UserId` opcional para un futuro rol productor (roles futuros: no implementar).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/cosecha/ping` | `cosecha.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos

Esquema `cosecha`: 17 tablas en `snake_case` y su historial en `cosecha.__EFMigrationsHistory`. Modelo en `Domain/Entities`, configuración en `Persistence/Configurations`, migración `AddCosechaMvpSchema`. Sin navegaciones EF: las relaciones son claves foráneas explícitas; no hay claves foráneas hacia Identity (`producers.user_id`, `buyers.user_id`, `created_by` son identificadores).

| Grupo | Tablas |
|---|---|
| Catálogo | `products`, `seasons` |
| Personas | `producers`, `producer_phones`, `producer_season_capacities`, `buyers`, `buyer_contacts` |
| Pedidos | `orders`, `order_lines` |
| Envíos | `shipments`, `shipment_orders`, `producer_deliveries` |
| Pagos | `producer_payments`, `producer_payment_allocations` |
| Trazabilidad y configuración | `change_log_entries`, `payment_policy_versions`, `claims_policy_versions` |

**Integridad que garantiza la base** (no solo la aplicación): `CHECK` con nombre (`ck_*`) para cantidades no negativas, estados válidos, fechas coherentes, teléfonos de 8 dígitos, ubicación completa o vacía y recepción coherente (`rechazado ≤ recibido`); índices únicos (`ux_*`) y parciales (un solo teléfono o contacto principal; una entrega por productor y envío); claves foráneas `RESTRICT` salvo hijos puros (`CASCADE`); `xmin` como token de concurrencia (`Version`). `accepted_kg` y `amount_crc` de `producer_deliveries` son **columnas generadas**: una sola fuente de verdad para el dinero. Disparadores: un pago no puede aplicar a una entrega más que su monto (ni se puede bajar el monto de una entrega por debajo de lo pagado), y `change_log_entries` y las versiones de política solo admiten agregar filas.

**Verificación pendiente:** la migración, su designer y el snapshot se escribieron sin `dotnet ef` (entorno sin acceso a NuGet) a partir de una especificación única. Ejecute `dotnet ef migrations has-pending-model-changes` (mismos argumentos que en `Persistence/CosechaDbContextFactory.cs`); si reporta diferencias, regenere la migración con `dotnet ef migrations add`. El DDL equivalente se probó en PostgreSQL 16.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `cosecha.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
