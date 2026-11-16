# Balance — ficha técnica (backend)

Estado: **en construcción** (rama `feat/balance-mvp`). Hecho: dominio puro. El estado vigente está en `docs/progress/BALANCE.md`.

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

## Datos

Esquema `balance` sin tablas. `BalanceDbContext` usa `HasDefaultSchema("balance")` y su historial de migraciones vive en `balance.__EFMigrationsHistory`.
**La migración inicial la genera Build** con `dotnet ef` (ver `Persistence/BalanceDbContextFactory.cs`); mientras no exista, el host no arranca con este módulo incluido.

## Códigos de error

| Código | Estado | Cuándo |
|---|---|---|
| `balance.resource.not_found` | 404 | El recurso pedido no existe |

## Pendiente

Todo lo funcional de la ficha de producto, empezando por el inventario de migración si aplica.
