# Balance — inventario funcional y técnico de SaldApp

> **Rol:** investigación. **Estado:** borrador para revisión del propietario.
> **Fuentes leídas:** repositorios `leandro-mc/saldapp-backend` (rama `main`, último commit `ff865f0`, 2026-06-18) y `leandro-mc/saldapp-frontend` (rama `main`, último commit `fae3f75`, 2026-06-18); en Pastel, `AGENTS.md` y `docs/modules/BALANCE.md` (rama `dev`, `60cfc31`).
> **No se modificó** ningún repositorio de SaldApp ni se escribió código de migración.
> **Nomenclatura:** **SaldApp** = sistema actual; **Balance** = módulo futuro de Pastel.

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

No se puede determinar desde el código: los repositorios no incluyen datos semilla, dumps ni scripts. **[SUPOSICIÓN]** uso personal o familiar: decenas de grupos, de 2 a 20 integrantes por grupo, cientos de gastos en total. Los cálculos recorren todos los gastos del grupo en memoria en cada lectura (sin paginación), lo que no es problema a esa escala.

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

1. **El reparto es retroactivo.** Si se agrega un integrante después de registrar gastos, esa persona pasa a deber su parte de **todos** los gastos anteriores (caso G18). Si se elimina uno (solo posible si no tiene gastos), las partes de los demás suben (G19).
2. **No hay participación parcial.** Un gasto siempre se divide entre todos; no se puede excluir a alguien de un gasto concreto. Todo caso de «participantes parciales» es un **requisito nuevo**, no una regla existente.
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

> **Contradicción con la ficha `BALANCE.md`** (plan de pruebas, punto 2): la ficha supone que, al repartir ₡100,00 entre 3, «la suma de las partes es exactamente ₡100,00 y el centavo sobrante se asigna según la regla documentada del sistema anterior». **El sistema anterior no tiene tal regla:** las partes suman 99.99 y el centavo queda sin cobrar al pagador. Hay que decidir (propietario) si Balance reproduce este comportamiento tal cual o define una regla nueva y explícita como cambio aprobado (ver §11, P3).

---

## 5. Participantes y permisos

- **Identificación de personas.** Un integrante es solo un **nombre de texto** (1–200 caracteres, repetible) asociado a un grupo. No hay correo, teléfono, cuenta ni identificador externo (`Integrant.java`: `id`, `name`, `createdAt`, `groupId`).
- **Roles dentro del grupo.** No existen. Todos los accesos son equivalentes: quien llega al grupo puede crear, editar y borrar integrantes y gastos (mientras el grupo esté abierto), cerrarlo y editar su configuración.
- **Invitaciones.** No existen. «Compartir» un grupo equivale a pasar su ID numérico (secuencial: `GenerationType.IDENTITY`, por tanto enumerable).
- **Quién ve y edita qué.** Todos ven todo y editan todo. Las comprobaciones de pertenencia del código (`findAndValidateIntegrant`, `findAndValidateExpense`) **protegen la coherencia de datos, no el acceso**: usar el ID de un gasto o integrante de otro grupo devuelve **409** (`…does not belong to group…`), no 404.
- **Estados.** Abierto/cerrado. Cerrado = solo lectura (incluye saldos y liquidación final).
- **Sin propietario/creador.** El grupo no registra quién lo creó (§11, P8).

**Propuesta para Balance** *(no es evidencia; requiere ADR del modelo de participantes, según `BALANCE.md` §4.2)*: participante = persona del grupo con nombre visible y, opcionalmente, cuenta de Pastel o correo invitado; rol de grupo `administrador`/`miembro` como dato del dominio (no rol de plataforma); permisos de plataforma `balance.access` y `balance.groups.manage`; visibilidad solo para miembros (servidor); IDs de otros grupos → 404.

---

## 6. Autenticación actual y relación con cuentas de Google en Pastel

**Actual:** ninguna. No hay `spring-boot-starter-security` en `pom.xml`, ni tokens, ni cookies, ni `localStorage` en el frontend (búsqueda en `FE/`). La única barrera es el CORS (`CorsConfig`), que no es autenticación. Cualquier cliente que llegue al puerto 8080 puede usar toda la API; Swagger UI está habilitado.

**Relación con Pastel (propuesta, marcada como suposición).**

1. SaldApp **no tiene identidades que migrar**: el vínculo «integrante ↔ cuenta de Google» no existe y hay que crearlo.
2. Cada `integrant` legado se importaría como **participante con nombre visible y sin cuenta** (invitado). Cuando alguien inicie sesión con Google y acepte la invitación (por correo, que SaldApp **no almacena**), el participante se vincula a esa cuenta.
3. Los grupos legados no tienen dueño: el propietario debe indicar quién será el administrador de cada uno (o un administrador por defecto para toda la importación).
4. Autorización 100 % en el servidor y cookies `HttpOnly` según `AGENTS.md`; el «ID del grupo como llave de acceso» debe desaparecer.

---

## 7. Importación y exportación

- **Importación:** no existe en ninguno de los dos repositorios.
- **Exportación:** no existe (ni CSV, ni PDF, ni impresión). El único formato disponible es **JSON por la API REST** y la documentación OpenAPI/Swagger.
- **Extracción de datos para la migración.** La API **no tiene listado de grupos**; las opciones son (a) volcado directo de la BD (`pg_dump`/`COPY` de `groups`, `integrants`, `expenses`) — la vía recomendada —, o (b) recorrer IDs con `GET /groups/{id}` (404 en los huecos) y, por cada grupo, `GET …/integrants`, `GET …/expenses/{integrantId}` por integrante. Para verificar la importación (`BALANCE.md` §3.3) servirán `GET …/balances` y `GET …/settlements` del sistema actual como valores «antes».

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

---

## 11. Riesgos y preguntas abiertas para el propietario

### 11.1 Riesgos

| # | Riesgo | Evidencia | Impacto en Balance / recomendación |
|---|---|---|---|
| R1 | **Desempates no deterministas** (montículo de Java + `HashMap`) | §4.3, G05, G12, G24, G25 | El orden/quién paga a quién puede cambiar entre implementaciones. Definir regla determinista **aprobada** o emular el montículo; las pruebas doradas deben comparar el neto por persona además del orden |
| R2 | **Los centavos sobrantes no se asignan** y los saldos no suman cero | §4.4, G02, G03, G10–G12, G26 | Contradice la ficha (plan de pruebas, punto 2). Decidir regla explícita; cualquier cambio se registra y aprueba por separado (`BALANCE.md` §3.6) |
| R3 | **Reparto retroactivo y sin participación parcial** | §4.1, G18, G19 | Reproducir tal cual en la importación; cualquier mejora (participación por gasto) es alcance nuevo |
| R4 | **Sin autenticación ni dueño de los grupos** | §5, §6 | La importación debe asignar administradores; riesgo de exposición de datos legados si se expone la API vieja |
| R5 | **Esquema sin migraciones (`ddl-auto: update`)** | `application*.yaml` | El esquema real puede diferir de las entidades; inspeccionar la BD real antes de diseñar la importación |
| R6 | **Montos sin límite de decimales ni dígitos** | §3.3, G28 | Posibles datos con 3+ decimales o 500 en el servidor; validar la BD real y definir la regla de importación (¿redondear? ¿rechazar?) |
| R7 | **Moneda como símbolo ambiguo** | §2 | `$`, `¥`, `Bs.` son ambiguos; se necesita un mapeo a ISO 4217 y confirmación por grupo |
| R8 | **Fechas sin zona horaria** (`timestamp`) y `endDate` del servidor | §3.1 | Definir zona (¿America/Costa_Rica?) al importar |
| R9 | **Cobertura de pruebas mínima** | §1 | Solo existe el calculador probado; las pruebas doradas de §9 son la única referencia ejecutable de las reglas |
| R10 | **Código de error distinto al exigido por la ficha** | §5 | SaldApp responde 409 al usar IDs de otro grupo; la ficha exige 404 y 409 por edición simultánea. Son cambios **intencionales** de Balance: registrarlos como tales |
| R11 | **Orden de filas sin `ORDER BY`** | `IntegrantRepositoryAdapter.findAllByGroup` | Puede alterar el orden de empates entre lecturas **[SUPOSICIÓN, no reproducido]** |
| R12 | **Cálculos de pantalla en coma flotante** | §10.3 (4) | Balance no debe replicarlo: mostrar los valores del servidor |

### 11.2 Preguntas abiertas

- **P1.** ¿Existe una instancia con datos reales de SaldApp? ¿Cuántos grupos, integrantes y gastos hay? ¿Se migran todos o solo los cerrados? ¿Los abiertos pasan como abiertos?
- **P2.** ¿Puede entregarse un volcado de la BD (sin datos personales) o acceso de lectura para validar el esquema real y los montos con más de 2 decimales?
- **P3.** Centavos: ¿se **mantiene** el comportamiento actual (§4.4: el pagador absorbe el centavo si la parte se redondea hacia abajo; el último deudor paga de menos si se redondea hacia arriba) o se desea una regla explícita (p. ej., asignar el sobrante siempre al pagador o repartirlo centavo a centavo entre los participantes)? La ficha de Balance asume una regla explícita.
- **P4.** Desempates: ¿se acepta una regla determinista (p. ej., mayor monto primero y, en empate, por orden de creación del participante) aunque el orden de las transferencias cambie respecto a SaldApp, manteniendo el mismo neto por persona?
- **P5.** ¿Es intencional que un integrante nuevo asuma retroactivamente su parte de los gastos anteriores? ¿Se quiere participación parcial por gasto en Balance (alcance nuevo)?
- **P6.** ¿Se registran gastos con decimales en la práctica (₡ suele usarse sin céntimos)? ¿El campo numérico permite hoy escribir `12.50` en su navegador?
- **P7.** «Liquidar»: ¿basta con mostrar transferencias sugeridas o se quiere **registrar pagos realizados**? ¿Se quiere poder reabrir un grupo cerrado?
- **P8.** ¿Quién debe ser administrador de cada grupo migrado? ¿Existe el correo de los integrantes para invitarlos, o se vincularán manualmente?
- **P9.** Monedas: ¿qué ISO corresponde a `$` (¿USD?), `¥`, `Bs.`, `L`, `Q`? ¿Los grupos existentes usan sobre todo ₡?
- **P10.** ¿Se requiere compartir grupos por enlace/invitación? (Hoy solo se comparte el ID.)
- **P11.** ¿Hay despliegue público o solo uso local? ¿Debe apagarse Swagger/API vieja tras migrar?
- **P12.** ¿Se desea poder borrar grupos (hoy no existe) y editar la fecha de un gasto (hoy no se puede)?
- **P13.** Zona horaria de las fechas y de `endDate`.

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
4. **Limitaciones:** no se ejecutó la aplicación Spring, PostgreSQL ni `mvn test`; los códigos HTTP y los mensajes de error se **calcularon** leyendo el código.
