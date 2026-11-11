# Balance — ficha de migración

> **Nombre:** el proyecto de origen se llama **SaldApp**. En Pastel se llama **Balance**: ese es el nombre en código, rutas, interfaz y documentación. "SaldApp" solo aparece en documentos de migración para referirse al sistema anterior.

Identidad visual por definir (investigación en curso); icono `Scale` provisional · esquema `balance` · ruta `/balance` · API `/api/balance`.

## 1. Situación
Balance registra y liquida **gastos compartidos** entre personas o grupos. Existe como proyecto individual en **otro stack tecnológico**. Se migra a Pastel como módulo **conservando datos y reglas**. El inventario del proyecto actual (`docs/requirements/balance/INVENTARIO-BALANCE.md`; sus decisiones D1–D9 prevalecen) es la fuente de verdad funcional. Requerimientos, roles y prototipo: `docs/requirements/balance/`.

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
2. Diseñar esquema `balance` y contrato de API; registrar en `docs/DECISIONS.md` el modelo de participantes.
3. Portar el dominio con las pruebas doradas **primero** (sin interfaz).
4. Backend por slices, luego frontend por flujos críticos.
5. Herramienta de importación con datos reales de prueba y verificación de totales.
6. Validación con el propietario contra el sistema actual.

## 5. Fuera de este alcance
Pagos reales o integración bancaria, conversión de divisas en vivo, notificaciones por WhatsApp o correo, aplicación móvil.

## 6. Criterios de aceptación

### Etapa 1 — app funcional (obligatorio ahora)
- Las pruebas doradas pasan al 100 %; los totales y saldos tras la importación coinciden con los del sistema actual.
- Flujos críticos (registrar gasto, ver saldos, liquidar) validados con el propietario.
- Las **pruebas esenciales** de abajo en verde; `MODULE.md` (backend y frontend) actualizados; el módulo compila y respeta las fronteras entre módulos (pruebas de arquitectura).

### Pruebas esenciales — Etapa 1 (las únicas obligatorias ahora)

Política de `docs/TESTING.md`: solo seguridad, autorización, aislamiento, integridad de datos y reglas de negocio críticas; una prueba por defecto concreto, sin matrices ni permutaciones, y **no se amplía sin decisión del propietario**. Los resultados esperados se calculan desde esta ficha, no desde el código.

1. **Casos dorados:** el 100 % de los ≥ 25 casos de `docs/requirements/balance/INVENTARIO-BALANCE.md` §9 producen exactamente los saldos y liquidaciones del sistema SaldApp.
2. Redondeo: reparto de ₡100,00 entre 3 personas → la suma de las partes es exactamente ₡100,00 y el centavo sobrante se asigna según la regla documentada del sistema anterior.
3. Dinero: nunca se usa coma flotante; montos con 2 decimales; negativos, cero y valores enormes validados con mensajes claros.
4. Aislamiento: una persona solo ve los grupos de los que es miembro; IDs de otros grupos → 404; un miembro sin rol de administrador del grupo no puede cambiar la configuración del grupo.
5. Editar o borrar un gasto recalcula saldos; dos ediciones simultáneas → 409.
6. Importación desde SaldApp: totales por grupo y saldos por persona **antes y después** coinciden; reimportar no duplica; participantes sin cuenta quedan como invitados según la decisión registrada.

### Diferido a QA — Etapa 2 (no bloquea la entrega de la primera versión)

Se planifican cuando las cinco aplicaciones estén funcionales (`docs/TESTING.md`, `docs/PROGRESS.md` §5):

- Auditoría de gastos y liquidaciones con antes/después; errores con `code` y `traceId`.
- Flujos críticos (registrar gasto, ver saldos, liquidar) en 360 px, teclado y texto "Muy grande".
- Recalcular los casos dorados de forma independiente (segunda implementación) como verificación cruzada.
- Compilación y pruebas del módulo **aislado** (`PASTEL_MODULES=<módulo>`), con `ci:completo` o antes de desplegar.
