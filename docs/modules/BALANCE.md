# Balance — ficha de migración

> **Nombre:** el proyecto de origen se llama **SaldApp**. En Pastel se llama **Balance**: ese es el nombre en código, rutas, interfaz y documentación. "SaldApp" solo aparece en documentos de migración para referirse al sistema anterior.

Color `data-module="balance"` (verde azulado) · icono `Scale` · esquema `balance` · ruta `/balance` · API `/api/balance`.

## 1. Situación
Balance registra y liquida **gastos compartidos** entre personas o grupos. Existe como proyecto individual en **otro stack tecnológico**. Se migra a Pastel como módulo **conservando las reglas funcionales, con las correcciones aprobadas por el propietario** (centavos, liquidación determinista, autenticación y roles, campo de monto, ciclo de vida del grupo, moneda y zona horaria por grupo). **No se migran datos: Balance inicia desde cero.** El inventario del proyecto actual (`docs/migration/balance-inventory.md`, lo produce un agente de investigación) es la fuente de verdad funcional; sus secciones §12 (decisiones) y §9.3 (resultados esperados) prevalecen sobre el comportamiento de SaldApp cuando difieren.

## 2. Roles y permisos
Inicial: `balance.access` y `balance.groups.manage` (sobre los grupos de los que la persona forma parte). Rol sugerido `Balance — Usuario`. Los roles **dentro de un grupo** son datos del dominio de Balance, no roles de plataforma (detalle en `docs/migration/balance-inventory.md` §12.3). Reglas: una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor); un grupo ajeno responde 404.

Quien crea un grupo es su primer administrador; **puede haber varios administradores y siempre debe quedar al menos uno**.

| Acción | Administrador | Miembro |
|---|---|---|
| Ver grupo, participantes, **todos** los gastos, saldos y liquidación | Sí | Sí |
| Registrar un gasto | Con **cualquier** participante como pagador | Solo con **él mismo** como pagador |
| Modificar (incluida la fecha) o eliminar un gasto | **Cualquiera** del grupo | Solo los **propios** |
| Cambiar el pagador de un gasto a otra persona | Sí | No |
| Ver el enlace y el código de 4 dígitos de ingreso (siempre visibles) | Sí | No |
| Regenerar el enlace y el código (invalida los anteriores) | Sí (recomendado) | No |
| Nombrar o quitar administradores | Sí (siempre debe quedar al menos uno) | No |
| Quitar participantes sin gastos | Sí | No |
| Editar nombre, descripción, moneda (sin conversión) y zona horaria del grupo | Sí | No |
| Cerrar y reabrir el grupo | Sí | No |
| Borrar el grupo (solo si no tiene gastos) | Sí | No |
| Escribir en un grupo cerrado | No (409; primero se reabre) | No (409) |

El administrador equivale al **dueño** del grupo (puede haber varios). La moneda se elige al crear el grupo y solo un administrador puede corregirla después, sin conversión (§3). Quitar la administración al último administrador, o que este deje el grupo, se rechaza con 409 (`balance.group.last_admin`). **Toda persona participante tiene cuenta de Pastel** y entra al grupo con el **enlace y el código de 4 dígitos** que el administrador comparte (siempre visibles para él); quien tiene sesión, `balance.access`, el enlace y el código correctos se une como miembro. Pendiente de confirmar: detalles del enlace y código (inventario §11.2, P22).

## 3. Principios de la migración
1. **La corrección del cálculo es crítica.** Los algoritmos de reparto, saldos y liquidación se portan con **pruebas doradas**: casos (entradas → resultados esperados) del inventario, ejecutados contra la versión nueva. Valen los resultados de SaldApp (§9.2) donde no cambia el comportamiento y los de Balance (§9.3) donde las decisiones aprobadas lo cambian. Cualquier otra diferencia se investiga antes de continuar.
2. **Dinero:** `numeric(18,2)`, con **moneda ISO 4217 asignada al crear el grupo**; todos los gastos del grupo se registran en esa moneda (sin conversión) y solo un administrador puede **corregir la moneda** del grupo: todos los gastos se reexpresan en la nueva moneda **sin conversión** (10 EUR pasan a 10 USD) y el cambio se rechaza si algún monto tiene más decimales de los que admite la nueva moneda. El catálogo se valida contra la lista oficial ISO 4217 con una prueba automática. Los montos respetan los **decimales de la moneda** (2 en la mayoría; 0 en JPY, CLP, KRW y PYG) y se validan en cliente y servidor. El reparto se calcula en **unidades mínimas enteras** y **la unidad sobrante se asigna, una por participante, siguiendo el orden de alta**: las partes suman exactamente el total y los saldos suman exactamente 0 (inventario §12.1 y §12.8). Nunca `double`.
3. **Liquidación determinista:** mayor monto primero y, en empate, orden de alta; el resultado no depende del orden de entrada ni del orden de la base de datos (inventario §12.2).
4. **Reparto y liquidación:** se **mantiene el reparto retroactivo** (quien se agrega después paga su parte de todos los gastos anteriores) y **no hay participación parcial**. Balance solo **muestra transferencias sugeridas**; no registra pagos (inventario §12.6).
5. **Datos:** Balance **inicia desde cero**: no hay importación ni migración de datos de SaldApp. El esquema `balance` se crea con las migraciones de la plataforma.
6. **Identidad:** toda persona entra con su cuenta de Pastel (inicio con Google) y **la cuenta es obligatoria**: no hay participantes solo con nombre. Quien crea un grupo es su administrador. Cada grupo tiene un **enlace de ingreso y un código de 4 dígitos**, siempre visibles para los administradores, que se comparten a mano; con token no adivinable, límite de intentos, errores genéricos y sin registrarlos en logs (inventario §12.3). La **invitación por correo** queda para una fase posterior (la plataforma no envía correos, §5).
7. **Ciclo de vida del grupo:** el administrador puede **cerrar y reabrir** un grupo y **borrarlo solo si no tiene gastos**; la **fecha de un gasto se puede editar**; cierre, reapertura y borrado se auditan (inventario §12.7).
8. **Zona horaria:** cada grupo tiene zona IANA, por defecto `America/Costa_Rica`, que los administradores pueden cambiar; los instantes se guardan en UTC y la fecha del gasto como fecha de calendario (inventario §12.9).
9. **Interfaz:** adopta el sistema de diseño de Pastel; los flujos críticos (registrar gasto, ver saldos, liquidar) deben ser más simples que en la app actual, no más complejos. El campo de monto admite **decimales** (coma o punto) y valida en cliente y servidor (inventario §12.4).
10. **Sin cambios de comportamiento ocultos:** todo cambio se registra por separado y se aprueba. Los cambios aprobados respecto a SaldApp están en el inventario §12 (D1 a D9).

## 4. Pasos de la migración
1. Leer el inventario (entidades, reglas de reparto, liquidación, permisos, importación/exportación, integraciones).
2. Diseñar esquema `balance` y contrato de API; ADR sobre el modelo de participantes, roles de grupo y el ingreso por enlace y código.
3. Portar el dominio con las pruebas doradas **primero** (sin interfaz).
4. Backend por slices, luego frontend por flujos críticos.
5. Pruebas de aislamiento y de permisos por rol de grupo (administrador y miembro), y de arranque sobre base vacía.
6. Validación con el propietario de las reglas y los flujos, tomando SaldApp y el inventario (§9.3) como referencia.

## 5. Fuera de este alcance
Pagos reales o integración bancaria, conversión de divisas en vivo, notificaciones por WhatsApp o correo (incluye el envío de invitaciones por correo, que queda para una fase posterior), aplicación móvil, **importación o migración de datos de SaldApp**, **registro de pagos realizados** (Balance solo muestra transferencias sugeridas), **participación parcial por gasto** o reparto desigual y **varias monedas dentro de un mismo grupo**.

## 6. Criterios de aceptación
- Las pruebas doradas pasan al 100 % (inventario §9.2 donde no hay cambio y §9.3 donde las decisiones aprobadas lo cambian); partes y saldos suman exacto y la liquidación es determinista.
- Aislamiento por grupo y permisos por rol (administrador/miembro), incluido el invariante de «siempre al menos un administrador», verificados con pruebas de integración (permisos concedidos/denegados).
- Ciclo de vida del grupo (cerrar, reabrir, borrar sin gastos), moneda ISO por grupo con sus decimales (corregible sin conversión), zona horaria por grupo e ingreso por enlace y código con límite de intentos verificados.
- Flujos críticos validados con el propietario; accesibilidad, 320 px, claro/oscuro.
- `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=balance`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

Dev escribe `docs/testing/plans/BALANCE-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente; QA lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Casos dorados:** el 100 % de los ≥ 25 casos de `docs/migration/balance-inventory.md` §9 producen exactamente los saldos y liquidaciones esperados: los de SaldApp (§9.2) donde no hay cambio y los de Balance (§9.3) donde las decisiones aprobadas lo cambian; QA los recalcula de forma independiente.
2. Redondeo: reparto de ₡100,00 entre 3 personas → partes `33,34 / 33,33 / 33,33` (suman exactamente ₡100,00); el centavo sobrante va al primer participante por orden de alta (inventario §12.1). En un grupo en yenes (sin decimales), ¥100 entre 3 → `34 / 33 / 33`. Para todo grupo, las partes suman el total, los saldos suman 0 y dos partes difieren a lo sumo 1 unidad mínima.
3. Dinero: nunca se usa coma flotante; montos con los decimales de la moneda del grupo; negativos, cero y valores enormes validados con mensajes claros.
4. Aislamiento y roles: una persona solo ve los grupos de los que es miembro; IDs de otros grupos → 404; sin sesión → 401. Un miembro no puede registrar un gasto con otro pagador, ni modificar o eliminar gastos ajenos, ni cambiar el pagador, ver o regenerar el enlace y el código, nombrar administradores, quitar participantes, cambiar la configuración (incluida la moneda), cerrar, reabrir o borrar el grupo (→ 403); el administrador sí puede. Quitar al **último administrador** (incluida la carrera entre dos administradores que se quitan el cargo a la vez) → 409.
5. Editar o borrar un gasto recalcula saldos; dos ediciones simultáneas → 409.
6. Ingreso por enlace y código: el administrador ve el enlace y el código de 4 dígitos y un miembro no; quien tiene sesión, `balance.access` y el enlace y código correctos queda como miembro; enlace o código incorrectos → el mismo error genérico; superar el límite de intentos → 429 con `Retry-After`; un enlace regenerado deja de servir; ni el token ni el código aparecen en logs. No existen participantes sin cuenta. Arranque desde base vacía, sin importación de datos.
7. Auditoría de gastos y liquidaciones con antes/después; errores con `code` y `traceId`.
8. Flujos críticos (registrar gasto, ver saldos, liquidar) en 360 px, teclado y texto "Muy grande".
9. **Determinismo de la liquidación:** el resultado es idéntico al permutar el orden de entrada y desempata por mayor monto y luego orden de alta; al terminar no queda nadie con saldo (si el invariante se rompe, error explícito).
10. **Campo de monto:** en un grupo en colones se aceptan `12.50`, `12,50` y `0,01`; se rechazan `12.505`, `0`, negativos, vacío y texto con mensajes claros en cliente y servidor (400); en yenes se acepta `1500` y se rechaza `100.50`; en móvil se abre el teclado numérico con decimales.
11. **Ciclo de vida:** el administrador cierra y reabre (tras reabrir vuelven las escrituras y los saldos se recalculan); un grupo con gastos no se puede borrar (409) y uno sin gastos sí; la fecha de un gasto se edita (el miembro, la suya); cierre, reapertura y borrado quedan auditados.
12. **Monedas:** la moneda se elige al crear el grupo de un catálogo ISO 4217 con sus decimales (una prueba compara el catálogo con la lista oficial), se muestra con código y símbolo y la cambia solo un administrador: todos los gastos se reexpresan sin conversión (10 EUR → 10 USD); el cambio se rechaza (409) si algún monto tiene más decimales de los que admite la nueva moneda o si el grupo está cerrado; un miembro → 403; queda auditado.
13. **Zona horaria:** por defecto `America/Costa_Rica`; un administrador puede cambiarla y un miembro no (403); cambiarla no altera las fechas de los gastos.
