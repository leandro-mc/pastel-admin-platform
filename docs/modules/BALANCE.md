# Balance — ficha de migración

> **Nombre:** el proyecto de origen se llama **SaldApp**. En Pastel se llama **Balance**: ese es el nombre en código, rutas, interfaz y documentación. "SaldApp" solo aparece en documentos de migración para referirse al sistema anterior.

Color `data-module="balance"` (verde azulado) · icono `Scale` · esquema `balance` · ruta `/balance` · API `/api/balance`.

## 1. Situación
Balance registra y liquida **gastos compartidos** entre personas o grupos. Existe como proyecto individual en **otro stack tecnológico**. Se migra a Pastel como módulo **conservando datos y reglas**. El inventario del proyecto actual (`docs/migration/balance-inventory.md`, lo produce un agente de investigación) es la fuente de verdad funcional.

## 2. Roles y permisos
Inicial: `balance.access` y `balance.groups.manage` (sobre los grupos de los que la persona forma parte). Rol sugerido `Balance — Usuario`. Los roles **dentro de un grupo** (por ejemplo, administrador del grupo y miembro) son datos del dominio de Balance, no roles de plataforma; el inventario los describe. Reglas: una persona solo ve los grupos y gastos de los que es miembro (verificación en el servidor).

## 3. Principios de la migración
1. **La corrección del cálculo es crítica.** Los algoritmos de reparto, saldos y liquidación se portan con **pruebas doradas**: casos reales (entradas → resultados esperados) tomados del sistema actual, ejecutados contra la versión nueva. Cualquier diferencia se investiga antes de continuar.
2. **Dinero:** `numeric(18,2)`, moneda explícita, reglas de redondeo idénticas a las actuales (documentadas). Nunca `double`.
3. **Datos:** plan de migración con respaldo, importación, verificación de integridad (totales por grupo, saldos por persona antes y después) y procedimiento de reversión.
4. **Identidad:** las personas del sistema actual se asocian a cuentas de Pastel (inicio con Google); definir cómo se vinculan los participantes que aún no tienen cuenta (p. ej., participantes "invitados" por correo) según el inventario.
5. **Interfaz:** adopta el sistema de diseño de Pastel; los flujos críticos (registrar gasto, ver saldos, liquidar) deben ser más simples que en la app actual, no más complejos.
6. **Sin cambios de comportamiento ocultos:** todo cambio se registra por separado y se aprueba.

## 4. Pasos de la migración
1. Leer el inventario (entidades, reglas de reparto, liquidación, permisos, importación/exportación, integraciones).
2. Diseñar esquema `balance` y contrato de API; ADR sobre el modelo de participantes.
3. Portar el dominio con las pruebas doradas **primero** (sin interfaz).
4. Backend por slices, luego frontend por flujos críticos.
5. Herramienta de importación con datos reales de prueba y verificación de totales.
6. Validación con el propietario contra el sistema actual.

## 5. Fuera de este alcance
Pagos reales o integración bancaria, conversión de divisas en vivo, notificaciones por WhatsApp o correo, aplicación móvil.

## 6. Criterios de aceptación
- Las pruebas doradas pasan al 100 %; los totales y saldos tras la importación coinciden con los del sistema actual.
- Aislamiento por grupo verificado con pruebas de integración (permisos concedidos/denegados).
- Flujos críticos validados con el propietario; accesibilidad, 320 px, claro/oscuro.
- `MODULE.md` actualizados; compila y pasa pruebas aislado (`PASTEL_MODULES=balance`).

## Plan de pruebas — mínimos obligatorios (independiente de la implementación)

QA escribe `docs/testing/plans/BALANCE-TEST-PLAN.md` a partir de esta ficha e **incluye al menos** lo siguiente, y lo ejecuta y amplía (`docs/TESTING_STRATEGY.md`). Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Casos dorados:** el 100 % de los ≥ 25 casos de `docs/migration/balance-inventory.md` §9 producen exactamente los saldos y liquidaciones del sistema SaldApp; QA los recalcula de forma independiente.
2. Redondeo: reparto de ₡100,00 entre 3 personas → la suma de las partes es exactamente ₡100,00 y el centavo sobrante se asigna según la regla documentada del sistema anterior.
3. Dinero: nunca se usa coma flotante; montos con 2 decimales; negativos, cero y valores enormes validados con mensajes claros.
4. Aislamiento: una persona solo ve los grupos de los que es miembro; IDs de otros grupos → 404; un miembro sin rol de administrador del grupo no puede cambiar la configuración del grupo.
5. Editar o borrar un gasto recalcula saldos; dos ediciones simultáneas → 409.
6. Importación desde SaldApp: totales por grupo y saldos por persona **antes y después** coinciden; reimportar no duplica; participantes sin cuenta quedan como invitados según el ADR.
7. Auditoría de gastos y liquidaciones con antes/después; errores con `code` y `traceId`.
8. Flujos críticos (registrar gasto, ver saldos, liquidar) en 360 px, teclado y texto "Muy grande".
