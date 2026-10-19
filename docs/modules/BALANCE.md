# Balance — ficha de migración

> **Nombre:** el proyecto de origen se llama **SaldApp**. En Pastel se llama **Balance**: ese es el nombre en código, rutas, interfaz y documentación. "SaldApp" solo aparece en documentos de migración para referirse al sistema anterior.

Color `data-module="balance"` (verde azulado) · icono `Scale` · esquema `balance` · ruta `/balance` · API `/api/balance`.

## 1. Situación
Balance registra y liquida **gastos compartidos** entre personas o grupos. Existe como proyecto individual en **otro stack tecnológico**. Se migra a Pastel como módulo **conservando las reglas funcionales, con las correcciones aprobadas por el propietario** (centavos, liquidación determinista, autenticación y roles, campo de monto). **No se migran datos: Balance inicia desde cero.** El inventario del proyecto actual (`docs/migration/balance-inventory.md`, lo produce un agente de investigación) es la fuente de verdad funcional; sus secciones §12 (decisiones) y §9.3 (resultados esperados) prevalecen sobre el comportamiento de SaldApp cuando difieren.

## 2. Roles y permisos
Inicial: `balance.access` y `balance.groups.manage` (sobre los grupos de los que la persona forma parte). Rol sugerido `Balance — Usuario`. Los roles **dentro de un grupo** son datos del dominio de Balance, no roles de plataforma (detalle en `docs/migration/balance-inventory.md` §12.3). Reglas: una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor); un grupo ajeno responde 404.

| Acción | Administrador (quien crea el grupo) | Miembro |
|---|---|---|
| Ver grupo, participantes, gastos, saldos y liquidación | Sí | Sí |
| Registrar un gasto | Con **cualquier** participante como pagador | Solo con **él mismo** como pagador |
| Modificar o eliminar un gasto | **Cualquiera** del grupo | Solo los **propios** |
| Invitar participantes y aceptar su ingreso | Sí | No |
| Quitar participantes sin gastos, editar la configuración (nombre, descripción, moneda) y cerrar el grupo | Sí | No |
| Escribir en un grupo cerrado | No (409) | No (409) |

El administrador solo concede lo que tiene (invita siempre como miembro). Pendientes de confirmar con el propietario: eliminar como parte de «modificar», quitar/editar/cerrar como acciones del administrador y visibilidad total de gastos para los miembros (inventario §11.2, P20).

## 3. Principios de la migración
1. **La corrección del cálculo es crítica.** Los algoritmos de reparto, saldos y liquidación se portan con **pruebas doradas**: casos (entradas → resultados esperados) del inventario, ejecutados contra la versión nueva. Valen los resultados de SaldApp (§9.2) donde no cambia el comportamiento y los de Balance (§9.3) donde las decisiones aprobadas lo cambian. Cualquier otra diferencia se investiga antes de continuar.
2. **Dinero:** `numeric(18,2)`, moneda explícita (ISO 4217), montos con **a lo sumo 2 decimales** validados en cliente y servidor. El reparto se calcula en **centavos enteros** y **el centavo sobrante se asigna, un centavo por participante, siguiendo el orden de alta**: las partes suman exactamente el total y los saldos suman exactamente 0.00 (inventario §12.1). Nunca `double`.
3. **Liquidación determinista:** mayor monto primero y, en empate, orden de alta; el resultado no depende del orden de entrada ni del orden de la base de datos (inventario §12.2).
4. **Datos:** Balance **inicia desde cero**: no hay importación ni migración de datos de SaldApp. El esquema `balance` se crea con las migraciones de la plataforma.
5. **Identidad:** toda persona entra con su cuenta de Pastel (inicio con Google). Quien crea un grupo es su administrador; el administrador **invita** a los participantes y **acepta** su ingreso; mientras tanto el participante está pendiente. La plataforma **no envía correos** (§5), así que el mecanismo de entrega de la invitación se define en el ADR del modelo de participantes (inventario §12.3 y P18).
6. **Interfaz:** adopta el sistema de diseño de Pastel; los flujos críticos (registrar gasto, ver saldos, liquidar) deben ser más simples que en la app actual, no más complejos. El campo de monto admite **decimales** (coma o punto) y valida en cliente y servidor (inventario §12.4).
7. **Sin cambios de comportamiento ocultos:** todo cambio se registra por separado y se aprueba. Los cambios aprobados respecto a SaldApp están en el inventario §12 (D1 a D5).

## 4. Pasos de la migración
1. Leer el inventario (entidades, reglas de reparto, liquidación, permisos, importación/exportación, integraciones).
2. Diseñar esquema `balance` y contrato de API; ADR sobre el modelo de participantes, roles de grupo e invitaciones.
3. Portar el dominio con las pruebas doradas **primero** (sin interfaz).
4. Backend por slices, luego frontend por flujos críticos.
5. Pruebas de aislamiento y de permisos por rol de grupo (administrador y miembro), y de arranque sobre base vacía.
6. Validación con el propietario de las reglas y los flujos, tomando SaldApp y el inventario (§9.3) como referencia.

## 5. Fuera de este alcance
Pagos reales o integración bancaria, conversión de divisas en vivo, notificaciones por WhatsApp o correo (incluye el envío de invitaciones por correo), aplicación móvil, **importación o migración de datos de SaldApp**.

## 6. Criterios de aceptación
- Las pruebas doradas pasan al 100 % (inventario §9.2 donde no hay cambio y §9.3 donde las decisiones aprobadas lo cambian); partes y saldos suman exacto y la liquidación es determinista.
- Aislamiento por grupo y permisos por rol (administrador/miembro) verificados con pruebas de integración (permisos concedidos/denegados).
- Flujos críticos validados con el propietario; accesibilidad, 320 px, claro/oscuro.
- `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=balance`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

Dev escribe `docs/testing/plans/BALANCE-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente; QA lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Casos dorados:** el 100 % de los ≥ 25 casos de `docs/migration/balance-inventory.md` §9 producen exactamente los saldos y liquidaciones esperados: los de SaldApp (§9.2) donde no hay cambio y los de Balance (§9.3) donde las decisiones aprobadas lo cambian; QA los recalcula de forma independiente.
2. Redondeo: reparto de ₡100,00 entre 3 personas → partes `33,34 / 33,33 / 33,33` (suman exactamente ₡100,00); el centavo sobrante va al primer participante por orden de alta (inventario §12.1). Para todo grupo, las partes suman el total, los saldos suman 0,00 y dos partes difieren a lo sumo 1 centavo.
3. Dinero: nunca se usa coma flotante; montos con 2 decimales; negativos, cero y valores enormes validados con mensajes claros.
4. Aislamiento y roles: una persona solo ve los grupos de los que es miembro; IDs de otros grupos → 404; sin sesión → 401. Un miembro no puede registrar un gasto con otro pagador, ni modificar o eliminar gastos ajenos, ni invitar, cerrar el grupo o cambiar su configuración (→ 403); el administrador sí puede.
5. Editar o borrar un gasto recalcula saldos; dos ediciones simultáneas → 409.
6. Invitaciones: el administrador invita; la persona acepta con su cuenta y el administrador acepta su ingreso; mientras no se confirme, el grupo no es visible para ella (404); un participante pendiente cuenta en el reparto desde su alta. Arranque desde base vacía, sin importación de datos.
7. Auditoría de gastos y liquidaciones con antes/después; errores con `code` y `traceId`.
8. Flujos críticos (registrar gasto, ver saldos, liquidar) en 360 px, teclado y texto "Muy grande".
9. **Determinismo de la liquidación:** el resultado es idéntico al permutar el orden de entrada y desempata por mayor monto y luego orden de alta; al terminar no queda nadie con saldo (si el invariante se rompe, error explícito).
10. **Campo de monto:** se aceptan `12.50`, `12,50` y `0,01`; se rechazan `12.505`, `0`, negativos, vacío y texto con mensajes claros en cliente y servidor (400); en móvil se abre el teclado numérico con decimales.
