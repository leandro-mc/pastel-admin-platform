# Balance — ficha técnica (backend)

Estado: **en construcción** (rama `feat/balance-mvp`). Hecho: dominio puro, esquema de datos y API. El estado vigente está en `docs/progress/BALANCE.md`.

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

## Endpoints (`/api/balance`)

Leer y entrar exigen `balance.access`; **toda escritura** exige `balance.groups.manage`. Además, dentro del grupo se aplica el rol de la persona
(`GroupPolicy`, siempre en el servidor): quien **no es miembro recibe 404** (el grupo «no existe» para esa persona); un miembro sin derecho recibe 403
con el motivo y a quién pedirlo; un grupo cerrado solo se lee (409 al escribir). Los montos van y vienen como **cadena decimal con punto**.

| Método y ruta | Permiso | Quién puede en el grupo |
|---|---|---|
| `GET /currencies` | access | — (catálogo de 40 monedas) |
| `GET /groups` · `POST /groups` | access · manage | mis grupos paginados · cualquiera (queda como administrador) |
| `GET /groups/{id}` | access | miembro |
| `PATCH /groups/{id}` (nombre, descripción, zona; `version`) | manage | administrador |
| `PUT /groups/{id}/currency` | manage | administrador (reexpresa sin convertir; 409 si hay montos con más decimales) |
| `POST /groups/{id}/close` · `/reopen` · `DELETE /groups/{id}` | manage | administrador (borrar solo sin gastos) |
| `GET /groups/{id}/history` | access | administrador |
| `GET /groups/{id}/participants` | access | miembro |
| `PUT /groups/{id}/participants/{pid}/role` · `DELETE …/{pid}` | manage | administrador (no quita a quien pagó ni a la última administración) |
| `POST /groups/{id}/leave` | manage | miembro (sin gastos pagados) |
| `GET /groups/{id}/invitation` · `POST …/invitation/regenerate` | access · manage | administrador |
| `POST /join` (`token`, `code`) | access + límite de tasa | cualquier cuenta con el enlace y el código |
| `GET /groups/{id}/expenses` (`page`, `pageSize` ≤ 100, `q`, `payerId`, `from`, `to`, `order`) | access | miembro |
| `POST /groups/{id}/expenses` · `PUT …/{eid}` · `DELETE …/{eid}?version=` | manage | administrador, o el miembro solo para gastos que él pagó |
| `GET /groups/{id}/expenses/sheet` · `PUT …/sheet` | access · manage | administrador ve todo; un miembro, lo suyo. Guardado atómico: si una fila no es válida o permitida no se guarda nada; los borrados van como lista explícita de ids |
| `GET /groups/{id}/balances` · `GET …/settlement` | access | miembro (la liquidación solo se muestra, no registra pagos) |

Ingreso por enlace: el token (192 bits) viaja en el **cuerpo**; el enlace lo lleva en el fragmento `#`, que no llega a servidores ni a logs. Un enlace o código
inválido responde siempre igual; 5 fallos por cuenta y enlace (o 20 por cuenta) bloquean 15 minutos (429 con `Retry-After`). Quien ya es miembro simplemente entra.
Regenerar invalida de inmediato los anteriores. Escrituras: transacción serializable con reintento; `version` (`xmin`) en grupos y gastos → 409 si cambió.

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
| `balance.group.not_found` | 404 | El grupo no existe **o** la persona no es miembro |
| `balance.participant.not_found` · `balance.expense.not_found` | 404 | No existe en ese grupo |
| `balance.forbidden` | 403 | Acción reservada a administración o a quien pagó; el mensaje dice el motivo y a quién pedirlo |
| `balance.group.closed` | 409 | Escribir en un grupo cerrado (también para administración) |
| `balance.group.already_closed` · `balance.group.not_closed` | 409 | Cerrar uno ya cerrado · reabrir uno abierto |
| `balance.group.last_admin` | 409 | Quitar o degradar a la única administración |
| `balance.group.has_expenses` | 409 | Borrar un grupo con gastos |
| `balance.participant.has_expenses` | 409 | Quitar o salir siendo quien pagó gastos |
| `balance.group.currency_decimals_incompatible` | 409 | Cambiar a una moneda con menos decimales que algún monto |
| `balance.join.invalid` | 400 | Enlace o código inválidos (misma respuesta en todos los casos) |
| `balance.join.rate_limited` | 429 | Demasiados intentos de ingreso (`Retry-After`) |
| `balance.validation_failed` | 400 | Datos inválidos, con detalle por campo (`rows.N.campo` en la hoja) |
| `balance.currency.unknown` · `balance.group.time_zone_invalid` | 400 | Moneda fuera del catálogo · zona IANA inválida |
| `balance.amount.required` · `invalid` · `not_positive` · `too_large` · `too_many_decimals` | 400 | Monto inválido (D4); nunca se redondea en silencio |
| `platform.concurrency_conflict` | 409 | La versión cambió desde que la persona la vio |

## Pendiente (decisiones y dependencias)

- **Página para quien no tiene cuenta (BL-13)**: `RequireAuth` descarta el fragmento `#` al redirigir a `/ingresar` y las rutas de módulo no son públicas; hace falta un cambio en zona compartida (ruta pública y conservar el fragmento). Mientras tanto la persona con sesión entra por `/balance/unirse#token` o pegando el enlace.
- Nombre visible: se guarda como instantánea al ingresar (no se refresca si la cuenta cambia de nombre).
- Al reabrir se borra la fecha de cierre (el historial conserva ambos hechos); unirse a un grupo cerrado se rechaza; el historial lo ve solo la administración. Pendientes de confirmar con el propietario.
- Pruebas de integración y de borde (Etapa 2 de la ficha) a cargo de QA.
