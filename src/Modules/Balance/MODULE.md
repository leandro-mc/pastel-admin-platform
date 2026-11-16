# Balance — ficha técnica (backend)

Estado: **en construcción** (rama `feat/balance-mvp`). Hecho: dominio puro y esquema de datos. El estado vigente está en `docs/progress/BALANCE.md`.

- Código: `balance` · esquema de base de datos `balance` · API `/api/balance` · proyecto `Pastel.Modules.Balance`.
- Producto: `docs/modules/BALANCE.md` (fuente de verdad funcional). Frontend: `web/src/modules/balance/MODULE.md`.

## Permisos

| Código | Qué permite |
|---|---|
| `balance.access` | Entrar al módulo (hub y router) |
| `balance.groups.manage` | Gestionar los grupos de los que la persona forma parte |

Roles sugeridos (se crean una sola vez si no existen; nunca se sobrescriben):

- `Balance — Usuario`: `balance.access`, `balance.groups.manage`

El rol `Administrator` no recibe los permisos de esta app al sincronizar el catálogo (solo `Owner/Superuser`); ver `docs/SECURITY.md`.

## Reglas de servidor (de la ficha)

- Una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor).
- Los roles dentro de un grupo (administrador del grupo, miembro) son datos del dominio de Balance, no roles de plataforma.
- El nombre anterior «SaldApp» no se usa en código ni interfaz. Inventario y decisiones de migración: `docs/requirements/balance/INVENTARIO-BALANCE.md`.

## Dominio (`Domain/`, puro y sin acceso a datos)

Dinero en **unidades mínimas enteras** (`Int128`; nunca coma flotante). Los montos viajan como cadena decimal con punto (`"12.50"`, `"1500"`).

| Pieza | Regla (inventario §12) |
|---|---|
| `Money` | `Parse` valida D4 (mayor que cero, decimales de la moneda, máximo 16 dígitos enteros = `numeric(18,2)`); `Format`, `ToDecimal`, `TryFromDecimal` |
| `CurrencyCatalog` | 40 monedas ISO 4217 (código, número, nombre, símbolo, decimales 0/2); verificadas contra ISO. Para cambiarlo: editar la lista y agregar una migración con el `INSERT`/`UPDATE` |
| `ShareCalculator` | D1: partes iguales; las `total mod n` unidades sobrantes van una a una a las primeras personas por **orden de alta**. Falla con `BalanceInvariantException` si las partes o los saldos no cuadran |
| `SettlementCalculator` | D2: liquidación codiciosa determinista (monto descendente, empate por orden de alta). No registra pagos |
| `GroupPolicy` | D3/D7: quién puede qué (`Check`) y la hoja de gestión (`CheckSheet`); devuelve el `Error` con motivo y a quién pedirlo |
| `Invitation` | Token de 192 bits y código de 4 dígitos; comparación en tiempo constante |
| `JoinAttemptLimiter` (`Security/`) | 5 fallos por cuenta y enlace bloquean 15 min; 20 por cuenta frenan el barrido de enlaces. En memoria, un solo nodo |
| `GroupTimeZone` | D9: zona IANA por grupo; la fecha de un gasto es de calendario y no cambia al cambiar la zona |

Pruebas (`Pastel.Modules.Balance.Tests`): casos dorados G01–G41 y propiedades (`GoldenCaseTests`), política de roles (`GroupPolicyTests`) y limitador (`JoinAttemptLimiterTests`).

## Endpoints

| Método y ruta | Permiso | Nota |
|---|---|---|
| `GET /api/balance/ping` | `balance.access` | Comprobación del esqueleto; se retira con la primera funcionalidad real |

## Datos (esquema `balance`)

Identificadores `Guid` v7; instantes en `timestamptz`; fechas de gasto en `date`; dinero en `numeric(18,2)` (moneda = la del grupo); columnas en snake_case; versión de fila `xmin`.
**Sin claves foráneas hacia otros esquemas**: las cuentas de Identity se guardan solo como `account_id`/`created_by`.

| Tabla | Para qué | Integridad que impone la base |
|---|---|---|
| `currencies` | Catálogo de 40 monedas (sembrado por migración) | PK `code`; `numeric_code` único; `decimals IN (0,2)` |
| `groups` | Grupo, moneda, zona, cierre, contador de altas | FK a `currencies` (`RESTRICT`); nombre no vacío; `xmin` |
| `join_credentials` | Enlace y código de ingreso (1:1, **aparte** de `groups` para no exponerlos por accidente) | PK = `group_id` (`CASCADE`); `token` único; código = 4 dígitos |
| `participants` | Personas del grupo y su rol (`admin`/`member`) | `UNIQUE(group_id, account_id)`; `UNIQUE(group_id, join_order)`; clave alterna `(group_id, id)`; rol restringido |
| `expenses` | Gastos | `amount > 0`; descripción 4–500; FK a `groups` y **FK compuesta `(group_id, payer_participant_id)`** (el pagador siempre es del mismo grupo), ambas `RESTRICT`; `xmin` |
| `group_events` | Historial visible («quién hizo qué») | FK a `groups` (`CASCADE`); índice `(group_id, occurred_at)` |

Decisiones de diseño:
- **El orden de alta** (`join_order`) sale de `groups.participant_seq`, un contador que nunca retrocede: quien sale y vuelve queda al final. Quien sale o es quitado se **elimina** (no tiene gastos); su rastro queda en `group_events`.
- **Un grupo con gastos no se borra** y **quien pagó no se elimina** porque las FK son `RESTRICT`; la aplicación lo valida antes para dar un mensaje claro, pero la base lo garantiza.
- **Siempre al menos una persona administradora**: disparador de restricción diferido (`trg_participants_keep_admin`) que valida al confirmar la transacción; permite relevar a la única administración dentro de una misma transacción y no aplica al borrar el grupo.
- PostgreSQL **redondea en silencio** un monto con más de 2 decimales: por eso la API valida los decimales de la moneda (D4) y nunca confía en la columna.
- Edición concurrente: `xmin` de `groups` y de `expenses`; las escrituras del grupo van en transacción serializable con reintento (`TransactionRunner`).
- Actualizar el catálogo de monedas: editar `CurrencyCatalog` y agregar una migración con el `INSERT`/`UPDATE` de `balance.currencies`.
- La migración `BalanceMvpSchema` se escribió a mano (el entorno no pudo restaurar paquetes para ejecutar `dotnet ef`). Si `dotnet ef migrations has-pending-model-changes` reporta diferencias, regenerar con el comando de `Persistence/BalanceDbContextFactory.cs`.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `balance.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
