# Balance — inventario funcional y técnico de SaldApp

> **Rol:** investigación. **Estado:** borrador para revisión del propietario.
> **Fuentes leídas:** repositorios `leandro-mc/saldapp-backend` (rama `main`, último commit `ff865f0`, 2026-06-18) y `leandro-mc/saldapp-frontend` (rama `main`, último commit `fae3f75`, 2026-06-18); en Pastel, `AGENTS.md` y `docs/modules/BALANCE.md` (rama `dev`, `60cfc31`; la ficha se actualizó después en esta rama, §12.10).
> **Actualización 2026-10-20:** se incorporaron las decisiones del propietario (§12): centavos por orden de alta (D1), liquidación determinista (D2), autenticación obligatoria, cuenta siempre necesaria, varios administradores (dueños del grupo) y **ingreso por enlace y código de 4 dígitos** (D3), campo de monto (D4), **Balance inicia desde cero (D5)**, reparto retroactivo sin participación parcial y solo transferencias sugeridas (D6), reabrir grupos, borrar grupos sin gastos, fecha del gasto editable y «Liquidación (grupo cerrado)» (D7), moneda ISO por grupo **corregible sin conversión** con catálogo validado contra ISO 4217 (D8) y zona horaria por grupo (D9).
> **No se modificó** ningún repositorio de SaldApp ni se escribió código de migración.
> **Nomenclatura:** **SaldApp** = sistema actual; **Balance** = módulo futuro de Pastel.

> **Cómo leer este documento.** Las secciones 1 a 11 describen **SaldApp tal como es hoy**. Lo que **Balance hará distinto** (correcciones y mejoras aprobadas) está en la **§12**, y sus resultados esperados en la **§9.3**.

**Convenciones de este documento**

- Rutas abreviadas: `BE/` = `saldapp-backend/src/main/java/com/lmora/saldapp/`, `FE/` = `saldapp-frontend/src/`.
- Las citas tienen la forma `archivo:Clase.método`. Lo no comprobado en el código se marca **[SUPOSICIÓN]**; lo que no se pudo verificar en ejecución, **[NO VERIFICADO]**.
- Los montos se escriben con punto decimal, tal como los devuelve la API de SaldApp. Los nombres de personas en los ejemplos son ficticios.
- «Integrante» es el término de SaldApp (`Integrant`) para quien participa en un grupo; en Balance se propone «participante».

---

## 1. Resumen

**Qué hace.** SaldApp registra los gastos de un grupo (viaje, casa, paseo), indica cuánto ha pagado cada integrante, calcula cuánto debe recibir o pagar cada uno y propone una lista de transferencias para «liquidar». **Todo el reparto es en partes iguales entre todos los integrantes del grupo**; no existen porcentajes, montos fijos ni participación parcial por gasto (`BE/application/usecase/financial/GroupFinancialUseCaseImp.java:calculateGroupBalances`). El README y la pantalla de inicio hablan de «división inteligente», pero el único criterio de reparto implementado es la división igualitaria.

**Usuarios.** No existen cuentas ni sesiones. Quien conozca el **ID numérico** de un grupo puede leerlo y modificarlo (mientras esté abierto). No hay listado de grupos: la pantalla de inicio pide el ID (`FE/pages/HomePage.jsx:handleAccess`).

**Tecnologías.**

| Capa | Elección (evidencia) |
|---|---|
| Backend | Java 21, Spring Boot **4.0.6**, Spring Data JPA (Hibernate), Bean Validation, MapStruct 1.6.3, Lombok, springdoc-openapi 3.0.2 (Swagger UI) — `saldapp-backend/pom.xml` |
| Arquitectura | Hexagonal/«Clean»: `domain` → `application` (puertos y casos de uso) → `adapter` (web y persistencia) |
| Base de datos | PostgreSQL 16 (`docker-compose.yml`, puerto 5435); esquema generado por Hibernate con `ddl-auto: update` (`application.yaml`, `application-dev.yaml`); **sin migraciones** |
| Frontend | React 19.2, Vite 8, React Router 7, Axios 1.16, Tailwind 4.3, JavaScript (sin TypeScript; tipos en JSDoc) — `saldapp-frontend/package.json` |
| API | REST/JSON sin autenticación; CORS por lista de orígenes (`app.cors.allowed-origins`, `infraestructure/config/CorsConfig.java`) |
| Pruebas | Solo `SettlementCalculatorTest` (13 pruebas del calculador) y `SaldappApplicationTests.contextLoads`; no hay pruebas del reparto ni de los casos de uso |

**Despliegue actual.** Solo local: la base de datos corre en Docker; el backend con `mvn spring-boot:run` (puerto 8080) y el frontend con `npm run dev` (Vite, puerto 5173). No hay `Dockerfile` de la aplicación, ni CI, ni evidencia de un despliegue público (README de ambos repos). **[SUPOSICIÓN]** No hay instancia en producción; confirmar con el propietario (§11).

**Tamaño del código.** ≈ 3 100 líneas en el backend y ≈ 5 900 en el frontend (incluye `package-lock.json`); 93 y 55 commits, entre 2026-05-28 y 2026-06-18.

---

## 2. Funcionalidades

| Funcionalidad | Descripción | Dónde está | Conservar |
|---|---|---|---|
| Crear grupo | Nombre (1–200), descripción opcional (≤ 500), moneda (símbolo ≤ 5 caracteres), fecha de inicio. | `GroupController.createGroup` → `GroupUseCaseImpl.create`; `FE/components/group/GroupForm.jsx` | **Esencial** |
| Abrir grupo por ID | Se escribe el ID numérico y se navega a `/groups/:id`. | `FE/pages/HomePage.jsx:handleAccess`; `GET /groups/{id}` | **Importante** (en Balance se reemplaza por pertenencia/listado; ver §5) |
| Editar grupo | Cambia nombre, descripción **y moneda** (solo si está abierto). No cambia la fecha de inicio. | `GroupController.updateGroup` → `GroupUseCaseImpl.update` | **Importante** (cambiar la moneda con gastos ya cargados no convierte montos: ver §11) |
| Cerrar grupo | Fija `endDate = ahora`. Es irreversible (no hay «reabrir»). Un grupo cerrado rechaza altas/ediciones/bajas con 409, pero se puede leer y su liquidación se sigue calculando. | `GroupController.close` → `GroupUseCaseImpl.close`, `Group.close/isClosed/validateIsOpen` | **Esencial** |
| Resumen del grupo | Integrantes, total de gastos, «Correspondiente p/p» (total ÷ integrantes). | `GroupUseCaseImpl.enrichWithDetails`; `FE/components/group/GroupDetail.jsx` | **Importante** (la parte p/p se calcula **en JavaScript sin el redondeo HALF_UP del servidor**; ver §10) |
| Alta de integrante | Solo nombre (1–200, no único). Solo grupos abiertos. | `IntegrantController.createIntegrant` → `IntegrantUseCaseImpl.createAndAssign` | **Esencial** |
| Editar integrante | Solo el nombre. | `IntegrantUseCaseImpl.update` | **Importante** |
| Baja de integrante | Se rechaza (409) si el integrante pagó algún gasto. | `IntegrantUseCaseImpl.delete`, `IntegrantHasExpensesException` | **Importante** |
| Registrar gasto | Pagador (integrante del grupo), descripción (4–500), monto ≥ 0.01, fecha. Solo grupos abiertos. | `ExpenseController.createExpense` → `ExpenseUseCaseImpl.createAndAssign` | **Esencial** |
| Editar gasto | Cambia pagador, descripción y monto. **No se puede cambiar la fecha.** | `ExpenseController.updateExpense` (PATCH) → `ExpenseUseCaseImpl.update`; `ExpenseWebMapper` ignora `date` | **Esencial** |
| Eliminar gasto | Borrado físico. | `ExpenseUseCaseImpl.delete` | **Esencial** |
| Ver gastos de un integrante | Lista los gastos **pagados** por ese integrante (botón «Detalles»). No existe endpoint para listar todos los gastos del grupo. | `ExpenseController.findAllExpensesByIntegrantId` (`GET /groups/{gid}/expenses/{integrantId}`) | **Importante** (en Balance conviene un listado del grupo) |
| Saldos del grupo | Por integrante: total pagado y saldo (positivo = debe recibir; negativo = debe pagar). | `FinancialController.findAllBalancesByGroupId`; `GroupFinancialUseCaseImp.getGroupBalances/calculateGroupBalances` | **Esencial** |
| Saldo de un integrante | Mismo cálculo, para un integrante. **La interfaz no lo usa** (`useBalance.findIntegrantBalance` no se invoca). | `FinancialController.findBalanceByGroupIdAndIntegrantId`; `GroupFinancialUseCaseImp.getIntegrantBalance/calculateIntegrantBalance` | **Prescindible** |
| Liquidación (transferencias propuestas) | «Estimada» si el grupo está abierto (botón «Ver liquidación actual»), «Final» si está cerrado. **Se recalcula en cada lectura; no se guarda ni se registran pagos.** | `FinancialController.findAllSettlementsByGroupIdAndGroupId` → `GroupFinancialUseCaseImp.getGroupTransactions` → `domain/service/SettlementCalculator.calculate`; `FE/components/settlement/*` | **Esencial** |
| Selección de moneda | 16 símbolos fijos (₡, $, €, £, ¥, CHF, R$, S/, $U, ₲, Bs., RD$, Q, L, C$, B/.). Es texto libre en el servidor (≤ 5). | `FE/components/group/GroupForm.jsx`; `CreateGroupRequest.currency` | **Importante** (Balance exige moneda explícita; ver §11) |
| Documentación de API | Swagger UI (`/swagger-ui/index.html`). | `springdoc-openapi` en `pom.xml` | **Prescindible** |
| Formato de errores | `{timestamp,status,error,message,path,errors{}}`; 404/409/400/500. | `adapter/in/web/exception/GlobalExceptionHandler.java` | **Importante** (Balance usa `problem+json` con `code` y `traceId`) |

**Lo que SaldApp NO tiene** (para evitar que se asuma): inicio de sesión, listado de grupos, borrado de grupos, reabrir grupos, repartos desiguales, participación parcial por gasto, gastos recurrentes, categorías, adjuntos, registro de pagos/«marcar como pagado», multimoneda, importación, exportación, notificaciones, auditoría, control de concurrencia.

### 2.1 Endpoints (contrato actual)

| Método y ruta | Cuerpo / resultado | Errores |
|---|---|---|
| `POST /groups` | `{name, description?, currency, startDate}` → 201 `GroupResponse{id,name,description,currency,integrantCount,totalExpenses,startDate,endDate}` | 400 |
| `GET /groups/{id}` | `GroupResponse` | 404 |
| `PATCH /groups/{id}` | `{name, description?, currency}` | 400, 404, 409 (cerrado) |
| `POST /groups/{id}/close` | `GroupResponse` con `endDate` | 404, 409 (ya cerrado) |
| `POST /groups/{gid}/integrants` · `PATCH …/{id}` · `DELETE …/{id}` · `GET /groups/{gid}/integrants` | `{name}` → `{id,groupId,name}` | 400, 404, 409 |
| `POST /groups/{gid}/expenses` | `{payedBy, description, amount, date}` → 201 `{id,groupId,payedBy,description,amount,date}` | 400, 404, 409 |
| `PATCH /groups/{gid}/expenses/{id}` | `{payedBy, description, amount}` | 400, 404, 409 |
| `DELETE /groups/{gid}/expenses/{id}` | 204 | 404, 409 |
| `GET /groups/{gid}/expenses/{integrantId}` | gastos pagados por ese integrante | 404, 409 |
| `GET /groups/{gid}/balances` | `[{integrantId,integrantName,totalPaid,balance}]` | 404 |
| `GET /groups/{gid}/balances/{integrantId}` | `{…}` | 404, 409 |
| `GET /groups/{gid}/settlements` | `[{fromIntegrantId,fromIntegrantName,toIntegrantId,toIntegrantName,amount}]` | 404 |

Formato de fechas de entrada: `yyyy-MM-dd'T'HH:mm:ss` (la interfaz siempre envía `T00:00:00`). Mensajes de error en **inglés** (p. ej. `Group with id 7 is closed and cannot accept new transactions.`).

---

## 3. Modelo de datos

Fuente: entidades JPA en `BE/adapter/out/persistence/entity/`. El DDL real lo genera Hibernate (`ddl-auto: update`), por lo que **[NO VERIFICADO]** el esquema físico contra una base viva; lo siguiente se deduce de las anotaciones.

### 3.1 Tablas

**`groups`** (`GroupEntity`)

| Columna | Tipo | Restricciones / notas |
|---|---|---|
| `id` | bigint, identidad | PK |
| `group_name` | varchar(200) | NOT NULL |
| `description` | varchar(500) | nulo permitido (`@Length(max=500)`) |
| `currency` | varchar(5) | NOT NULL, defecto `'₡'`. Símbolo libre, **no** código ISO 4217 |
| `start_date` | timestamp (sin zona) | NOT NULL; la fija el usuario (siempre 00:00:00 desde la interfaz) |
| `end_date` | timestamp (sin zona) | nulo = abierto; **no nulo = cerrado** (el «estado» es esta columna; no hay campo `closed`) |
| `created_at` | timestamp (sin zona) | NOT NULL, no actualizable, `@CreationTimestamp` (hora del servidor) |

**`integrants`** (`IntegrantEntity`)

| Columna | Tipo | Restricciones / notas |
|---|---|---|
| `id` | bigint, identidad | PK |
| `integrant_name` | varchar(200) | NOT NULL; **sin unicidad** (se permiten nombres repetidos en un grupo) |
| `created_at` | timestamp | NOT NULL |
| `group_id` | bigint | FK → `groups.id`, NOT NULL |

**`expenses`** (`ExpenseEntity`)

| Columna | Tipo | Restricciones / notas |
|---|---|---|
| `id` | bigint, identidad | PK |
| `group_id` | bigint | FK → `groups.id`, NOT NULL |
| `integrant_id` | bigint | FK → `integrants.id`, NOT NULL (es el **pagador**; en el código se llama `payedBy`) |
| `description` | varchar(500) | `@Length(max=500)`; nulo permitido a nivel de BD (la API exige 4–500) |
| `amount` | **numeric(12,2)** | NOT NULL. **Dinero: 2 decimales, máximo 9 999 999 999.99.** El servidor usa `BigDecimal`; el frontend recibe número JSON y lo convierte a `Number` de JavaScript |
| `expense_date` | timestamp | NOT NULL |
| `created_at` | timestamp | NOT NULL, no actualizable |

### 3.2 Relaciones y restricciones

- `groups 1—N integrants`, `groups 1—N expenses`, `integrants 1—N expenses` (pagador).
- **Un integrante pertenece a un solo grupo** (`integrants.group_id`); la misma persona real en dos grupos son dos filas sin relación.
- Sin `ON DELETE CASCADE`, sin borrado lógico, sin índices adicionales (las FK no se indexan por defecto en PostgreSQL), sin columna de versión (no hay control de concurrencia: gana la última escritura).
- Reglas aplicadas **solo en la capa de aplicación** (no en la BD): el pagador debe pertenecer al grupo de la ruta (409 si no); el gasto debe pertenecer al grupo de la ruta (409); no se borra un integrante con gastos (409); un grupo cerrado no admite altas/ediciones/bajas (409). No hay endpoint para borrar grupos.
- No se valida que la fecha del gasto esté entre `startDate` y `endDate` del grupo.

### 3.3 Validaciones de entrada (Bean Validation)

| Campo | Regla | Mensaje (inglés) |
|---|---|---|
| Grupo `name` | no vacío, 1–200 | `Group name is required` / `must be between 1 and 200 characters` |
| Grupo `description` | ≤ 500 | `…at most 500 characters` |
| Grupo `currency` | no vacío, ≤ 5 | `Currency is required` / `…at most 5 characters` |
| Grupo `startDate` | obligatorio | `Start date is required` |
| Integrante `name` | no vacío, 1–200 | `Name is required` |
| Gasto `payedBy` | obligatorio | `Payed by is required` |
| Gasto `description` | no vacía, **4–500** | `Description must be between 4 and 500 characters` |
| Gasto `amount` | obligatorio, **≥ 0.01** | `Amount must be greater than 0` |
| Gasto `date` | obligatoria (solo al crear) | `Date is required` |

**Vacío de validación:** no hay `@Digits`; un monto con más de 2 decimales o más de 10 dígitos enteros pasa la validación. Lo que ocurre después depende de PostgreSQL (redondeo o error → 500 genérico). **[NO VERIFICADO]** (ver G28 y §11).

### 3.4 Volumen aproximado

No se puede determinar desde el código: los repositorios no incluyen datos semilla, dumps ni scripts. **[SUPOSICIÓN, solo informativa: no se migra ningún dato, D5]** uso personal o familiar: decenas de grupos, de 2 a 20 integrantes por grupo, cientos de gastos en total. Los cálculos recorren todos los gastos del grupo en memoria en cada lectura (sin paginación), lo que no es problema a esa escala.

---

## 4. Algoritmos críticos

Resultados de los ejemplos: **ejecutados** contra el código real (ver §9.0). Para portar sin abrir el proyecto original, el Anexo A reproduce el código relevante.

### 4.1 Reparto de gastos

**Único modo: partes iguales entre todos los integrantes del grupo en el momento de calcular.** No se guarda una distribución por gasto; la «parte» no pertenece a un gasto sino al grupo completo.

```
parte_igual(grupo):
    n      = número de integrantes del grupo AHORA           # incluye a quien nunca pagó
    total  = Σ monto de TODOS los gastos del grupo           # suma exacta (BigDecimal)
    parte  = redondear_mitad_arriba(total / n, 2 decimales)  # RoundingMode.HALF_UP
    devolver parte
```

Consecuencias comprobadas en el código:

1. **El reparto es retroactivo (se mantiene en Balance, D6).** Si se agrega un integrante después de registrar gastos, esa persona pasa a deber su parte de **todos** los gastos anteriores (caso G18). Si se elimina uno (solo posible si no tiene gastos), las partes de los demás suben (G19).
2. **No hay participación parcial.** Un gasto siempre se divide entre todos; no se puede excluir a alguien de un gasto concreto. Todo caso de «participantes parciales» es un **requisito nuevo**, no una regla existente. **Balance mantiene este comportamiento (D6).**
3. **Si el grupo no tiene integrantes**, el cálculo devuelve lista vacía (`if (integrantsIds.isEmpty()) return emptyList()`).

Ejemplo: 3 integrantes, un gasto de 100.00 → `parte = 100.00 / 3 = 33.3333… → 33.33`.

### 4.2 Cálculo de saldos

```
saldos(grupo):
    parte = parte_igual(grupo)
    para cada integrante m:  saldo[m] = −parte ;  pagado[m] = 0
    para cada gasto g:       saldo[g.pagador] += g.monto ;  pagado[g.pagador] += g.monto
    devolver [(m, pagado[m], saldo[m])]  en el orden de iteración de un HashMap<Long,…> (ver 4.3)
```

- Convención de signo: **saldo > 0** → debe recibir; **saldo < 0** → debe pagar.
- `pagado` de quien no pagó es `BigDecimal.ZERO` (**escala 0**: la API devuelve `0`, no `0.00`); el `saldo` siempre tiene escala 2.
- Solo la división `total / n` redondea; todas las demás operaciones son sumas y restas exactas de valores con 2 decimales.
- **Los saldos no suman cero** en general: `Σ saldos = total − n·parte` (el sobrante de redondeo, ver 4.4).
- El saldo individual (`GET …/balances/{id}`) usa la misma fórmula (`calculateIntegrantBalance`) y da el mismo valor que la lista.

Ejemplo (G23, 5 integrantes; pagaron 250.00, 125.50, 80.25 y 0.01): `total = 455.76`, `parte = 91.152 → 91.15`; saldos: +158.85, +34.35, −10.90, −91.14, −91.15 (suma = +0.01).

### 4.3 Algoritmo de liquidación (codicioso con dos colas de prioridad)

Fuente: `BE/domain/service/SettlementCalculator.java:calculate`. **No minimiza el número de transferencias en general** (G32) y **no es determinista desde el punto de vista del negocio**: los empates dependen del comportamiento interno de `java.util.PriorityQueue` y del orden de iteración de un `HashMap`.

```
liquidar(saldos):                       # lista de (id, saldo) en el orden recibido
    deudores   = ColaPrioridad(orden: saldo ascendente)        # el más negativo primero
    acreedores = ColaPrioridad(orden: saldo descendente)       # el más positivo primero
    para b en saldos (en orden):
        si b.saldo < 0: deudores.agregar(b)
        si b.saldo > 0: acreedores.agregar(b)                  # los saldos 0 se ignoran
    transacciones = []
    mientras deudores no vacía Y acreedores no vacía:
        d = deudores.sacar() ; c = acreedores.sacar()
        monto = mínimo(|d.saldo|, c.saldo)
        d.saldo += monto ; c.saldo −= monto
        transacciones.agregar( d.id → c.id : monto )
        si d.saldo < 0:       deudores.agregar(d)              # deudor aún debe
        sino si c.saldo > 0:  acreedores.agregar(c)            # acreedor aún espera
    devolver transacciones                                     # lo que quede en una cola NO se liquida
```

**Propiedades.**
- Cada iteración deja en cero al menos a uno de los dos → a lo sumo `#deudores + #acreedores − 1` transferencias.
- Los montos son siempre positivos, con 2 decimales (mínimo de dos valores de 2 decimales).
- La comparación usa `BigDecimal.compareTo` (ignora la escala).
- El calculador **muta** los objetos `Balance` que recibe; el caso de uso genera una lista nueva por cada llamada, por lo que no hay fuga de estado.

**Cómo se resuelven los empates (necesario para reproducir el orden exacto).**

1. *Orden de entrada.* La lista de saldos sale de `groupBalances.entrySet().stream()` donde `groupBalances` es un `HashMap<Long, BigDecimal>`. El orden de iteración es: por **cubeta ascendente**, donde `cubeta = (h XOR (h >>> 16)) AND (capacidad − 1)`, `h = (int)(id XOR (id >>> 32))`; capacidad inicial 16, se **duplica cuando el número de elementos supera el 75 %** (13.º elemento → 32, 25.º → 64…); dentro de una cubeta, por orden de inserción (el orden en que la BD devolvió los integrantes: `findByGroupId` **no tiene `ORDER BY`**). Con IDs menores que la capacidad equivale a «ID ascendente».
2. *Cola de prioridad.* `java.util.PriorityQueue` es un **montículo binario mínimo** en arreglo, **no estable**:
```
agregar(x):  poner x al final (posición k); mientras k > 0:
                 p = (k−1) >> 1 ; si cmp(x, q[p]) >= 0: parar ; q[k] = q[p] ; k = p
             q[k] = x
sacar():     res = q[0] ; x = último elemento (se quita) ; n = tamaño actual
             si n > 0: k = 0
                 mientras k < n/2:
                     c = 2k+1 ; si c+1 < n Y cmp(q[c], q[c+1]) > 0: c = c+1
                     si cmp(x, q[c]) <= 0: parar ; q[k] = q[c] ; k = c
                 q[k] = x
             devolver res
```
   `cmp` de deudores = comparar saldos ascendente; de acreedores = comparar saldos descendente (`Comparator.comparing(getBalance).reversed()`).
3. *Resultado práctico.* Con varios saldos iguales el orden de salida **no es** por ID ni por nombre: con 12 deudores iguales y IDs 1–13, sale `2, 13, 12, 11, …, 3` (G24). El orden de salida de la liquidación puede cambiar si cambia el orden en que la BD devuelve filas con IDs que colisionan en el `HashMap` **[SUPOSICIÓN, no reproducido]**.

> **Verificación del pseudocódigo.** Se programó una emulación independiente (`HashMap` + montículo + liquidación) a partir de este pseudocódigo y se comparó con el Java real en **3 000 escenarios aleatorios** (1–25 integrantes, IDs hasta 400, 0–12 gastos): **0 discrepancias** en el orden de los saldos y en la lista de transferencias.

Ejemplo (G22): saldos Ana +75.00, Beto +15.00, Carla −45.00, Diego −45.00 → `Carla→Ana 45.00`, `Diego→Ana 30.00`, `Diego→Beto 15.00`. (Carla va primero por el desempate del montículo; si salieran en el otro orden, el resultado cambiaría de pagador pero cada persona pagaría o recibiría lo mismo.)

> **Decisión D2 (aprobada, §12.2):** en Balance la liquidación **debe ser determinista**. Se reemplaza el montículo y el `HashMap` por un orden total (mayor monto primero; en empate, orden de alta en el grupo), independiente del orden de entrada y del de la base de datos. Lo descrito en esta sección es el comportamiento **de SaldApp**, que no debe copiarse.

### 4.4 Reglas de redondeo y destino de los centavos sobrantes

| Aspecto | Regla en SaldApp (evidencia) |
|---|---|
| Dónde se redondea | **Una sola vez**: `parte = total / n` con 2 decimales y `RoundingMode.HALF_UP` (`calculateGroupBalances`, `calculateIntegrantBalance`). Mitad se redondea hacia arriba: `0.025 → 0.03` (G10) |
| Tipo numérico | `BigDecimal` en dominio y casos de uso; `numeric(12,2)` en BD. **Nunca `double`** en el backend |
| Centavos sobrantes | **No se asignan a nadie de forma explícita.** Se pierden por el redondeo: `r = total − n·parte`, con `|r| ≤ 0.005·n` |
| Si la parte se redondea **hacia abajo** (`r > 0`) | Las «partes» suman menos que el total (p. ej. 3 × 33.33 = **99.99**, no 100.00). El acreedor que queda en la cola al final conserva `r` sin cobrar: **quien pagó absorbe el centavo** (G02: Ana pagó 100.00, recibe 66.66 y queda con +0.01) |
| Si la parte se redondea **hacia arriba** (`r < 0`) | Las deudas suman más que los créditos en `|r|`. El **último deudor** en salir del montículo paga `|r|` de menos (G03: Carla paga 66.66 en vez de 66.67; G12: el último deudor paga 142.84 en vez de 142.86) |
| Saldos mostrados | No se ajustan: la tabla de saldos muestra los valores crudos, y la suma de la columna puede ser ≠ 0 (G02: +0.01; G03: −0.01; G26: −0.05) |
| Parte que se redondea a 0.00 | Si `total/n < 0.005`, `parte = 0.00` y el pagador queda con saldo `+total` sin deudores: la liquidación sale **vacía** y la interfaz dice «No hay deudas pendientes» (G11) |

> **Contradicción detectada con la ficha `BALANCE.md` y ya resuelta.** La versión original de la ficha (plan de pruebas, punto 2) suponía que, al repartir ₡100,00 entre 3, «la suma de las partes es exactamente ₡100,00 y el centavo sobrante se asigna según la regla documentada del sistema anterior». **El sistema anterior no tiene tal regla:** las partes suman 99.99 y el centavo queda sin cobrar al pagador. **Resuelto por el propietario (D1, §12.1):** en Balance los centavos sobrantes **sí se asignan** (un centavo por participante, por orden de alta); las partes suman exactamente el total y los saldos suman exactamente 0.00. La ficha ya se actualizó con esa regla. Lo descrito en esta sección es el comportamiento **de SaldApp**, que no se reproduce.

---

## 5. Participantes y permisos

- **Identificación de personas.** Un integrante es solo un **nombre de texto** (1–200 caracteres, repetible) asociado a un grupo. No hay correo, teléfono, cuenta ni identificador externo (`Integrant.java`: `id`, `name`, `createdAt`, `groupId`).
- **Roles dentro del grupo.** No existen. Todos los accesos son equivalentes: quien llega al grupo puede crear, editar y borrar integrantes y gastos (mientras el grupo esté abierto), cerrarlo y editar su configuración.
- **Invitaciones.** No existen. «Compartir» un grupo equivale a pasar su ID numérico (secuencial: `GenerationType.IDENTITY`, por tanto enumerable).
- **Quién ve y edita qué.** Todos ven todo y editan todo. Las comprobaciones de pertenencia del código (`findAndValidateIntegrant`, `findAndValidateExpense`) **protegen la coherencia de datos, no el acceso**: usar el ID de un gasto o integrante de otro grupo devuelve **409** (`…does not belong to group…`), no 404.
- **Estados.** Abierto/cerrado. Cerrado = solo lectura (incluye saldos y liquidación final).
- **Sin propietario/creador.** El grupo no registra quién lo creó (en Balance, el creador es el administrador: D3).

**Modelo en Balance (decidido, §12.3).** Balance **no puede quedar abierto**: toda lectura o escritura exige sesión de Pastel y pertenencia al grupo. **Toda persona participante tiene cuenta de Pastel** (no hay participantes solo con nombre) y entra a un grupo con su **enlace y código de 4 dígitos**, que el administrador comparte. Roles de grupo: puede haber **varios administradores** (equivalen a los dueños del grupo; siempre al menos uno; el creador es el primero), que comparten el enlace y el código, nombran o quitan administradores, administran el grupo y registran y modifican los gastos de todo el grupo; el **miembro** registra, modifica y elimina **solo sus** gastos y ve todos los del grupo. Los permisos de plataforma son `balance.access` y `balance.groups.manage`. Un grupo ajeno responde 404. El ID deja de ser llave de acceso.

---

## 6. Autenticación actual y relación con cuentas de Google en Pastel

**Actual:** ninguna. No hay `spring-boot-starter-security` en `pom.xml`, ni tokens, ni cookies, ni `localStorage` en el frontend (búsqueda en `FE/`). La única barrera es el CORS (`CorsConfig`), que no es autenticación. Cualquier cliente que llegue al puerto 8080 puede usar toda la API; Swagger UI está habilitado.

**Relación con Pastel (decidida, D3 en §12.3).**

1. SaldApp **no tiene identidades**: el vínculo «integrante ↔ cuenta de Google» no existe y Balance lo crea desde el inicio.
2. En Balance cada participante **es una cuenta de Pastel** (inicio con Google). El administrador comparte el **enlace y el código de 4 dígitos** del grupo, siempre visibles para él, y la persona ingresa con su cuenta. SaldApp **no almacena correos** y la plataforma **no envía correos** todavía (fuera de alcance en la ficha): la **invitación por correo vale la pena pero queda para una fase posterior**. Quien no tiene cuenta ve una página que le indica registrarse y marcar la app Balance, y luego se le lleva a la página de registro (§12.3, punto 9).
3. **No hay grupos heredados** (D5): no se asignan administradores ni se importan integrantes. Cada grupo nuevo tiene como administrador a quien lo crea.
4. Autorización 100 % en el servidor y cookies `HttpOnly` según `AGENTS.md`; el ID del grupo deja de ser llave de acceso.

> **Decisión D3 (aprobada, §12.3):** la ausencia de autenticación es un defecto de SaldApp que **no se hereda**. La matriz de permisos y el ingreso por enlace y código están en §12.3.

---

## 7. Importación y exportación

- **Importación:** no existe en ninguno de los dos repositorios.
- **Exportación:** no existe (ni CSV, ni PDF, ni impresión). El único formato disponible es **JSON por la API REST** y la documentación OpenAPI/Swagger.
- **Extracción de datos para la migración: no aplica.** Balance inicia desde cero (D5, §12.5); no se importa nada de SaldApp. Como dato informativo, la API de SaldApp no tiene listado de grupos y los datos solo se pueden obtener con acceso directo a su base de datos (`groups`, `integrants`, `expenses`) o recorriendo IDs; no se necesita para Balance.

---

## 8. Integraciones externas

**Ninguna.** Solo PostgreSQL. No hay correo, WhatsApp, pasarelas de pago, bancos, tipos de cambio, almacenamiento de archivos ni servicios de terceros (búsqueda de `mail`, `csv`, `pdf`, `webhook`, `smtp`, `export` en ambos repositorios: sin resultados relevantes). La «moneda» es solo un símbolo de texto, sin conversión. Esto coincide con lo que `BALANCE.md` §5 deja fuera de alcance.

---

## 9. Casos dorados

### 9.0 Método y alcance

**Qué se ejecutó (resultado «ejecutado»).** Se compiló con OpenJDK 21 el archivo **`SettlementCalculator.java` real, sin cambios** (solo se quitaron `package` e `import` de dominio) junto con una **réplica literal** del método `GroupFinancialUseCaseImp.calculateGroupBalances` (mismo `HashMap`, mismas operaciones `BigDecimal`, mismo `HALF_UP`). `Balance` y `Transaction` se reescribieron como clases simples sin Lombok. Cada escenario se evalúa **después de cada operación** (alta, edición, baja) con el estado resultante. El código del Anexo A es el que se ejecutó.

**Qué NO se ejecutó.** La aplicación Spring completa, PostgreSQL ni las pruebas Maven (no se contó con Maven ni con PostgreSQL en el entorno de investigación). Por tanto: las **respuestas de error HTTP** (409/404/400) están **«calculadas»** leyendo el código, no ejecutadas; el comportamiento de persistencia con más de 2 decimales (G28) es **inferido**.

**Cómo leerlos.**

- Cada caso lista las operaciones en orden y, tras cada `Resultado`, los saldos y la liquidación **exactos** tal como los devolvería `GET /balances` y `GET /settlements`, **en el mismo orden de salida**.
- IDs: se asignan 1..n por caso (el caso G25 usa 101..113 para mostrar sensibilidad). Los IDs reales provienen de una secuencia global.
- `totalPaid` de quien no pagó aparece como `0` (escala 0), tal como lo emitiría la API.
- **Desempates:** el orden de las transferencias es el del montículo de Java. Una implementación que no emule el montículo debe comparar la liquidación **como conjunto** y, además, que **cada persona pague/reciba el mismo neto**; mientras no se decida una regla determinista (§11, P4), el criterio «idéntico» exige reproducir el orden de §4.3.
- Suma de saldos = `total − n·parte` (sobrante de redondeo, §4.4).

**Participantes parciales.** SaldApp **no los soporta** (§4.1). Los casos G09, G18 y G19 cubren los equivalentes reales: integrante que no pagó nada, integrante agregado después de los gastos, integrante dado de baja. Un caso con participación parcial por gasto no tiene resultado esperado en SaldApp y debe tratarse como requisito nuevo.

**Borrado de grupos.** No existe (§2). Se cubre el cierre (G21).

**Referencia y objetivo.** Los resultados de §9.2 son **de SaldApp** («antes»). Como Balance corrige el manejo de centavos y el orden de la liquidación (D1, D2) y exige autenticación (D3) y validación de montos (D4), la **§9.3** fija el resultado esperado en Balance para los casos que cambian.

### 9.1 Resumen de los 34 casos

| Caso | Escenario | Qué comprueba |
|---|---|---|
| G01 | 2 personas, un gasto | Caso base, división exacta · _ejecutado_ |
| G02 | 3 personas, ₡100,00 pagados por una (caso de redondeo de la ficha) | Redondeo ↓ (ficha §Plan 2): partes suman 99.99 · _ejecutado_ |
| G03 | 3 personas, ₡200,00 pagados por una (redondeo hacia arriba) | Redondeo ↑: el último deudor paga 0.01 menos · _ejecutado_ |
| G04 | 3 personas, dos pagan montos iguales | Dos acreedores iguales, un deudor · _ejecutado_ |
| G05 | 4 personas, división exacta | Desempate del montículo con 3 deudores iguales · _ejecutado_ |
| G06 | 4 personas, todos pagan lo mismo (sin liquidaciones) | Sin saldos ni liquidación · _ejecutado_ |
| G07 | Grupo de 1 persona | Grupo mínimo · _ejecutado_ |
| G08 | Grupo con integrantes y sin gastos | Sin gastos · _ejecutado_ |
| G09 | 3 personas, una nunca pagó | Integrante que no pagó; orden por saldo · _ejecutado_ |
| G10 | 2 personas, medio centavo (HALF_UP) | HALF_UP exacto en 0.025 · _ejecutado_ |
| G11 | 3 personas, ₡0,01 total (la parte se redondea a 0,00) | Parte 0.00: liquidación vacía con saldo +0.01 · _ejecutado_ |
| G12 | 7 personas, ₡1000,00 pagados por una | 6 deudores iguales; cent. sobrante en el último · _ejecutado_ |
| G13 | 2 personas, monto muy grande (límite numeric(12,2)) | Límite de numeric(12,2) · _ejecutado_ |
| G14 | Editar el monto de un gasto | Edición de monto · _ejecutado_ |
| G15 | Editar quién pagó un gasto | Edición de pagador · _ejecutado_ |
| G16 | Borrar un gasto | Borrado de gasto · _ejecutado_ |
| G17 | Borrar todos los gastos | Borrado de todos los gastos · _ejecutado_ |
| G18 | Agregar un integrante después de registrar gastos (reparto retroactivo) | Reparto retroactivo al agregar integrante · _ejecutado_ |
| G19 | Eliminar un integrante sin gastos | Baja de integrante sin gastos · _ejecutado_ |
| G20 | Eliminar un integrante con gastos (rechazado) | Baja de integrante con gastos: 409 · _ejecutado; errores calculados_ |
| G21 | Grupo cerrado: lectura permitida, escritura rechazada | Grupo cerrado: 409 en escrituras; lectura igual · _ejecutado; errores calculados_ |
| G22 | 4 personas, dos acreedores y dos deudores iguales | 2 acreedores / 2 deudores · _ejecutado_ |
| G23 | Un gasto pagado por cada uno de 5 con montos distintos | Montos distintos y 0.01 · _ejecutado_ |
| G24 | 13 integrantes (cruza el umbral de 12 del HashMap), un pagador | 13 integrantes (HashMap 16→32); orden 2,13,12… · _ejecutado_ |
| G25 | Mismo escenario con IDs altos (101–113): ¿cambia el orden? | Misma estructura con IDs 101–113 · _ejecutado_ |
| G26 | 20 integrantes, gastos variados | 20 integrantes, 5 pagadores, sobrante −0.05 · _ejecutado_ |
| G27 | Muchos gastos pequeños, mismo pagador, 3 personas | Acumulación de pequeños gastos · _ejecutado_ |
| G28 | Gasto con 3 decimales (¡comportamiento a verificar!) | 3 decimales: comportamiento a verificar · _ejecutado + inferido_ |
| G29 | 3 personas, tres gastos de ₡33,34 (total 100,02) | Parte exacta con total 100.02 · _ejecutado_ |
| G30 | Calculador directo: ejemplo de la prueba unitaria (3 deudores, 3 acreedores) | Calculador: 3 deudores + 3 acreedores · _ejecutado_ |
| G31 | Calculador directo: pares exactos (-50,-30,+50,+30) | Calculador: pares exactos · _ejecutado_ |
| G32 | Calculador directo: el algoritmo codicioso NO es mínimo | Calculador: no es mínimo (4 en vez de 3) · _ejecutado_ |
| G33 | Calculador directo: saldos que no suman cero (sobrante sin liquidar) | Calculador: saldos que no suman 0 · _ejecutado_ |
| G34 | Errores de validación al crear gastos (400) | Validaciones y errores 400/404/409 · _calculado_ |

### 9.2 Detalle de los casos

#### G01 — 2 personas, un gasto
- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Cena»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **50.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 50.00 |
| 2 | Beto | 0 | -50.00 |

Liquidación (en orden de salida): id2→id1: 50.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G02 — 3 personas, ₡100,00 pagados por una (caso de redondeo de la ficha)
_100/3=33,333… → 33,33; sobra 0,01_

- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Taxi»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 66.67 |
| 2 | Beto | 0 | -33.33 |
| 3 | Carla | 0 | -33.33 |

Liquidación (en orden de salida): id2→id1: 33.33; id3→id1: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

#### G03 — 3 personas, ₡200,00 pagados por una (redondeo hacia arriba)
_200/3=66,666… → 66,67; el cálculo "cobra" 0,01 de más en total_

- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡200.00 — «Hotel»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **66.67**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 200.00 | 133.33 |
| 2 | Beto | 0 | -66.67 |
| 3 | Carla | 0 | -66.67 |

Liquidación (en orden de salida): id2→id1: 66.67; id3→id1: 66.66

Suma de saldos (sobrante de redondeo): **-0.01**

#### G04 — 3 personas, dos pagan montos iguales
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡100.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **66.67**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 33.33 |
| 2 | Beto | 100.00 | 33.33 |
| 3 | Carla | 0 | -66.67 |

Liquidación (en orden de salida): id3→id1: 33.33; id3→id2: 33.33

Suma de saldos (sobrante de redondeo): **-0.01**

#### G05 — 4 personas, división exacta
- Alta de 4 integrantes, id=1..4: «Ana», «Beto», «Carla», «Diego»
- Gasto id=1: pagó Ana (id 1) ₡400.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **100.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 400.00 | 300.00 |
| 2 | Beto | 0 | -100.00 |
| 3 | Carla | 0 | -100.00 |
| 4 | Diego | 0 | -100.00 |

Liquidación (en orden de salida): id2→id1: 100.00; id4→id1: 100.00; id3→id1: 100.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G06 — 4 personas, todos pagan lo mismo (sin liquidaciones)
- Alta de 4 integrantes, id=1..4: «Ana», «Beto», «Carla», «Diego»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡100.00 — «Gasto»
- Gasto id=3: pagó Carla (id 3) ₡100.00 — «Gasto»
- Gasto id=4: pagó Diego (id 4) ₡100.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **100.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 0.00 |
| 2 | Beto | 100.00 | 0.00 |
| 3 | Carla | 100.00 | 0.00 |
| 4 | Diego | 100.00 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G07 — Grupo de 1 persona
- Alta de integrante id=1 «Ana»
- Gasto id=1: pagó Ana (id 1) ₡50.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **50.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 50.00 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G08 — Grupo con integrantes y sin gastos
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0 | 0.00 |
| 2 | Beto | 0 | 0.00 |
| 3 | Carla | 0 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G09 — 3 personas, una nunca pagó
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡90.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡30.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **40.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 90.00 | 50.00 |
| 2 | Beto | 30.00 | -10.00 |
| 3 | Carla | 0 | -40.00 |

Liquidación (en orden de salida): id3→id1: 40.00; id2→id1: 10.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G10 — 2 personas, medio centavo (HALF_UP)
_0,05/2=0,025 → 0,03_

- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- Gasto id=1: pagó Ana (id 1) ₡0.05 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.03**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0.05 | 0.02 |
| 2 | Beto | 0 | -0.03 |

Liquidación (en orden de salida): id2→id1: 0.02

Suma de saldos (sobrante de redondeo): **-0.01**

#### G11 — 3 personas, ₡0,01 total (la parte se redondea a 0,00)
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡0.01 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0.01 | 0.01 |
| 2 | Beto | 0 | 0.00 |
| 3 | Carla | 0 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.01**

#### G12 — 7 personas, ₡1000,00 pagados por una
_1000/7=142,857… → 142,86; 6 deudores con saldo igual (desempate por heap)_

- Alta de 7 integrantes, id=1..7: «Ana», «Beto», «Carla», «Diego», «Elena», «Fabio», «Gina»
- Gasto id=1: pagó Ana (id 1) ₡1000.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **142.86**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 1000.00 | 857.14 |
| 2 | Beto | 0 | -142.86 |
| 3 | Carla | 0 | -142.86 |
| 4 | Diego | 0 | -142.86 |
| 5 | Elena | 0 | -142.86 |
| 6 | Fabio | 0 | -142.86 |
| 7 | Gina | 0 | -142.86 |

Liquidación (en orden de salida): id2→id1: 142.86; id7→id1: 142.86; id6→id1: 142.86; id5→id1: 142.86; id4→id1: 142.86; id3→id1: 142.84

Suma de saldos (sobrante de redondeo): **-0.02**

#### G13 — 2 personas, monto muy grande (límite numeric(12,2))
_4 999 999 999,995 → 5 000 000 000,00_

- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- Gasto id=1: pagó Ana (id 1) ₡9999999999.99 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **5000000000.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 9999999999.99 | 4999999999.99 |
| 2 | Beto | 0 | -5000000000.00 |

Liquidación (en orden de salida): id2→id1: 4999999999.99

Suma de saldos (sobrante de redondeo): **-0.01**

#### G14 — Editar el monto de un gasto
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»

**Resultado — antes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 66.67 |
| 2 | Beto | 0 | -33.33 |
| 3 | Carla | 0 | -33.33 |

Liquidación (en orden de salida): id2→id1: 33.33; id3→id1: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

- PATCH gasto id=1: amount=150.00

**Resultado — después de PATCH amount=150.00**

Parte igual por persona (total/n, HALF_UP, 2 dec): **50.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 150.00 | 100.00 |
| 2 | Beto | 0 | -50.00 |
| 3 | Carla | 0 | -50.00 |

Liquidación (en orden de salida): id2→id1: 50.00; id3→id1: 50.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G15 — Editar quién pagó un gasto
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡90.00 — «Gasto»

**Resultado — antes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **30.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 90.00 | 60.00 |
| 2 | Beto | 0 | -30.00 |
| 3 | Carla | 0 | -30.00 |

Liquidación (en orden de salida): id2→id1: 30.00; id3→id1: 30.00

Suma de saldos (sobrante de redondeo): **0.00**

- PATCH gasto id=1: payedBy=Beto

**Resultado — después de PATCH payedBy=Beto**

Parte igual por persona (total/n, HALF_UP, 2 dec): **30.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0 | -30.00 |
| 2 | Beto | 90.00 | 60.00 |
| 3 | Carla | 0 | -30.00 |

Liquidación (en orden de salida): id1→id2: 30.00; id3→id2: 30.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G16 — Borrar un gasto
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡60.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡30.00 — «Gasto»

**Resultado — antes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **30.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 60.00 | 30.00 |
| 2 | Beto | 30.00 | 0.00 |
| 3 | Carla | 0 | -30.00 |

Liquidación (en orden de salida): id3→id1: 30.00

Suma de saldos (sobrante de redondeo): **0.00**

- DELETE gasto id=2

**Resultado — después de borrar el gasto 2**

Parte igual por persona (total/n, HALF_UP, 2 dec): **20.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 60.00 | 40.00 |
| 2 | Beto | 0 | -20.00 |
| 3 | Carla | 0 | -20.00 |

Liquidación (en orden de salida): id2→id1: 20.00; id3→id1: 20.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G17 — Borrar todos los gastos
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»

**Resultado — antes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 66.67 |
| 2 | Beto | 0 | -33.33 |
| 3 | Carla | 0 | -33.33 |

Liquidación (en orden de salida): id2→id1: 33.33; id3→id1: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

- DELETE gasto id=1

**Resultado — sin gastos**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0 | 0.00 |
| 2 | Beto | 0 | 0.00 |
| 3 | Carla | 0 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G18 — Agregar un integrante después de registrar gastos (reparto retroactivo)
_El nuevo integrante paga su parte de TODOS los gastos anteriores_

- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»

**Resultado — 2 integrantes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **50.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 50.00 |
| 2 | Beto | 0 | -50.00 |

Liquidación (en orden de salida): id2→id1: 50.00

Suma de saldos (sobrante de redondeo): **0.00**

- Alta de integrante id=3 «Carla»

**Resultado — después de agregar a Carla**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 66.67 |
| 2 | Beto | 0 | -33.33 |
| 3 | Carla | 0 | -33.33 |

Liquidación (en orden de salida): id2→id1: 33.33; id3→id1: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

#### G19 — Eliminar un integrante sin gastos
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡90.00 — «Gasto»

**Resultado — 3 integrantes**

Parte igual por persona (total/n, HALF_UP, 2 dec): **30.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 90.00 | 60.00 |
| 2 | Beto | 0 | -30.00 |
| 3 | Carla | 0 | -30.00 |

Liquidación (en orden de salida): id2→id1: 30.00; id3→id1: 30.00

Suma de saldos (sobrante de redondeo): **0.00**

- Baja de integrante id=3 «Carla» (permitida: sin gastos)

**Resultado — después de eliminar a Carla**

Parte igual por persona (total/n, HALF_UP, 2 dec): **45.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 90.00 | 45.00 |
| 2 | Beto | 0 | -45.00 |

Liquidación (en orden de salida): id2→id1: 45.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G20 — Eliminar un integrante con gastos (rechazado)
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Beto (id 2) ₡60.00 — «Gasto»
- **Rechazo esperado** (DELETE /groups/1/integrants/2 (Beto pagó el gasto 1)): HTTP 409 — Integrant with id 2 has expenses and cannot be deleted. _(calculado desde el código; no ejecutado)_
- DELETE gasto id=1
- Baja de integrante id=2 «Beto» (permitida: sin gastos)

**Resultado — tras borrar el gasto y luego al integrante**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 0 | 0.00 |
| 3 | Carla | 0 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G21 — Grupo cerrado: lectura permitida, escritura rechazada
- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡100.00 — «Gasto»
- POST /groups/1/close
- **Rechazo esperado** (POST /groups/1/expenses (grupo cerrado)): HTTP 409 — Group with id 1 is closed and cannot accept new transactions. _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (PATCH /groups/1 (grupo cerrado)): HTTP 409 — igual: GroupClosedException _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST /groups/1/close otra vez): HTTP 409 — igual: GroupClosedException _(calculado desde el código; no ejecutado)_

**Resultado — balances y liquidación tras cerrar**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 100.00 | 66.67 |
| 2 | Beto | 0 | -33.33 |
| 3 | Carla | 0 | -33.33 |

Liquidación (en orden de salida): id2→id1: 33.33; id3→id1: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

#### G22 — 4 personas, dos acreedores y dos deudores iguales
- Alta de 4 integrantes, id=1..4: «Ana», «Beto», «Carla», «Diego»
- Gasto id=1: pagó Ana (id 1) ₡120.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡60.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **45.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 120.00 | 75.00 |
| 2 | Beto | 60.00 | 15.00 |
| 3 | Carla | 0 | -45.00 |
| 4 | Diego | 0 | -45.00 |

Liquidación (en orden de salida): id3→id1: 45.00; id4→id1: 30.00; id4→id2: 15.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G23 — Un gasto pagado por cada uno de 5 con montos distintos
- Alta de 5 integrantes, id=1..5: «Ana», «Beto», «Carla», «Diego», «Elena»
- Gasto id=1: pagó Ana (id 1) ₡250.00 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡125.50 — «Gasto»
- Gasto id=3: pagó Carla (id 3) ₡80.25 — «Gasto»
- Gasto id=4: pagó Diego (id 4) ₡0.01 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **91.15**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 250.00 | 158.85 |
| 2 | Beto | 125.50 | 34.35 |
| 3 | Carla | 80.25 | -10.90 |
| 4 | Diego | 0.01 | -91.14 |
| 5 | Elena | 0 | -91.15 |

Liquidación (en orden de salida): id5→id1: 91.15; id4→id1: 67.70; id4→id2: 23.44; id3→id2: 10.90

Suma de saldos (sobrante de redondeo): **0.01**

#### G24 — 13 integrantes (cruza el umbral de 12 del HashMap), un pagador
- Alta de 13 integrantes, id=1..13: «Ana», «Beto», «Carla», «Diego», «Elena», «Fabio», «Gina», «Hugo», «Irene», «Jorge», «Karla», «Luis», «Marta»
- Gasto id=1: pagó Ana (id 1) ₡130.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **10.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 130.00 | 120.00 |
| 2 | Beto | 0 | -10.00 |
| 3 | Carla | 0 | -10.00 |
| 4 | Diego | 0 | -10.00 |
| 5 | Elena | 0 | -10.00 |
| 6 | Fabio | 0 | -10.00 |
| 7 | Gina | 0 | -10.00 |
| 8 | Hugo | 0 | -10.00 |
| 9 | Irene | 0 | -10.00 |
| 10 | Jorge | 0 | -10.00 |
| 11 | Karla | 0 | -10.00 |
| 12 | Luis | 0 | -10.00 |
| 13 | Marta | 0 | -10.00 |

Liquidación (en orden de salida): id2→id1: 10.00; id13→id1: 10.00; id12→id1: 10.00; id11→id1: 10.00; id10→id1: 10.00; id9→id1: 10.00; id8→id1: 10.00; id7→id1: 10.00; id6→id1: 10.00; id5→id1: 10.00; id4→id1: 10.00; id3→id1: 10.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G25 — Mismo escenario con IDs altos (101–113): ¿cambia el orden?
_Los IDs reales vienen de una secuencia de BD; se verifica sensibilidad_

- Alta de 13 integrantes, id=101..113: «Ana», «Beto», «Carla», «Diego», «Elena», «Fabio», «Gina», «Hugo», «Irene», «Jorge», «Karla», «Luis», «Marta»
- Gasto id=1: pagó Ana (id 101) ₡130.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **10.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 101 | Ana | 130.00 | 120.00 |
| 102 | Beto | 0 | -10.00 |
| 103 | Carla | 0 | -10.00 |
| 104 | Diego | 0 | -10.00 |
| 105 | Elena | 0 | -10.00 |
| 106 | Fabio | 0 | -10.00 |
| 107 | Gina | 0 | -10.00 |
| 108 | Hugo | 0 | -10.00 |
| 109 | Irene | 0 | -10.00 |
| 110 | Jorge | 0 | -10.00 |
| 111 | Karla | 0 | -10.00 |
| 112 | Luis | 0 | -10.00 |
| 113 | Marta | 0 | -10.00 |

Liquidación (en orden de salida): id102→id101: 10.00; id113→id101: 10.00; id112→id101: 10.00; id111→id101: 10.00; id110→id101: 10.00; id109→id101: 10.00; id108→id101: 10.00; id107→id101: 10.00; id106→id101: 10.00; id105→id101: 10.00; id104→id101: 10.00; id103→id101: 10.00

Suma de saldos (sobrante de redondeo): **0.00**

#### G26 — 20 integrantes, gastos variados
- Alta de 20 integrantes, id=1..20: «Ana», «Beto», «Carla», «Diego», «Elena», «Fabio», «Gina», «Hugo», «Irene», «Jorge», «Karla», «Luis», «Marta», «Nora», «Oscar», «Paula», «Raul», «Sara», «Tomas», «Ursula»
- Gasto id=1: pagó Ana (id 1) ₡15234.50 — «Gasto»
- Gasto id=2: pagó Elena (id 5) ₡8900.00 — «Gasto»
- Gasto id=3: pagó Gina (id 7) ₡1200.75 — «Gasto»
- Gasto id=4: pagó Luis (id 12) ₡43000.10 — «Gasto»
- Gasto id=5: pagó Ursula (id 20) ₡310.00 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **3432.27**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 15234.50 | 11802.23 |
| 2 | Beto | 0 | -3432.27 |
| 3 | Carla | 0 | -3432.27 |
| 4 | Diego | 0 | -3432.27 |
| 5 | Elena | 8900.00 | 5467.73 |
| 6 | Fabio | 0 | -3432.27 |
| 7 | Gina | 1200.75 | -2231.52 |
| 8 | Hugo | 0 | -3432.27 |
| 9 | Irene | 0 | -3432.27 |
| 10 | Jorge | 0 | -3432.27 |
| 11 | Karla | 0 | -3432.27 |
| 12 | Luis | 43000.10 | 39567.83 |
| 13 | Marta | 0 | -3432.27 |
| 14 | Nora | 0 | -3432.27 |
| 15 | Oscar | 0 | -3432.27 |
| 16 | Paula | 0 | -3432.27 |
| 17 | Raul | 0 | -3432.27 |
| 18 | Sara | 0 | -3432.27 |
| 19 | Tomas | 0 | -3432.27 |
| 20 | Ursula | 310.00 | -3122.27 |

Liquidación (en orden de salida): id2→id12: 3432.27; id3→id12: 3432.27; id6→id12: 3432.27; id18→id12: 3432.27; id17→id12: 3432.27; id16→id12: 3432.27; id15→id12: 3432.27; id14→id12: 3432.27; id10→id12: 3432.27; id19→id1: 3432.27; id11→id12: 3432.27; id9→id1: 3432.27; id8→id5: 3432.27; id13→id12: 3432.27; id4→id1: 3432.27; id20→id5: 2035.46; id7→id12: 1812.86; id20→id1: 1086.81; id7→id1: 418.61

Suma de saldos (sobrante de redondeo): **-0.05**

#### G27 — Muchos gastos pequeños, mismo pagador, 3 personas
_Acumulación de 0,01: 10×0,10 = 1,00_

- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=2: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=3: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=4: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=5: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=6: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=7: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=8: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=9: pagó Ana (id 1) ₡0.10 — «Gasto»
- Gasto id=10: pagó Ana (id 1) ₡0.10 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **0.33**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 1.00 | 0.67 |
| 2 | Beto | 0 | -0.33 |
| 3 | Carla | 0 | -0.33 |

Liquidación (en orden de salida): id2→id1: 0.33; id3→id1: 0.33

Suma de saldos (sobrante de redondeo): **0.01**

#### G28 — Gasto con 3 decimales (¡comportamiento a verificar!)
_La validación no limita los decimales (ver §11). Lo que realmente se persiste no se pudo verificar sin BD_

- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- Gasto id=1: pagó Ana (id 1) ₡10.005 — «Gasto»

**Resultado — (a) valor tal cual llega a la lógica**

Parte igual por persona (total/n, HALF_UP, 2 dec): **5.00**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 10.005 | 5.005 |
| 2 | Beto | 0 | -5.00 |

Liquidación (en orden de salida): id2→id1: 5.00

Suma de saldos (sobrante de redondeo): **0.005**

- PATCH gasto id=1: amount=10.01

**Resultado — (b) si la BD lo almacena redondeado a 10.01 (numeric(12,2)); inferido, no verificado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **5.01**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 10.01 | 5.00 |
| 2 | Beto | 0 | -5.01 |

Liquidación (en orden de salida): id2→id1: 5.00

Suma de saldos (sobrante de redondeo): **-0.01**

#### G29 — 3 personas, tres gastos de ₡33,34 (total 100,02)
_100,02/3 = 33,34 exacto: todos en cero_

- Alta de 3 integrantes, id=1..3: «Ana», «Beto», «Carla»
- Gasto id=1: pagó Ana (id 1) ₡33.34 — «Gasto»
- Gasto id=2: pagó Beto (id 2) ₡33.34 — «Gasto»
- Gasto id=3: pagó Carla (id 3) ₡33.34 — «Gasto»

**Resultado**

Parte igual por persona (total/n, HALF_UP, 2 dec): **33.34**

| id | Nombre | Pagado (totalPaid) | Saldo (balance) |
|---|---|---|---|
| 1 | Ana | 33.34 | 0.00 |
| 2 | Beto | 33.34 | 0.00 |
| 3 | Carla | 33.34 | 0.00 |

Liquidación: _(vacía)_

Suma de saldos (sobrante de redondeo): **0.00**

#### G30 — Calculador directo: ejemplo de la prueba unitaria (3 deudores, 3 acreedores)

**Resultado — entrada = saldos**

Entrada (saldos): id1=-90, id2=-60, id3=-30, id4=90, id5=60, id6=30


Liquidación (en orden de salida): id1→id4: 90; id2→id5: 60; id3→id6: 30

Suma de saldos (sobrante de redondeo): **0**

#### G31 — Calculador directo: pares exactos (-50,-30,+50,+30)

**Resultado**

Entrada (saldos): id1=-50, id2=-30, id3=50, id4=30


Liquidación (en orden de salida): id1→id3: 50; id2→id4: 30

Suma de saldos (sobrante de redondeo): **0**

#### G32 — Calculador directo: el algoritmo codicioso NO es mínimo
_Saldos -3,-2,-4,+4,+5: óptimo 3 transacciones, el algoritmo da 4_


**Resultado**

Entrada (saldos): id1=-3, id2=-2, id3=-4, id4=4, id5=5


Liquidación (en orden de salida): id3→id5: 4; id1→id4: 3; id2→id5: 1; id2→id4: 1

Suma de saldos (sobrante de redondeo): **0**

#### G33 — Calculador directo: saldos que no suman cero (sobrante sin liquidar)
_+0,01 deja al acreedor con residuo_


**Resultado**

Entrada (saldos): id1=-33.33, id2=-33.33, id3=66.67


Liquidación (en orden de salida): id1→id3: 33.33; id2→id3: 33.33

Suma de saldos (sobrante de redondeo): **0.01**

#### G34 — Errores de validación al crear gastos (400)
- Alta de 2 integrantes, id=1..2: «Ana», «Beto»
- **Rechazo esperado** (POST expense amount=0): HTTP 400 — errors.amount = "Amount must be greater than 0" _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST expense amount=-5): HTTP 400 — igual _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST expense description="abc" (3 caracteres)): HTTP 400 — errors.description = "Description must be between 4 and 500 characters" _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST expense sin date): HTTP 400 — errors.date = "Date is required" _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST expense payedBy de otro grupo): HTTP 409 — Integrant with id X does not belong to group with id 1. _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (POST expense payedBy inexistente): HTTP 404 — Integrant with id 999 not found. _(calculado desde el código; no ejecutado)_
- **Rechazo esperado** (GET /groups/999): HTTP 404 — Group with id 999 not found. _(calculado desde el código; no ejecutado)_
### 9.3 Resultados esperados en Balance (decisiones aprobadas de §12)

Se calcularon con las reglas de §12.1 y §12.2 (unidades mínimas enteras; orden de alta = orden de los IDs en cada caso) y se verificaron con propiedades sobre 5 000 escenarios aleatorios (partes que suman el total, saldos que suman 0, cada persona queda en cero, a lo sumo `#deudores + #acreedores − 1` transferencias, resultado independiente del orden de entrada). Estado de los resultados: **calculado** con las reglas aprobadas D1 y D2 (no es salida de SaldApp). Las entradas (altas, gastos y ediciones) son las de §9.2.

**Casos que cambian** (se muestra cada paso donde el resultado difiere):

| Caso (paso) | Partes nuevas (suman el total) | Saldos nuevos (suman 0.00) | Liquidación nueva | Cambia respecto a SaldApp |
|---|---|---|---|---|
| G02 | total 100.00; Ana 33.34, Beto 33.33, Carla 33.33 | Ana +66.66, Beto -33.33, Carla -33.33 | Beto→Ana 33.33; Carla→Ana 33.33 | saldos (SaldApp sumaba 0.01) |
| G03 | total 200.00; Ana 66.67, Beto 66.67, Carla 66.66 | Ana +133.33, Beto -66.67, Carla -66.66 | Beto→Ana 66.67; Carla→Ana 66.66 | saldos (SaldApp sumaba -0.01) |
| G04 | total 200.00; Ana 66.67, Beto 66.67, Carla 66.66 | Ana +33.33, Beto +33.33, Carla -66.66 | Carla→Ana 33.33; Carla→Beto 33.33 | saldos (SaldApp sumaba -0.01) |
| G05 | total 400.00; Ana 100.00, Beto 100.00, Carla 100.00, Diego 100.00 | Ana +300.00, Beto -100.00, Carla -100.00, Diego -100.00 | Beto→Ana 100.00; Carla→Ana 100.00; Diego→Ana 100.00 | liquidación/orden |
| G10 | total 0.05; Ana 0.03, Beto 0.02 | Ana +0.02, Beto -0.02 | Beto→Ana 0.02 | saldos (SaldApp sumaba -0.01) |
| G11 | total 0.01; Ana 0.01, Beto 0.00, Carla 0.00 | Ana 0.00, Beto 0.00, Carla 0.00 | (vacía) | saldos (SaldApp sumaba 0.01) |
| G12 | total 1000.00; Ana 142.86, Beto 142.86, Carla 142.86, Diego 142.86, Elena 142.86, Fabio 142.85, Gina 142.85 | Ana +857.14, Beto -142.86, Carla -142.86, Diego -142.86, Elena -142.86, Fabio -142.85, Gina -142.85 | Beto→Ana 142.86; Carla→Ana 142.86; Diego→Ana 142.86; Elena→Ana 142.86; Fabio→Ana 142.85; Gina→Ana 142.85 | saldos (SaldApp sumaba -0.02), liquidación/orden |
| G13 | total 9999999999.99; Ana 5000000000.00, Beto 4999999999.99 | Ana +4999999999.99, Beto -4999999999.99 | Beto→Ana 4999999999.99 | saldos (SaldApp sumaba -0.01) |
| G14 — antes | total 100.00; Ana 33.34, Beto 33.33, Carla 33.33 | Ana +66.66, Beto -33.33, Carla -33.33 | Beto→Ana 33.33; Carla→Ana 33.33 | saldos (SaldApp sumaba 0.01) |
| G17 — antes | total 100.00; Ana 33.34, Beto 33.33, Carla 33.33 | Ana +66.66, Beto -33.33, Carla -33.33 | Beto→Ana 33.33; Carla→Ana 33.33 | saldos (SaldApp sumaba 0.01) |
| G18 — después de agregar a Carla | total 100.00; Ana 33.34, Beto 33.33, Carla 33.33 | Ana +66.66, Beto -33.33, Carla -33.33 | Beto→Ana 33.33; Carla→Ana 33.33 | saldos (SaldApp sumaba 0.01) |
| G21 — balances y liquidación tras cerrar | total 100.00; Ana 33.34, Beto 33.33, Carla 33.33 | Ana +66.66, Beto -33.33, Carla -33.33 | Beto→Ana 33.33; Carla→Ana 33.33 | saldos (SaldApp sumaba 0.01) |
| G23 | total 455.76; Ana 91.16, Beto 91.15, Carla 91.15, Diego 91.15, Elena 91.15 | Ana +158.84, Beto +34.35, Carla -10.90, Diego -91.14, Elena -91.15 | Elena→Ana 91.15; Diego→Ana 67.69; Diego→Beto 23.45; Carla→Beto 10.90 | saldos (SaldApp sumaba 0.01), liquidación/orden |
| G24 | total 130.00; todas 10.00 | (ver nota) | Beto→Ana 10.00; Carla→Ana 10.00; Diego→Ana 10.00; Elena→Ana 10.00; Fabio→Ana 10.00; Gina→Ana 10.00; Hugo→Ana 10.00; Irene→Ana 10.00; Jorge→Ana 10.00; Karla→Ana 10.00; Luis→Ana 10.00; Marta→Ana 10.00 | liquidación/orden |
| G25 | total 130.00; todas 10.00 | (ver nota) | Beto→Ana 10.00; Carla→Ana 10.00; Diego→Ana 10.00; Elena→Ana 10.00; Fabio→Ana 10.00; Gina→Ana 10.00; Hugo→Ana 10.00; Irene→Ana 10.00; Jorge→Ana 10.00; Karla→Ana 10.00; Luis→Ana 10.00; Marta→Ana 10.00 | liquidación/orden |
| G26 | total 68645.35; 5 personas pagan 3432.26 y 15 pagan 3432.27 (las primeras 15 por orden de alta) | (ver nota) | Beto→Luis 3432.27; Carla→Luis 3432.27; Diego→Luis 3432.27; Fabio→Luis 3432.27; Hugo→Luis 3432.27; Irene→Luis 3432.27; Jorge→Luis 3432.27; Karla→Luis 3432.27; Marta→Luis 3432.27; Nora→Ana 3432.27; Oscar→Luis 3432.27; Paula→Ana 3432.26; Raul→Elena 3432.26; Sara→Luis 3432.26; Tomas→Ana 3432.26; Ursula→Elena 2035.47; Gina→Luis 1812.87; Ursula→Ana 1086.79; Gina→Ana 418.65 | saldos (SaldApp sumaba -0.05), liquidación/orden |
| G27 | total 1.00; Ana 0.34, Beto 0.33, Carla 0.33 | Ana +0.66, Beto -0.33, Carla -0.33 | Beto→Ana 0.33; Carla→Ana 0.33 | saldos (SaldApp sumaba 0.01) |
| G28 — (b) si la BD lo almacena redondeado a 10.01 (numeric(12,2)); inferido, no verificado | total 10.01; Ana 5.01, Beto 5.00 | Ana +5.00, Beto -5.00 | Beto→Ana 5.00 | saldos (SaldApp sumaba -0.01) |
| G32 (calculador directo) | — | ids 1–5: −3, −2, −4, +4, +5 | id3→id5 4.00; id1→id4 3.00; id2→id4 1.00; id2→id5 1.00 | solo el **orden** de las dos últimas transferencias (SaldApp: id2→id5 1.00 antes que id2→id4 1.00) |

Notas: en G24 y G25 (13 integrantes, un pagador) y en G26 (20 integrantes) los saldos nuevos son `pagado − parte` con las partes indicadas; en G24 y G25 la liquidación nueva sale en **orden de alta** (`Beto→Ana`, `Carla→Ana`, `Diego→Ana`, …). En G12 y G26 el sobrante deja de perderse: la liquidación cubre todos los saldos.

**Casos nuevos solo de Balance** (monedas y cambio de moneda, D8; no existen en SaldApp). Resultados **calculados** con D1 y D2 en unidades enteras (yenes); cumplen las mismas propiedades (partes suman el total, saldos suman 0).

| Caso | Escenario (grupo en JPY) | Partes | Saldos | Liquidación |
|---|---|---|---|---|
| G35 | 3 participantes; Ana paga 100 | Ana 34, Beto 33, Carla 33 | Ana +66, Beto −33, Carla −33 | Beto→Ana 33; Carla→Ana 33 |
| G36 | 7 participantes; Ana paga 1000 | Ana a Fabio 143; Gina 142 | Ana +857; Beto, Carla, Diego, Elena, Fabio −143; Gina −142 | Beto→Ana 143; Carla→Ana 143; Diego→Ana 143; Elena→Ana 143; Fabio→Ana 143; Gina→Ana 142 |
| G37 | 4 participantes; Ana paga 1001 y Beto 2 | total 1003: Ana, Beto y Carla 251; Diego 250 | Ana +750; Beto −249; Carla −251; Diego −250 | Carla→Ana 251; Diego→Ana 250; Beto→Ana 249 |
| G38 | Gasto de `100.50` en un grupo en JPY | — | — | **400**: más decimales de los que admite la moneda (D4, D8) |
| G39 | Grupo en EUR; 3 participantes; Ana paga 100.00. Un administrador cambia la moneda a USD | Antes y después: 33.34 / 33.33 / 33.33 | Ana +66.66, Beto −33.33, Carla −33.33 (idénticos) | Beto→Ana 33.33; Carla→Ana 33.33 (idéntica). El gasto pasa a ser 100.00 USD, sin conversión |
| G40 | Grupo en USD; Ana paga 100.00. Un administrador cambia la moneda a JPY | En yenes: 34 / 33 / 33 | Ana +66, Beto −33, Carla −33 | Beto→Ana 33; Carla→Ana 33. Los montos no cambian pero **la unidad mínima sí**, por lo que cambian partes y saldos |
| G41 | Grupo en USD; Ana paga 10.50. Se intenta cambiar la moneda a JPY | — | — | **409**: 10.50 no es válido en yenes; no cambia nada. Un miembro que intente cualquier cambio de moneda → 403; con el grupo cerrado → 409 |

**Casos que no cambian** (valen los resultados de §9.2): G01, G06, G07, G08, G09, G15, G16, G19, G20, G22, G29, G30, G31. En los casos con varios pasos (G14, G17, G18) cambian solo los pasos indicados arriba; los demás coinciden con §9.2.

**Casos con tratamiento distinto en Balance**

- **G28 (monto `10.005`).** En SaldApp quedaba indefinido; en Balance es **error 400 de validación** (más de 2 decimales, D4). El paso (b) con `10.01` se evalúa con las reglas normales (ver fila G28).
- **G33 (saldos que no suman cero).** Con D1 el cálculo **nunca** produce saldos que no sumen 0; una entrada así viola un invariante y debe fallar con error explícito, no ignorar el sobrante.
- **G34 (errores de validación y permisos).** Se mantienen y se suman: monto con más decimales de los que admite la moneda → 400 (D4); persona ajena al grupo → **404** (en SaldApp era 409, D3); sin sesión → 401; miembro que registra un gasto con otro pagador, modifica o elimina un gasto ajeno, cambia el pagador, regenera el enlace, nombra administradores, quita participantes, edita la configuración, cierra, reabre o borra el grupo → **403**, y el administrador sí puede (D3); quitar al **último administrador** → 409; borrar un grupo **con gastos** → 409 (D7).
- **G21 (grupo cerrado).** Sigue siendo lectura permitida y escritura rechazada con 409 mientras esté cerrado; en Balance el administrador puede **reabrirlo** (D7) y entonces vuelven las escrituras y los saldos y la liquidación se recalculan con D1/D2.

---

## 10. Experiencia de usuario actual

### 10.1 Flujos críticos

**A. Registrar un gasto** (`FE/pages/GroupPage.jsx`, `FE/components/expense/*`)

1. Inicio → tarjeta «Agregar grupo»: elegir moneda, nombre, descripción (opcional) y fecha de inicio → «Guardar». Navega a `/groups/{id}`.
2. En el grupo, panel «Integrantes»: escribir un nombre → «Guardar» (repetir por cada persona).
3. Panel «Agregar Gasto» (visible mientras el grupo esté abierto): «Pagado por», «Descripción», «Monto», «Fecha del gasto» → «Guardar».
4. Al guardar se recargan el resumen y la tabla de saldos (y la liquidación, si está visible). El formulario queda vacío porque la sección se desmonta durante la carga (`ExpensesSection`: `if (loading) return <LoadingState/>`).
5. **Editar o borrar un gasto:** primero hay que pulsar «Detalles» en el integrante que lo **pagó**; aparece «Gastos de {nombre}» con «Editar»/«Eliminar» (con diálogo de confirmación). Editar no permite cambiar la fecha.

**B. Ver saldos.** La tabla «Integrantes» está siempre visible: `#`, `Nombre`, `Gastado`, `Balance({moneda})`, con verde (a favor) y rojo (en contra) y signo `+` en positivos. La última fila suma «Gastado» y «Balance».

**C. Liquidar.** Botón «Ver liquidación actual» → tabla «Liquidación estimada» (`Quién paga → A quién · Monto`). Para fijar el resultado hay que «Cerrar Grupo» (diálogo: «…Esta acción no se puede deshacer.»); entonces se muestra «Liquidación Final» con la etiqueta «Grupo cerrado». **No hay forma de registrar que una transferencia ya se pagó.**

### 10.2 Textos principales (español con mezcla de inglés; para `strings.ts` de Balance)

| Zona | Textos actuales |
|---|---|
| Inicio | «SaldApp», «División inteligente de gastos grupales», «Ingresar a grupo existente», «ID del grupo», «Ej: 1024», «Ingresar» |
| Grupo (formulario) | «Agregar grupo» / «Editar grupo», «Moneda», «Seleccionar moneda», «Nombre del Grupo», «Ej: Viaje a la Playa», «Descripción» + «(optional)», «Fecha de inicio», «Guardar» / «Guardando...» |
| Grupo (detalle) | «Abierto» / «Cerrado», «Editar», «Cerrar Grupo», «ID del grupo», «Inicio», «Cierre», «Integrantes», «Total de gastos», «Correspondiente p/p» |
| Integrantes | «Agregar integrante» / «Editar integrante», «Nombre», «Gastado», «Balance(₡)», «Acciones», «Detalles», «No hay integrantes en este grupo.», «Agregá el primero usando el formulario.» |
| Gastos | «Agregar Gasto» / «Editar Gasto», «Pagado por», «Seleccionar integrante», «Descripción», «Ej: Peajes de ida», «Monto», «Fecha del gasto», «Gastos de {nombre}», «Descripcion», «Total», «{nombre} no tiene gastos registrados.» |
| Liquidación | «Ver liquidación actual», «Ocultar liquidación», «Liquidación estimada», «Liquidación Final», «Grupo cerrado», «Quién paga», «A quién», «No hay deudas pendientes», «Todos los gastos están equilibrados.» |
| Confirmaciones | «¿Estas seguro de que deseas cerrar el grupo? Esta acción no se puede deshacer.», «…eliminar el gasto?», «…eliminar al integrante?», «Confirmar», «Cancelar» |
| Estados | «Cargando...» ; errores: texto del servidor **en inglés** + `campo: mensaje` |

### 10.3 Problemas evidentes (con evidencia)

1. **No hay forma de encontrar un grupo propio**: sin listado ni cuenta, hay que recordar el ID (`HomePage.jsx`). Los IDs son consecutivos: cualquiera puede abrir grupos ajenos.
2. **Los decimales podrían no poder escribirse**: `ExpenseForm.jsx` usa `<input type="number">` sin `step`; por defecto el navegador solo acepta enteros al enviar el formulario. **[NO VERIFICADO en navegador]**; ver P6.
3. **Sin validación en el cliente** (no hay `required`, `min`, `step` ni `maxLength`): todo error llega del servidor, en inglés (`Description must be between 4 and 500 characters`).
4. **Cálculos de pantalla distintos a los del servidor.** «Correspondiente p/p» = `totalExpenses / integrantCount` sin `HALF_UP` (`GroupDetail.jsx`), formateado después con `Intl` y `Number` de JavaScript; los totales de las tablas se suman con `reduce` en coma flotante (`IntegrantList.jsx`, `ExpenseList.jsx`). Pueden mostrarse diferencias de un centavo frente al servidor. La suma de la columna «Balance» (que puede ser ≠ 0 por el sobrante de redondeo, p. ej. +0.01) se muestra sin explicación.
5. **La columna «Balance» por fila no muestra el símbolo de moneda** (`formatMoney(balance.balance)` sin segundo argumento), aunque el encabezado sí lo trae.
6. **Mensaje engañoso:** «No hay deudas pendientes / Todos los gastos están equilibrados» aparece cuando la liquidación es vacía aunque exista un saldo residual (G11: Ana con +0.01).
7. **Falla silenciosa de liquidación:** si falla la carga, `SettlementSection` renderiza `<ErrorMessage />` **sin pasar el error**, que no muestra nada (`SettlementSection.jsx`).
8. **Editar/borrar gastos exige conocer al pagador** (`Detalles`); no hay lista de todos los gastos del grupo, y la lista por integrante no tiene orden definido (el servidor no ordena).
9. **Parpadeo y pérdida de contexto:** cada recarga reemplaza todo el panel por «Cargando...» (`IntegrantsSection`, `ExpensesSection`).
10. **Moneda editable con datos cargados**, con símbolos con espacios finales en la lista (`'CHF '`, `'$U '`, `'Q '`, `'L '`) y sin código ISO.
11. **Accesibilidad:** `ConfirmDialog` sin `role="dialog"`, sin foco gestionado ni cierre con Esc; `<html lang="en">` y título «saldapp-frontend» (`index.html`); errores solo con color; etiquetas con errores de clase CSS (`clasName` en `GroupForm.jsx`, `focus-ring-1` en lugar de `focus:ring-1` en varios inputs). Sin pruebas de 320 px/texto «Muy grande».
12. **Redacción:** voseo («Agregá…»), tildes faltantes («Estas», «Descripcion»), mezcla de inglés («(optional)»). Incompatible con la guía de Pastel (trato de usted/impersonal, sin voseo).
13. **Cierre irreversible sin «reabrir»**; no se puede corregir un error tras cerrar.
14. **Sin concurrencia:** dos personas editando el mismo grupo se pisan sin aviso (no hay versión).

> **Resolución en Balance (§12):** los puntos 1 y 14 se atienden con D3 (sesión, «Mis grupos», pertenencia) y el control de edición simultánea de la ficha; los puntos 2, 3, 4 y 5 con **D4** (campo de monto con decimales, validación en cliente y servidor, totales calculados por el servidor); el punto 10 con **D8** (moneda ISO fija por grupo); el punto 13 con **D7** (se puede reabrir un grupo cerrado); el resto figura en §12.11.

---

## 11. Riesgos y preguntas abiertas para el propietario

### 11.1 Riesgos

| # | Riesgo | Evidencia | Impacto en Balance / recomendación |
|---|---|---|---|
| R1 | **Desempates no deterministas** (montículo de Java + `HashMap`) | §4.3, G05, G12, G24, G25 | **Resuelto por D2:** orden total (mayor monto primero, luego orden de alta) con `ORDER BY` explícito; las pruebas comparan el neto por persona y el orden exacto de §9.3 |
| R2 | **Los centavos sobrantes no se asignan** y los saldos no suman cero | §4.4, G02, G03, G10–G12, G26 | **Resuelto por D1:** un centavo a cada participante por orden de alta; partes y saldos suman exacto. Ficha actualizada |
| R3 | **Reparto retroactivo y sin participación parcial** | §4.1, G18, G19 | **Aceptado (D6):** se reproduce en Balance; no habrá participación parcial |
| R4 | **Sin autenticación ni dueño de los grupos** | §5, §6 | **Resuelto por D3:** Balance exige sesión, pertenencia y roles; el creador es el administrador |
| R5 | **Esquema sin migraciones (`ddl-auto: update`)** | `application*.yaml` | **Sin objeto (D5):** no se importan datos; el esquema real de SaldApp ya no condiciona a Balance |
| R6 | **Montos sin límite de decimales ni dígitos** | §3.3, G28 | **Resuelto por D4** (validación de los decimales de la moneda en cliente y servidor); sin datos previos que depurar (D5) |
| R7 | **Moneda como símbolo ambiguo** | §2 | **Resuelto por D8:** moneda ISO 4217 por grupo, con decimales propios; la interfaz muestra código y símbolo |
| R8 | **Fechas sin zona horaria** (`timestamp`) y `endDate` del servidor | §3.1 | **Resuelto por D9:** zona IANA por grupo (`America/Costa_Rica` por defecto), instantes en UTC y fecha del gasto como fecha de calendario |
| R9 | **Cobertura de pruebas mínima** | §1 | Solo existe el calculador probado; las pruebas doradas de §9 son la única referencia ejecutable de las reglas |
| R10 | **Código de error distinto al exigido por la ficha** | §5 | SaldApp responde 409 al usar IDs de otro grupo; la ficha exige 404 y 409 por edición simultánea. Son cambios **intencionales** de Balance: registrarlos como tales |
| R11 | **Orden de filas sin `ORDER BY`** | `IntegrantRepositoryAdapter.findAllByGroup` | Puede alterar el orden de empates entre lecturas **[SUPOSICIÓN, no reproducido]** |
| R12 | **Cálculos de pantalla en coma flotante** | §10.3 (4) | Balance no debe replicarlo: mostrar los valores del servidor |

**Estado tras las decisiones del 2026-10-20:** R1 → resuelto por **D2**; R2 → resuelto por **D1**; R3 → **aceptado** (el reparto retroactivo se mantiene, **D6**); R4 → resuelto por **D3**; R5, R6 y la parte de datos de R7 → **sin objeto** por **D5**, y R6 queda además cubierto por **D4**; R7 → resuelto por **D8** (moneda ISO por grupo); R8 → resuelto por **D9** (zona horaria por grupo); R11 → cubierto por **D2** (`ORDER BY` explícito); R12 → resuelto por **D4**; R9 y R10 siguen vigentes (R10: son cambios intencionales de Balance, registrados en §12).

### 11.2 Preguntas abiertas

**Respondidas por el propietario (registro).**

| Pregunta | Respuesta | Dónde quedó |
|---|---|---|
| P1, P2, P8, P11, P17 (datos y grupos existentes de SaldApp, volcados, administradores de grupos heredados, API vieja, grupos cerrados) | **Sin objeto:** no hay grupos existentes; Balance **inicia desde cero** | D5, §12.5 |
| P3 / P14 — centavos | Sí se asignan; **un centavo a cada participante por orden de alta** | D1, §12.1 |
| P4 / P16 — desempates | **Mayor monto primero y, en empate, orden de alta** | D2, §12.2 |
| P6 — campo de monto | Se corrige para admitir decimales | D4, §12.4 |
| P10 — compartir grupos | Solo con el **enlace y el código** que comparte el administrador; el ID deja de ser llave | D3, §12.3 |
| P15 / P20 — permisos dentro del grupo | El **miembro** registra, modifica y elimina **solo sus** gastos; el **administrador**, los de **todo el grupo**. **Todos los miembros ven todos los gastos y saldos.** Quitar participantes, editar la configuración y cerrar el grupo son **solo del administrador**. **Solo el administrador** puede cambiar el pagador de un gasto a otra persona | D3, §12.3 |
| P18 (a) — confirmación | **No hace falta** un paso de confirmación del administrador: quien tiene el enlace y el código correctos ingresa con su cuenta | D3, §12.3 |
| P18 (b) — cómo se invita | **Enlace** que el administrador copia y envía por su cuenta, más un **código de 4 dígitos** para ingresar al grupo, **siempre visibles para el administrador**. La **invitación por correo** vale la pena pero **queda para después** | D3, §12.3 |
| P18 (c) — participantes sin cuenta | **No:** la cuenta es necesaria | D3, §12.3 |
| P21 — supuestos | (a) Reabrir y borrar un grupo: **solo el administrador** (equivale al dueño; puede haber varios). (b) La **moneda se puede corregir** (solo el administrador): todos los gastos pasan a la nueva moneda **sin conversión** (10 EUR → 10 USD). (c) La fecha de un gasto la edita quien puede modificarlo. (d) Monedas de 3 o más decimales **fuera** | D3, D7, D8 |
| P22 (a), (b), (c), (e) — enlace y código | El administrador **sí puede regenerarlos**; **no vencen**; límite de **5 intentos fallidos** (con bloqueo temporal de 15 minutos y límite por IP); un miembro **puede salir** por sí mismo si **no tiene gastos** | D3, §12.3 |
| P22 (d) — persona sin cuenta | Página que dice que **necesita registro** y que debe **marcar la app Balance** al registrarse; luego se la lleva a la **página de registro**. Queda documentado que Balance podría enviar un dato para **preseleccionar la casilla** sin dañar la arquitectura; **lo evalúa el agente correspondiente** | D3, §12.3 (punto 9), P23 |
| Renombrar «Liquidación Final» | **Aceptado:** se titula «Liquidación (grupo cerrado)» | D7, §12.7 |
| P19 — administradores | **Puede haber varios**; **siempre debe quedar al menos uno**; un administrador puede **nombrar** a otros administradores y **quitarles** la administración | D3, §12.3 |
| P5 — reparto | **Se mantiene el reparto retroactivo; no hay participación parcial** | D6, §12.6 |
| P7 — liquidar y reabrir | Solo se **muestran transferencias sugeridas** (no se registran pagos). **Sí se pueden reabrir** los grupos cerrados | D6, D7 |
| P9 — monedas | **Catálogo aprobado** y debe implementarse **correctamente**: moneda ISO 4217 asignada al crear el grupo, gastos en esa moneda, validado contra datos ISO (§12.8) | D8, §12.8 |
| P12 — borrar grupos y fechas | Solo se pueden **borrar grupos sin gastos**; **sí se puede editar la fecha** de un gasto | D7, §12.7 |
| P13 — zona horaria | **Por defecto Costa Rica**; los administradores pueden cambiarla | D9, §12.9 |

**Pendiente (no es una pregunta para el propietario).**

- **P23 — evaluación técnica del agente de Identity/plataforma.** ¿Puede la página de registro de la plataforma recibir de Balance un dato (por ejemplo, el módulo solicitado) que **preseleccione automáticamente la casilla de la app Balance**, y conservar el retorno al ingreso del grupo, **sin dañar la arquitectura**? Evidencia en la rama `refactor/modular-foundation` (base de las implementaciones; `dev` está desactualizada): el inicio de sesión ya admite un `returnUrl` interno con validación (`web/src/modules/identity/returnUrl.ts`: solo rutas internas cuyo primer segmento esté en una lista, **`balance` incluido**) y prioridad sobre cualquier preferencia (`docs/product/PASTEL-PRODUCT-AND-UX.md` §10.3); el registro es `/login?modo=registro` y hoy su formulario solo pide nombre, correo y contraseña; **la selección de apps al registrarse está prevista** (mismo documento, §7 y §10.4: catálogo con Ágora obligatoria y Balance opt-in) pero **aún no existe**, y el autorregistro local está activo solo en el perfil de desarrollo (CCR-008). Criterios que debe cumplir en §12.3 (punto 9). Mientras no se evalúe, la página informativa pide marcar Balance manualmente.

---

## 12. Decisiones de migración: qué cambia en Balance respecto a SaldApp

**Principio.** El objetivo es una buena migración, no una copia. Las secciones 1 a 11 describen **SaldApp tal como es**; esta sección fija **qué se corrige o mejora en Balance**. Todo lo que figura aquí como **Aprobado** fue indicado por el propietario (2026-10-20); no quedan preguntas pendientes para el propietario; queda una evaluación técnica de la plataforma (P23). `docs/modules/BALANCE.md` se actualizó para no contradecir esta sección (§12.10).

| ID | Cambio | SaldApp (hoy) | Balance (destino) | Estado |
|---|---|---|---|---|
| **D1** | Los centavos sobrantes **sí se asignan**, una unidad mínima a cada participante **por orden de alta** | No se asignan: las partes no suman el total y los saldos no suman cero (§4.4) | Las partes suman **exactamente** el total y los saldos **exactamente 0** | **Aprobado** |
| **D2** | La liquidación es **determinista**: mayor monto primero y, en empate, orden de alta | Orden y desempates dependen de `PriorityQueue` y `HashMap` (§4.3) | Orden total definido; mismo resultado sin importar el orden de entrada ni el de la base de datos | **Aprobado** |
| **D3** | **Autenticación, pertenencia y roles de grupo**: cuenta obligatoria, varios administradores (dueños; siempre al menos uno), miembros que gestionan solo sus gastos y **ingreso por enlace y código de 4 dígitos** | Sin autenticación; el ID del grupo es la llave (§5, §6) | Sesión de Pastel; el creador es administrador; el administrador comparte enlace y código; la persona entra con su cuenta | **Aprobado** (evaluación técnica: P23) |
| **D4** | **Corregir el campo de monto** y validar el dinero | `type="number"` sin `step` (posible bloqueo de decimales), sin validación (§3.3, §10.3) | Montos con los decimales de la moneda del grupo, en cliente y servidor | **Aprobado** |
| **D5** | **Balance inicia desde cero** | — | No hay importación ni migración de datos; SaldApp es referencia de lógica y de experiencia | **Aprobado** |
| **D6** | Se **mantiene el reparto retroactivo**; **sin participación parcial**; la liquidación solo **muestra transferencias sugeridas** | Igual (§4.1, §2) | Igual; no se registran pagos | **Aprobado** |
| **D7** | **Ciclo de vida del grupo:** cerrar y **reabrir**; borrar solo grupos **sin gastos**; **editar la fecha** de un gasto; tabla «Liquidación (grupo cerrado)» | Cierre irreversible; no se borran grupos; la fecha no se edita; «Liquidación Final» (§2) | Reabrir y borrar (sin gastos) por el administrador; fecha editable | **Aprobado** |
| **D8** | **Moneda ISO 4217 por grupo**, asignada al crear y **corregible por el administrador sin conversión**; catálogo validado contra ISO 4217 | Símbolo libre (≤ 5 caracteres), editable en cualquier momento sin reglas (§3.1) | Catálogo ISO con decimales por moneda; cambiar la moneda reexpresa todos los gastos (10 EUR pasan a 10 USD) | **Aprobado** |
| **D9** | **Zona horaria por grupo**, por defecto Costa Rica, editable por administradores | Fechas sin zona horaria (§3.1) | Zona IANA por grupo (`America/Costa_Rica` por defecto) | **Aprobado** |

### 12.1 D1 — Asignación de los centavos sobrantes

**Regla** (reemplaza `redondear_mitad_arriba(total / n, 2)` de §4.1; el cálculo se hace en **unidades mínimas enteras** de la moneda del grupo: centavos en las monedas de 2 decimales y unidades enteras en las de 0 decimales como el yen, D8):

```
partes(grupo):
    n        = participantes del grupo, en orden de alta (posición 0 … n−1)
    total_u  = Σ monto de todos los gastos, en unidades mínimas enteras   # los montos respetan los decimales de la moneda (D4)
    base     = total_u DIV n          # cociente entero
    r        = total_u MOD n          # unidades que sobran, 0 ≤ r < n
    parte[i] = base + 1   si posición(i) < r        # una unidad extra a los primeros r participantes
             = base       en otro caso
saldo[i] = pagado[i] − parte[i]
```

**Orden de alta.** Es el orden en que cada persona **ingresó** al grupo: el creador es el primero y quien se une con el enlace y el código se agrega al final; si dos coinciden, se desempata por identificador. Como la cuenta es obligatoria, no hay participantes sin cuenta ni pendientes. El creador, al ser siempre el primero, **recibe la primera unidad extra** cuando sobra alguna. Se obtiene con un `ORDER BY` explícito, nunca del orden en que la base devuelve filas.

**Propiedades garantizadas** (probadas en 5 000 escenarios aleatorios de 1–25 participantes con monedas de 2 decimales, y en 3 000 más con monedas de 0 y de 2 decimales): `Σ partes = total` exacto; `Σ saldos = 0` exacto; dos partes cualesquiera difieren **a lo sumo 1 unidad mínima**; no se usa `double`.

**Ejemplos** (resultados completos en §9.3):

- ₡100.00 entre 3 (G02): `10000 DIV 3 = 3333`, `MOD = 1` → partes `33.34 / 33.33 / 33.33` (suman 100.00). Saldos con Ana pagadora: `+66.66 / −33.33 / −33.33` (suman 0.00).
- ₡200.00 entre 3 (G03): `20000 DIV 3 = 6666`, `MOD = 2` → `66.67 / 66.67 / 66.66`.
- ₡0.05 entre 2 (G10): `5 DIV 2 = 2`, `MOD = 1` → `0.03 / 0.02`.
- ₡0.01 entre 3 (G11): partes `0.01 / 0.00 / 0.00`; el saldo de quien pagó queda en `0.00` y ya no aparece un residuo sin liquidar.
- ¥100 entre 3 (G35, yen: 0 decimales): `100 DIV 3 = 33`, `MOD = 1` → partes `34 / 33 / 33`.

**Consecuencias.**

- Se retira el principio «reglas de redondeo idénticas a las actuales» de la ficha (ya actualizada). Es un cambio aprobado y deliberado.
- La liquidación ya no deja saldo sin cobrar: se cumple el invariante «al terminar, ambas listas están vacías». La implementación debe **fallar con error explícito** si el invariante se rompe, en lugar de ignorarlo (hoy SaldApp lo ignora en silencio).
- Como no hay datos previos (D5), no hay saldos anteriores que recalcular ni conciliar.

### 12.2 D2 — Liquidación determinista

**Regla** (misma estrategia codiciosa que hoy, con orden **total** en lugar de montículo):

```
liquidar(saldos, orden_alta):
    deudores   = participantes con saldo < 0, ordenados por (deuda DESC, posición_alta ASC)
    acreedores = participantes con saldo > 0, ordenados por (crédito DESC, posición_alta ASC)
    mientras haya deudores Y acreedores:
        d = primero(deudores) ; c = primero(acreedores)
        monto = mín(deuda(d), crédito(c))                  # en unidades mínimas enteras
        registrar  d → c : monto
        restar monto a ambos; quitar de su lista a quien quede en 0;
        reubicar a quien quede con saldo usando la MISMA clave de orden
    # invariante (D1): al terminar no queda nadie con saldo
```

**Requisitos de determinismo.**

1. El orden de alta sale de un `ORDER BY` explícito; **nunca** del orden en que la base devuelve filas.
2. El resultado **no debe cambiar** si se permuta el orden de los saldos de entrada (probado con permutaciones en 5 000 escenarios).
3. Sin estructuras de iteración no ordenada (`HashMap`, `Set`) en el camino del cálculo.
4. Los montos de las transferencias son enteros en unidades mínimas, convertidos a decimal solo al presentar.

**Relación con SaldApp.** Donde SaldApp **no tenía empates** y los saldos sumaban 0, el resultado coincide con el actual (G01, G06–G09, G15, G16, G19, G20, G22, G29–G31). Donde había empates (G05, G12, G24–G26, G32) cambia **el orden** y, a veces, **quién paga a quién**, pero cada persona sigue pagando o recibiendo el mismo neto (§9.3). El algoritmo sigue sin minimizar el número de transferencias (G32: 4 en lugar de 3); minimizarlas sería un cambio aparte (§12.11).

### 12.3 D3 — Autenticación, pertenencia, roles e ingreso por enlace y código

Balance cuenta con autenticación de Pastel; **ningún dato ni endpoint de Balance puede quedar abierto**.

1. **Sesión obligatoria** en todo endpoint (inicio de sesión con Google, cookie `HttpOnly`); la autorización se verifica **siempre en el servidor**, nunca solo en la interfaz.
2. **Permisos de plataforma:** `balance.access` para usar el módulo y `balance.groups.manage` sobre los grupos de los que la persona forma parte (rol sugerido `Balance — Usuario`). Cualquier persona con ese rol puede crear grupos.
3. **Se elimina el ID como llave de acceso.** Desaparece «Ingresar a grupo existente por ID»; se reemplaza por **«Mis grupos»**. Un grupo del que no se es miembro **no existe** para esa persona: responde **404** (en SaldApp era 409).
4. **Roles dentro del grupo** (datos del dominio, no roles de plataforma). Quien crea el grupo es su primer administrador; **puede haber varios administradores y siempre debe quedar al menos uno**.

| Acción | Administrador | Miembro |
|---|---|---|
| Crear un grupo | Quien lo crea queda como **administrador** | — |
| Ver el grupo, participantes, **todos** los gastos, saldos y liquidación | Sí | Sí |
| **Registrar** un gasto | Sí, con **cualquier** participante como pagador | Sí, **solo con él mismo como pagador** |
| **Modificar** (incluida la fecha) o **eliminar** un gasto | Sí, **cualquiera** del grupo | Solo los **propios** (pagador = él) |
| **Cambiar el pagador** de un gasto a otra persona | Sí | No |
| Ver el **enlace y el código de 4 dígitos** de ingreso (siempre visibles) | Sí | No |
| **Regenerar** el enlace y el código (invalida los anteriores; si no se regeneran, **no vencen**) | Sí | No |
| **Salir** del grupo por sí mismo (solo si no tiene gastos; el último administrador no puede) | Sí | Sí |
| **Nombrar o quitar administradores** | Sí (siempre debe quedar al menos uno) | No |
| Quitar participantes (solo si no tienen gastos) | Sí | No |
| Editar nombre, descripción, **moneda** (sin conversión, D8) y zona horaria del grupo | Sí | No |
| **Cerrar** y **reabrir** el grupo | Sí | No |
| **Borrar** el grupo (solo si no tiene gastos) | Sí | No |
| Escribir en un grupo **cerrado** | No (409; primero hay que reabrirlo) | No (409) |

   El administrador equivale al **dueño** del grupo (puede haber varios). Reabrir, borrar y cambiar la moneda son acciones **solo del administrador**; la fecha de un gasto la edita quien puede modificar ese gasto. Quien no es miembro y tiene el enlace y el código puede **unirse** si tiene sesión y `balance.access`.

5. **Ingreso por enlace y código.** Cada grupo tiene un **enlace de ingreso** y un **código de 4 dígitos**, **siempre visibles para los administradores**. El administrador copia el enlace y lo envía por su cuenta a quien quiera invitar. La persona abre el enlace, **inicia sesión con su cuenta de Pastel** (la cuenta es obligatoria: no hay participantes solo con nombre), escribe el código y queda como **miembro**; su participante se crea en ese momento (orden de alta = orden de ingreso). Requisitos de seguridad: (a) el enlace lleva un **token aleatorio no adivinable** (al menos 128 bits), nunca el ID del grupo; (b) el código tiene solo 10 000 combinaciones, por lo que se exige **límite de intentos**: **5 fallos por cuenta y grupo y bloqueo de 15 minutos** (aprobado), más un límite por IP, con respuesta 429 y `Retry-After` (`docs/SECURITY.md`); un ingreso correcto reinicia el contador; (c) token inválido, código incorrecto o enlace regenerado responden **con el mismo error genérico**, sin revelar si el grupo existe; (d) el token y el código **no se registran en logs** (misma redacción que `code` y `state` de OAuth) y el enlace debe evitar que el token quede en registros de acceso, por ejemplo viajando en el fragmento `#` o en el cuerpo de la petición (se decide en el ADR); (e) cada ingreso y cada regeneración se **auditan**; (f) quien ingresa necesita `balance.access`; si no lo tiene o no tiene cuenta, ver el punto 9; (g) **el enlace y el código no vencen**: solo dejan de servir cuando un administrador los **regenera** (aprobado). La **invitación por correo** vale la pena pero **queda para una fase posterior** (la plataforma no envía correos todavía).
6. **Invariante de administración.** Ninguna operación puede dejar un grupo **sin administradores**: quitar la administración a alguien, que un administrador deje el grupo o lo quiten como participante se rechazan con 409 si era el último (código propuesto `balance.group.last_admin`). **Salir del grupo:** cualquier participante, administrador o miembro, puede salir por sí mismo **solo si no tiene gastos registrados** (si los tiene, 409, código propuesto `balance.participant.has_expenses`, el mismo criterio que para quitar participantes); al salir pierde el acceso, queda auditado y puede volver a ingresar con el enlace y el código vigentes, al final del orden de alta. La verificación es **atómica** (una sola transacción con bloqueo o control de versión), para que dos administradores que se quitan el cargo a la vez no dejen el grupo vacío de administradores.
7. **Sin escalada indebida:** el administrador concede la administración porque la tiene; un miembro nunca puede concederla.
8. **Pruebas de acceso obligatorias:** persona ajena a un grupo → 404 en lectura y escritura de todos sus recursos; enlace o código incorrectos → el mismo error genérico; tras 5 intentos fallidos → bloqueo de 15 minutos (429 con `Retry-After`); salir con gastos → 409, salir sin gastos → permitido, el último administrador no puede salir (409);  un enlace regenerado deja de servir; un miembro no ve el enlace ni el código; sin sesión → 401; sin `balance.access` → 403; miembro que registra un gasto con otro pagador, modifica o elimina un gasto ajeno, cambia el pagador, regenera el enlace, nombra administradores, quita participantes, edita la configuración, cierra, reabre o borra el grupo → 403, y el administrador sí puede; quitar al último administrador (incluida la carrera entre dos administradores) → 409; cualquier escritura en grupo cerrado → 409.
9. **Persona sin cuenta o sin acceso a Balance (aprobado).** Quien abre el enlace **sin sesión** ve una **página informativa** que le dice que **necesita registrarse** y que debe **asegurarse de marcar la app Balance** al hacerlo; después se la lleva a la **página de registro** de la plataforma. Se agrega, para quien ya tiene cuenta, un enlace secundario «Ya tengo cuenta» que lleva al inicio de sesión (adición de la investigación). Al terminar el registro o el inicio de sesión se **regresa al ingreso del grupo** para escribir el código, conservando el enlace sin dejar el token en logs (URL de retorno relativa y permitida; mecanismo en el ADR). La página es **la misma para cualquier enlace**, válido o no, y **no revela** si el grupo existe. Quien ya tiene sesión pero **no tiene acceso a Balance** ve un mensaje equivalente que le indica cómo obtenerlo (lo define la plataforma).
   **Preselección automática de la casilla (documentado para evaluación, P23).** Al redirigir desde Balance, la aplicación **podría enviar a la página de registro un dato** (por ejemplo, el módulo solicitado) para que la casilla de Balance aparezca marcada sin intervención de la persona. **La evalúa el agente que corresponda (Identity/plataforma)** y solo se acepta si **no daña la arquitectura**: (a) contrato **genérico de la plataforma**, sin código específico de Balance dentro de Identity ni archivos compartidos modificados por Balance, respetando la arquitectura modular (`docs/ARCHITECTURE.md`); (b) solo URL de retorno **relativa y permitida** (la plataforma ya valida el `returnUrl` interno) y módulos del **catálogo** validados, sin redirecciones abiertas, y **sin llevar el token del grupo dentro del `returnUrl`** (iría en la consulta y quedaría en registros); (c) la casilla es **solo una preselección de la interfaz**: el acceso lo concede el servidor según las reglas de la plataforma (denegar por defecto), y la persona ve y puede cambiar la selección; (d) el dato enviado no contiene el token ni el código del grupo; (e) sin la mejora, el flujo funciona igual con la instrucción en pantalla.

### 12.4 D4 — Campo de monto y validación del dinero

**Problema en SaldApp.** `ExpenseForm.jsx` usa `<input type="number">` **sin `step`**; por defecto los navegadores solo aceptan enteros al enviar el formulario, por lo que valores como `12.50` pueden ser rechazados **[NO VERIFICADO en navegador]**. No hay validación en cliente y el servidor no limita decimales (§3.3).

**Corrección requerida en la interfaz de Balance.**

1. El campo acepta montos con **los decimales de la moneda del grupo** (2 en la mayoría; 0 en yen, peso chileno, won y guaraní, D8) y admite coma o punto como separador decimal (es-CR); se muestra con el formato de la moneda del grupo.
2. Abre el teclado numérico con decimales en móvil (`inputMode="decimal"`, o `numeric` si la moneda no tiene decimales); si se usa `type="number"`, el `step` debe corresponder a la moneda (`0.01` o `1`) y `min` a la unidad mínima.
3. **Validación en cliente** con mensajes en español, junto al campo (no solo color): vacío, ≤ 0, más decimales de los que admite la moneda, mayor al máximo permitido.
4. La misma regla aplica **a crear y a editar** gastos, y a cualquier otro campo de dinero.
5. Los totales y la parte por persona se **muestran tal como los calcula el servidor**; se elimina el cálculo en coma flotante de JavaScript (§10.3, punto 4).

**Corrección requerida en el servidor.**

1. Monto `> 0`, **con a lo sumo los decimales de la moneda del grupo** y dentro del máximo de `numeric(18,2)`; si no, error **400** con código de validación explícito (nunca redondeo silencioso ni error 500).
2. Cálculo en `decimal`/unidades mínimas enteras, nunca `double`.
3. El caso G28 (monto `10.005`), indefinido en SaldApp, es en Balance un **error de validación** (§9.3).

**Criterios de aceptación.** En un grupo en colones se puede guardar `12.50`, `12,50`, `0.01` y el máximo permitido; se rechazan `12.505`, `0`, `-5`, vacío y texto, con mensaje claro; en un grupo en yenes se acepta `1500` y se rechaza `100.50`; en edición se conserva el valor; el equivalente de G28 devuelve 400; prueba de interfaz en móvil.

### 12.5 D5 — Balance inicia desde cero

No existen grupos ni datos de SaldApp que conservar. Consecuencias:

- **No hay importación, extracción ni conciliación «antes y después».** Se retiran los criterios de importación de la ficha y no se requiere acceso a la base de SaldApp.
- **No se necesitan mapeos heredados:** símbolos de moneda de SaldApp → ISO, zona horaria de datos viejos, administradores de grupos existentes, ni recálculo de grupos cerrados.
- **SaldApp queda como referencia** de las reglas de cálculo, de los flujos y de la experiencia, y de fuente de los casos dorados (§9). Su retiro o conservación no afecta a Balance.
- Las pruebas de arranque son sobre base vacía (como el resto de la plataforma).

### 12.6 D6 — Reparto retroactivo, sin participación parcial, transferencias sugeridas

- **Se mantiene el reparto retroactivo:** las partes se calculan sobre **todos** los participantes del grupo en el momento de calcular, de modo que quien se agrega después paga su parte de **todos** los gastos anteriores (G18) y quitar a alguien (solo si no tiene gastos) sube la parte de los demás (G19). Cada persona **cuenta** en el reparto desde que ingresa al grupo (no hay participantes pendientes ni sin cuenta).
- **No hay participación parcial:** todo gasto se divide en partes iguales entre todos los participantes; no se puede excluir a nadie de un gasto.
- **Liquidar = mostrar transferencias sugeridas.** Balance no registra pagos ni «marcar como pagado»; la liquidación se **recalcula en cada lectura** a partir de los gastos (igual que SaldApp), por lo que no hay saldo «ya pagado» que conservar al reabrir un grupo.

### 12.7 D7 — Ciclo de vida del grupo y fechas de gastos

1. **Cerrar y reabrir.** El administrador puede cerrar un grupo (solo lectura: saldos y liquidación se siguen calculando) y **reabrirlo**; al reabrir vuelven a permitirse las escrituras y los saldos y la liquidación se recalculan. El cierre y la reapertura se **auditan** (quién, cuándo, antes/después), según la ficha. Como el cierre ya no es definitivo, la tabla se titula «Liquidación (grupo cerrado)» y no «Liquidación Final» (aprobado).
2. **Borrar un grupo solo si no tiene gastos.** Si tiene al menos un gasto, se rechaza con 409 (hay que eliminar los gastos antes). Al borrar un grupo sin gastos se eliminan también sus participantes, su enlace y su código y se deja registro de auditoría. Requiere confirmación explícita en la interfaz.
3. **La fecha de un gasto se puede editar** (en SaldApp no). La editan quienes pueden modificar ese gasto (D3). No se validan límites respecto a las fechas del grupo, igual que SaldApp.
4. Ninguna de estas acciones es posible para quien no sea administrador, salvo editar la fecha de sus propios gastos (confirmado).

### 12.8 D8 — Moneda ISO 4217 por grupo

1. **Elección.** La moneda se **elige al crear el grupo** de un catálogo ISO 4217 y todos los gastos del grupo se registran **en esa moneda**; no hay conversión ni multimoneda (fuera de alcance en la ficha). Se sugiere preseleccionar CRC, sin dejar de exigir que quede guardada explícitamente.
2. **Decimales por moneda.** Cada moneda tiene un número de decimales (exponente ISO): 2 en la mayoría y **0** en JPY, CLP, KRW y PYG. D1, D2 y D4 usan **unidades mínimas enteras** y ese exponente (la columna sigue siendo `numeric(18,2)`; en monedas de 0 decimales se guardan enteros). Quedan **fuera** las monedas de 3 o más decimales (BHD, IQD, JOD, KWD, LYD, OMR, TND) y las unidades de cuenta y fondos (por ejemplo CLF).
3. **Catálogo (aprobado por el propietario).** Lista destacada, en este orden de uso esperado; el resto de las monedas ISO activas de 0 o 2 decimales, sin fondos, metales ni unidades de cuenta, se ofrece después alfabéticamente. Los símbolos son ambiguos (varios países usan `$`), por lo que la interfaz muestra siempre el **código junto al símbolo**. **Validación realizada (2026-10-20):** los 41 códigos de la lista existen en ISO 4217 y su número de decimales coincide con los datos ISO 4217 del JDK 21 y con fuentes públicas de referencia (ISO 4217 define CLP con 0 decimales, aunque algunos procesadores de pago usen 2). Los nombres y símbolos de la tabla son orientativos.

| Código | Moneda | Símbolo | Decimales |
|---|---|---|---|
| CRC | Colón costarricense | ₡ | 2 |
| USD | Dólar estadounidense | $ | 2 |
| EUR | Euro | € | 2 |
| MXN | Peso mexicano | $ | 2 |
| COP | Peso colombiano | $ | 2 |
| ARS | Peso argentino | $ | 2 |
| CLP | Peso chileno | $ | **0** |
| UYU | Peso uruguayo | $U | 2 |
| DOP | Peso dominicano | RD$ | 2 |
| CUP | Peso cubano | $ | 2 |
| PHP | Peso filipino | ₱ | 2 |
| JPY | Yen japonés | ¥ | **0** |
| CNY | Yuan renminbi chino | ¥ | 2 |
| KRW | Won surcoreano | ₩ | **0** |
| PEN | Sol peruano | S/ | 2 |
| BRL | Real brasileño | R$ | 2 |
| GTQ | Quetzal guatemalteco | Q | 2 |
| HNL | Lempira hondureño | L | 2 |
| NIO | Córdoba nicaragüense | C$ | 2 |
| PAB | Balboa panameño | B/. | 2 |
| PYG | Guaraní paraguayo | ₲ | **0** |
| BOB | Boliviano | Bs. | 2 |
| VES | Bolívar venezolano | Bs.S | 2 |
| CAD | Dólar canadiense | $ | 2 |
| GBP | Libra esterlina | £ | 2 |
| CHF | Franco suizo | CHF | 2 |
| SEK / NOK / DKK | Coronas sueca, noruega, danesa | kr | 2 |
| PLN | Esloti polaco | zł | 2 |
| AUD / NZD / SGD / HKD | Dólares australiano, neozelandés, singapurense, de Hong Kong | $ | 2 |
| INR | Rupia india | ₹ | 2 |
| THB | Baht tailandés | ฿ | 2 |
| TRY | Lira turca | ₺ | 2 |
| ZAR | Rand sudafricano | R | 2 |
| AED | Dírham de los Emiratos Árabes Unidos | AED | 2 |
| ILS | Nuevo shéquel israelí | ₪ | 2 |

4. **Implementación correcta (requisito).** (a) La fuente de verdad es la **lista oficial vigente de ISO 4217** (Tabla A.1, mantenida por SIX); el catálogo se carga como **datos versionados** (código, número, nombre en español, decimales) y no como lista fija en la interfaz. (b) Una **prueba automática** compara cada moneda del catálogo con esa lista (existencia y decimales) y falla si hay diferencias. (c) Los símbolos se obtienen del formateo regional del navegador (`Intl.NumberFormat`, es-CR), mostrando siempre el código ISO junto al símbolo. (d) Queda documentado cómo actualizar el catálogo cuando ISO publique una enmienda.
5. **Cambiar la moneda de un grupo (corrección de errores).** Solo un administrador y con el grupo abierto. El cambio **reexpresa todos los gastos** del grupo en la nueva moneda **sin ninguna conversión**: los montos no cambian (10 EUR pasan a ser 10 USD), pensado para corregir un error de captura. Reglas: (a) si algún monto tiene más decimales de los que admite la nueva moneda (por ejemplo 10.50 al pasar a yenes), el cambio se **rechaza** con 409 (código propuesto `balance.group.currency_decimals_incompatible`) y no cambia nada; (b) es **atómico** (una transacción, con control de edición simultánea) y se **audita** (quién, cuándo, moneda anterior y nueva, cantidad de gastos); (c) la interfaz pide confirmación indicando que **no se convierte ningún monto**; (d) como la unidad mínima puede cambiar, las partes y los saldos se recalculan en la nueva unidad (G39–G41).

### 12.9 D9 — Zona horaria por grupo

- Cada grupo tiene una **zona horaria** (identificador IANA) con valor por defecto **`America/Costa_Rica`**. Los **administradores** pueden cambiarla; los miembros no.
- Se recomienda almacenar los instantes (creación, cierre, reapertura, auditoría) en UTC (`timestamptz`) y mostrarlos en la zona del grupo, y guardar la **fecha del gasto como fecha de calendario** (`date`, sin hora), con lo que cambiar la zona no altera las fechas de los gastos. La «fecha de hoy» por defecto al registrar un gasto se toma de la zona del grupo.
- Se valida que el identificador sea una zona IANA válida.

### 12.10 Efecto sobre pruebas y documentación

- **Casos dorados.** §9.2 es la **referencia de SaldApp («antes»)**; §9.3 fija el **resultado esperado en Balance** donde cambia y agrega casos nuevos para monedas sin decimales (G35–G41). Los casos sin cambio valen según §9.2. Las pruebas de Balance cubren además las propiedades de D1 y D2 (sumas exactas, permutación de entrada, invariante final), las pruebas de acceso de D3 (incluido el último administrador), el ciclo de vida de D7, las monedas de D8 y los criterios de D4.
- **`docs/modules/BALANCE.md` actualizado** en esta misma rama, con autorización expresa del propietario, para que no contradiga el inventario: §1, §2 (matriz de permisos de grupo con varios administradores), §3 (principios de corrección del cálculo, dinero y unidad mínima por moneda, liquidación determinista, datos desde cero, identidad e invitaciones, interfaz con monto decimal, ciclo de vida del grupo, zona horaria y registro de cambios), §4, §5 (fuera de alcance: importación de datos, envío de invitaciones por correo y registro de pagos realizados), §6 y el plan de pruebas.
- **Contradicciones resueltas:** la ficha pedía «reglas de redondeo idénticas a las actuales», «conservar datos», una «herramienta de importación», una vinculación por correo «invitado» sin precisar que no se envían correos y no definía moneda por grupo, ciclo de vida ni zona horaria; todo queda alineado con D1 a D9.

### 12.11 Mejoras recomendadas (no aprobadas aún)

Detectadas en este inventario; el propietario decide cuáles entran. Quedaron **decididas** (ya no son recomendaciones): reabrir grupos (D7), borrar grupos sin gastos (D7), editar la fecha del gasto (D7), moneda ISO (D8), no registrar pagos (D6) mantener el reparto retroactivo sin participación parcial (D6) y renombrar «Liquidación Final» como «Liquidación (grupo cerrado)» (D7).

| Mejora | Origen | Estado |
|---|---|---|
| Listado de **todos** los gastos del grupo con orden definido (los miembros ven todos, D3; hoy SaldApp solo lista por pagador) | §10.3 (8) | Recomendado |
| Control de **edición simultánea** (409) | §3.2 | Requerido por la ficha |
| Errores y textos **en español**, sin voseo, con `problem+json` | §10.2, §10.3 (3, 12) | Requerido por `AGENTS.md` y la ficha |
| Accesibilidad (diálogos, foco, no depender del color, 320 px) | §10.3 (11) | Requerido por `AGENTS.md` |
| Corregir el mensaje «No hay deudas pendientes» y la falla silenciosa de liquidación | §10.3 (6, 7) | Recomendado |
| Minimizar el número de transferencias | G32 | Opcional |
| **Invitación por correo** (vale la pena; requiere notificaciones de la plataforma) | D3 | Fase posterior |
| **Preselección automática de la casilla de Balance** al registrarse desde el enlace | D3, P23 | Por evaluar (agente de Identity/plataforma) |

---

## Anexo A — Código de referencia (verbatim)

Se incluye para poder portar los cálculos sin abrir SaldApp. Es el código que se ejecutó para los casos dorados (§9.0).

### A.1 `domain/service/SettlementCalculator.java`

```java
package com.lmora.saldapp.domain.service;


import com.lmora.saldapp.domain.model.Balance;
import com.lmora.saldapp.domain.model.Transaction;

import java.math.BigDecimal;
import java.util.*;

public class SettlementCalculator {
    public static List<Transaction> calculate(List<Balance> balances) {
        if (balances == null) throw new IllegalArgumentException("balances can't be null");

        for (Balance balance : balances) {
            if (balance == null) throw new IllegalArgumentException("balance can't be null");
            if (balance.getBalance() == null || balance.getIntegrantId() == null) throw new IllegalArgumentException("balance's fields can't be null");
        }

        List<Transaction> transactions = new ArrayList<>();

        PriorityQueue<Balance> debtors = new PriorityQueue<>(
                Comparator.comparing(Balance::getBalance)
        ); // Order of most negative to least negative (lowest to highest)

        PriorityQueue<Balance> creditors = new PriorityQueue<>(
                Comparator.comparing(Balance::getBalance).reversed()
        ); // Order of most positive to least positive (highest to lowest)

        for (Balance balance : balances) {
            if (balance.getBalance().compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(balance);
            } else if (balance.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(balance);
            }
        }

        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            Balance debtor = debtors.poll();
            Balance creditor = creditors.poll();

            BigDecimal amount = debtor.getBalance().abs().min(Objects.requireNonNull(creditor).getBalance());
            debtor.setBalance(debtor.getBalance().add(amount));
            creditor.setBalance(creditor.getBalance().subtract(amount));

            transactions.add(new  Transaction(debtor.getIntegrantId(), creditor.getIntegrantId(), amount));

            if (debtor.getBalance().compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(debtor);
            } else if (creditor.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(creditor);
            }
        }

        return transactions;
    }
}

```

### A.2 `application/usecase/financial/GroupFinancialUseCaseImp.java` (métodos de cálculo)

```java
    private List<Balance> calculateGroupBalances(Long groupId) {

        List<Long> integrantsIds = integrantRepository.findAllByGroup(groupId)
                .stream()
                .map(Integrant::getId)
                .toList();

        if (integrantsIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Expense> groupExpenses = expenseRepository.findAllByGroup(groupId);

        BigDecimal totalExpenses = groupExpenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal equalShare = totalExpenses
                .divide(BigDecimal.valueOf(integrantsIds.size()), 2, RoundingMode.HALF_UP);

        // Everyone starts debt,then we add the expenses they paid and sum total paid by each integrant to calculate the balance
        Map<Long, BigDecimal> groupBalances = new HashMap<>();
        Map<Long, BigDecimal> totalPaidByIntegrant = new HashMap<>();
        for (Long id : integrantsIds) {
            groupBalances.put(id, equalShare.negate());
            totalPaidByIntegrant.put(id, BigDecimal.ZERO);
        }

        // Add the expenses paid by each integrant to their balance
        for (Expense expense : groupExpenses) {
            groupBalances.merge(expense.getPayedBy(), expense.getAmount(), BigDecimal::add);
            totalPaidByIntegrant.merge(expense.getPayedBy(), expense.getAmount(), BigDecimal::add);
        }

        return groupBalances.entrySet().stream()
                .map(entry -> new Balance(
                        entry.getKey(),
                        totalPaidByIntegrant.get(entry.getKey()),
                        entry.getValue()))
                .collect(Collectors.toList());
    }

    private Balance calculateIntegrantBalance(Long groupId, Long integrantId) {

        BigDecimal totalIntegrantExpenses = expenseRepository.findAllByIntegrant(integrantId).stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGroupExpenses = expenseRepository.sumAmountByGroupId(groupId);
        int integrantCount = integrantRepository.countByGroupId(groupId);

        BigDecimal equalShare = totalGroupExpenses
                .divide(BigDecimal.valueOf(integrantCount), 2, RoundingMode.HALF_UP);

        return new Balance(
                integrantId,
                totalIntegrantExpenses,
                equalShare.negate().add(totalIntegrantExpenses)
        );
    }

```

### A.3 Modelos usados por el calculador

`Balance { Long integrantId; BigDecimal totalPaid; BigDecimal balance; }` — `Transaction { Long fromIntegrantId; Long toIntegrantId; BigDecimal amount; }`.

## Anexo B — Cómo se produjeron los resultados

1. Se copió `SettlementCalculator.java` quitando solo `package` e `import com.lmora…`; `Balance` y `Transaction` se reescribieron sin Lombok; un `Harness` con la réplica literal de `calculateGroupBalances` (A.2) lee escenarios de la forma `ids=1,2,3;exp=1:100.00,2:50.00` (o `raw=1:-90,2:60` para llamar al calculador directamente), imprime saldos en el orden del `HashMap` y las transferencias en el orden de salida.
2. Compilación y ejecución con OpenJDK 21 (`jdk.compiler`). Cada escenario con ediciones/bajas se evaluó por separado tras cada operación con el estado resultante.
3. La emulación independiente del §4.3 (`HashMap` + montículo + liquidación) se comparó con el Java real en 3 000 escenarios aleatorios: 0 discrepancias.
4. **Reglas de Balance (§9.3, §12):** se implementaron D1 y D2 en una emulación aparte y se verificaron con propiedades en 5 000 escenarios aleatorios (sumas exactas, invariante final, independencia del orden de entrada).
5. **Limitaciones:** no se ejecutó la aplicación Spring, PostgreSQL ni `mvn test`; los códigos HTTP y los mensajes de error se **calcularon** leyendo el código.
