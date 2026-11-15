# Balance — ficha de migración

> **Nombre:** el proyecto de origen se llama **SaldApp**. En Pastel se llama **Balance**: ese es el nombre en código, rutas, interfaz y documentación. "SaldApp" solo aparece en documentos de migración para referirse al sistema anterior.

Identidad visual por definir (investigación en curso); icono `Scale` provisional · esquema `balance` · ruta `/balance` · API `/api/balance`.

## 1. Situación
Balance registra y liquida **gastos compartidos** entre personas o grupos. Existe como proyecto individual en **otro stack tecnológico** (SaldApp). Se migra a Pastel como módulo **conservando las reglas funcionales, con las correcciones aprobadas por el propietario** (centavos, liquidación determinista, autenticación y roles, campo de monto, ciclo de vida del grupo, moneda y zona horaria por grupo). **No se migran datos: Balance inicia desde cero.** El inventario del proyecto actual (`docs/requirements/balance/INVENTARIO-BALANCE.md`) es la fuente de verdad funcional; sus secciones §12 (decisiones D1–D9) y §9.3 (resultados esperados) prevalecen sobre el comportamiento de SaldApp cuando difieren. Requerimientos, roles y prototipo: `docs/requirements/balance/`; las decisiones del propietario del 2026-11-13 están en `docs/requirements/DECISIONES-Y-HALLAZGOS.md`.

## 2. Roles y permisos
Inicial: `balance.access` y `balance.groups.manage` (sobre los grupos de los que la persona forma parte). Rol sugerido `Balance — Usuario`. Los roles **dentro de un grupo** son datos del dominio de Balance, no roles de plataforma (detalle en `docs/requirements/balance/ROLES-Y-PERMISOS.md` e inventario §12.3). Reglas: una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor); un grupo ajeno responde 404.

Quien crea un grupo es su primer administrador; **puede haber varios administradores y siempre debe quedar al menos uno**.

| Acción | Administrador | Miembro |
|---|---|---|
| Ver grupo, participantes, **todos** los gastos, saldos y liquidación | Sí | Sí |
| Registrar un gasto | Con **cualquier** participante como pagador | Solo con **él mismo** como pagador |
| Modificar (incluida la fecha) o eliminar un gasto | **Cualquiera** del grupo | Solo los **propios** |
| Usar la **Gestión de gastos** (hoja con borrador y guardado atómico) | Sobre **todos** los gastos | Sobre **solo los suyos** (pagador fijo en él) |
| Cambiar el pagador de un gasto a otra persona | Sí | No |
| Ver el enlace y el código de 4 dígitos de ingreso (siempre visibles) | Sí | No |
| Regenerar el enlace y el código (invalida los anteriores; no vencen si no se regeneran) | Sí | No |
| Salir del grupo por sí mismo (solo si no tiene gastos; el último administrador no puede) | Sí | Sí |
| Nombrar o quitar administradores | Sí (siempre debe quedar al menos uno) | No |
| Quitar participantes sin gastos | Sí | No |
| Editar nombre, descripción, moneda (sin conversión) y zona horaria del grupo | Sí | No |
| Cerrar y reabrir el grupo | Sí | No |
| Borrar el grupo (solo si no tiene gastos) | Sí | No |
| Escribir en un grupo cerrado | No (409; primero se reabre) | No (409) |

El administrador equivale al **dueño** del grupo (puede haber varios). Quitar la administración al último administrador, o que este deje el grupo, se rechaza con 409 (`balance.group.last_admin`). **Toda persona participante tiene cuenta de Pastel** y entra con el **enlace y el código de 4 dígitos** que el administrador comparte; quien tiene sesión, `balance.access`, el enlace y el código correctos se une como miembro. Los enlaces y códigos **no vencen** (decisión inicial; se reevaluará con el uso); tras **5 intentos fallidos** se bloquea el ingreso 15 minutos. Quien no tiene cuenta ve una página que le indica registrarse y **marcar la app Balance**; que Balance pueda **preseleccionar** esa casilla lo evalúa el agente de Identity/plataforma (inventario §12.3 punto 9 y P23).

## 3. Principios de la migración
1. **La corrección del cálculo es crítica.** Los algoritmos de reparto, saldos y liquidación se portan con **pruebas doradas**: casos (entradas → resultados esperados) del inventario, ejecutados contra la versión nueva. Valen los resultados de SaldApp (§9.2) donde no cambia el comportamiento y los de Balance (§9.3) donde las decisiones aprobadas lo cambian. Cualquier otra diferencia se investiga antes de continuar.
2. **Dinero:** `numeric(18,2)`, con **moneda ISO 4217 asignada al crear el grupo** del **catálogo de 40 monedas del inventario §12.8** (decisión del propietario: no se agrega una moneda para llegar a 41). Todos los gastos del grupo se registran en esa moneda (sin conversión) y solo un administrador puede **corregirla**: los gastos se reexpresan **sin conversión** (10 EUR pasan a 10 USD) y el cambio se rechaza si algún monto tiene más decimales de los que admite la nueva moneda. Los montos respetan los **decimales de la moneda** (2 en la mayoría; 0 en JPY, CLP, KRW y PYG) y se validan en cliente y servidor. El reparto se calcula en **unidades mínimas enteras** y **la unidad sobrante se asigna, una por participante, siguiendo el orden de alta**: las partes suman exactamente el total y los saldos suman exactamente 0 (inventario §12.1 y §12.8). Nunca `double`.
3. **Liquidación determinista:** mayor monto primero y, en empate, orden de alta; el resultado no depende del orden de entrada ni del de la base de datos (inventario §12.2). La interfaz agrega «Copiar monto» en los pagos propios y el aviso **«Verifique el pago antes de darlo por recibido»**.
4. **Reparto y liquidación:** se **mantiene el reparto retroactivo** (quien se agrega después paga su parte de todos los gastos anteriores) y **no hay participación parcial ni excepciones**: partes iguales. Balance solo **muestra transferencias sugeridas**; no registra pagos (inventario §12.6).
5. **Datos:** Balance **inicia desde cero**: no hay importación ni migración de datos de SaldApp. El esquema `balance` se crea con las migraciones de la plataforma.
6. **Identidad:** toda persona entra con su cuenta de Pastel (inicio con Google) y **la cuenta es obligatoria**: no hay participantes solo con nombre; la página de invitación reduce la fricción (decisión del propietario). La **invitación por correo** queda para una fase posterior (la plataforma no envía correos, §5).
7. **Ciclo de vida y fechas:** el administrador puede **cerrar y reabrir** un grupo y **borrarlo solo si no tiene gastos**; la **fecha de un gasto se puede editar**; cierre, reapertura y borrado se auditan (inventario §12.7). Cada grupo muestra su **fecha de inicio** (se elige al crearlo y no cambia) y, si está cerrado, su **fecha de cierre**.
8. **Zona horaria:** cada grupo tiene zona IANA, por defecto `America/Costa_Rica`, que los administradores pueden cambiar; los instantes se guardan en UTC y la fecha del gasto como fecha de calendario (inventario §12.9).
9. **Interfaz:** adopta el sistema de diseño de Pastel; los flujos críticos (registrar gasto, ver saldos, liquidar) deben ser más simples que en la app actual, no más complejos. El campo de monto admite **decimales** (coma o punto) y valida en cliente y servidor (inventario §12.4).
10. **Sin cambios de comportamiento ocultos:** todo cambio se registra por separado y se aprueba. Los cambios aprobados respecto a SaldApp están en el inventario §12 (D1 a D9) y en el registro de decisiones.

## 4. Pasos de la migración
1. Leer el inventario (entidades, reglas de reparto, liquidación, permisos, integraciones).
2. Diseñar esquema `balance` y contrato de API; registrar en `docs/DECISIONS.md` el modelo de participantes, los roles de grupo, el alcance de la Gestión de gastos por rol y el ingreso por enlace y código.
3. Portar el dominio con las pruebas doradas **primero** (sin interfaz).
4. Backend por slices, luego frontend por flujos críticos.
5. Pruebas de aislamiento y de permisos por rol de grupo (administrador y miembro), y de arranque sobre base vacía.
6. Validación con el propietario de las reglas y los flujos, tomando SaldApp y el inventario (§9.3) como referencia.

## 5. Fuera de este alcance
Pagos reales o integración bancaria, conversión de divisas en vivo, notificaciones por WhatsApp o correo (incluye el envío de invitaciones por correo y **los avisos cuando alguien registra un gasto, que no entran en el MVP**), **resumen compartible por WhatsApp (fase posterior)**, aplicación móvil, **importación o migración de datos de SaldApp**, **registro de pagos realizados** (Balance solo muestra transferencias sugeridas), **participación parcial por gasto** o reparto desigual y **varias monedas dentro de un mismo grupo**.

## 6. Criterios de aceptación

### Etapa 1 — app funcional (obligatorio ahora)
- Las pruebas doradas pasan al 100 % (inventario §9.2 donde no hay cambio y §9.3 donde las decisiones aprobadas lo cambian); partes y saldos suman exacto y la liquidación es determinista.
- Aislamiento por grupo y permisos por rol (administrador/miembro), incluidos el alcance de la Gestión de gastos y el invariante de «siempre al menos un administrador».
- Flujos críticos (registrar gasto, ver saldos, liquidar) validados con el propietario.
- Las **pruebas esenciales** de abajo en verde; `MODULE.md` (backend y frontend) actualizados; el módulo compila y respeta las fronteras entre módulos (pruebas de arquitectura).

### Pruebas esenciales — Etapa 1 (las únicas obligatorias ahora)

Política de `docs/TESTING.md`: solo seguridad, autorización, aislamiento, integridad de datos y reglas de negocio críticas; una prueba por defecto concreto, sin matrices ni permutaciones, y **no se amplía sin decisión del propietario**. Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Casos dorados:** el 100 % de los ≥ 25 casos de `docs/requirements/balance/INVENTARIO-BALANCE.md` §9 producen exactamente los saldos y liquidaciones esperados (§9.2 de SaldApp donde no hay cambio; §9.3 de Balance donde las decisiones aprobadas lo cambian).
2. Redondeo: reparto de ₡100,00 entre 3 personas → partes `33,34 / 33,33 / 33,33` (suman exactamente ₡100,00); el centavo sobrante va al primer participante por orden de alta (inventario §12.1). En yenes, ¥100 entre 3 → `34 / 33 / 33`.
3. Dinero: nunca se usa coma flotante; montos con los decimales de la moneda del grupo; negativos, cero y valores enormes validados con mensajes claros.
4. Aislamiento y roles: una persona solo ve los grupos de los que es miembro; IDs de otros grupos → 404; sin sesión → 401. Un miembro no puede registrar un gasto con otro pagador, ni modificar o eliminar gastos ajenos (tampoco desde la Gestión de gastos, que rechaza el borrador completo), ni cambiar el pagador, ver o regenerar el enlace y el código, nombrar administradores, quitar participantes, cambiar la configuración, cerrar, reabrir o borrar el grupo (→ 403); el administrador sí puede. Quitar al **último administrador** → 409.
5. Editar o borrar un gasto recalcula saldos; dos ediciones simultáneas → 409.
6. Ingreso por enlace y código: el administrador ve el enlace y el código y un miembro no; quien tiene sesión, `balance.access` y ambos correctos queda como miembro; enlace o código incorrectos → el mismo error genérico; tras 5 intentos fallidos → bloqueo de 15 minutos (429 con `Retry-After`); un enlace regenerado deja de servir; ni el token ni el código aparecen en logs. No existen participantes sin cuenta; el arranque es sobre base vacía, sin importación.

### Diferido a QA — Etapa 2 (no bloquea la entrega de la primera versión)

Se planifican cuando las cinco aplicaciones estén funcionales (`docs/TESTING.md`, `docs/PROGRESS.md` §5):

- Auditoría de gastos y liquidaciones con antes/después; errores con `code` y `traceId`.
- Flujos críticos (registrar gasto, ver saldos, liquidar) en 360 px, teclado y texto "Muy grande".
- Recalcular los casos dorados de forma independiente (segunda implementación) como verificación cruzada.
- Compilación y pruebas del módulo **aislado** (`PASTEL_MODULES=<módulo>`), con `ci:completo` o antes de desplegar.
- Reglas aprobadas que hoy solo cubren el prototipo y las pruebas esenciales: determinismo de la liquidación (idéntica al permutar el orden de entrada); campo de monto (`12.50`, `12,50` y `0,01` sí; `12.505`, `0`, negativos, vacío y texto no; en yenes `1500` sí y `100.50` no); ciclo de vida completo (cerrar, reabrir, borrar sin gastos, salir del grupo, auditoría); cambio de moneda sin conversión (409 si hay decimales incompatibles o el grupo está cerrado; miembro → 403); zona horaria (el cambio no altera las fechas de los gastos); fechas de inicio y cierre del grupo; persona sin cuenta o sin acceso a Balance (página informativa idéntica para cualquier enlace, sin revelar si el grupo existe).
