# Balance · investigación (v3): cuentas claras entre quienes se conocen

> **Honestidad metodológica:** las «entrevistas» de §5 son **simuladas** (hipótesis [H] para validar con personas reales; guía en §9). La evidencia externa está en [`../research/NOTAS-BRISA-BALANCE-V3.md`](../research/NOTAS-BRISA-BALANCE-V3.md) y [`../research/FUENTES.md`](../research/FUENTES.md) con confianza A/B/C. Las comparaciones de competidores salen de blogs comerciales (**C**): sus cifras de precios y límites **cambian rápido** y deben revisarse antes de decidir. Esta investigación **no reabre** las decisiones D1–D9 del propietario: las pone a prueba y señala tensiones.

## 1. Qué resuelve (de verdad) Balance

Matemáticamente, dividir gastos es fácil. Lo difícil es **la conversación**: «¿cuánto te debo?», «¿ya pagaste?», «¿por qué me toca a mí?». El trabajo (*job*) es: *«cuando compartimos gastos con gente que quiero, quiero saber exactamente cuánto me toca y a quién le pago, sin tener que pedir ni discutir»*. Balance gana si **nadie tiene que preguntar** y **nadie duda del número**.

## 2. Diagnóstico: el problema no es la aritmética, es el dinero entre personas

- **Partes iguales: simples, pero no siempre justas.** En un experimento clásico (Gneezy, Haruvy y Yafe, *Economic Journal*, 2004; recogido en una entrevista de la revista Gelf, confianza **B**) quienes dividían la cuenta **en partes iguales** pedían más que quienes pagaban lo suyo: se diluye el costo propio. Una encuesta comercial de OpenTable (UK, **C**) halló que más de la mitad reparte por igual «porque es más fácil» y un tercio lo hace por **miedo a parecer tacaño**. Lectura: repartir igual es el **valor por defecto social**, no necesariamente lo que cada quien siente justo. D6 (sin participación parcial) hereda esa tensión.
- **Entre amistades pesa la norma «comunitaria».** La teoría de relaciones de Clark y Mills (1979) distingue vínculos de intercambio (se lleva cuenta exacta) de vínculos comunitarios (se cuida al otro sin contar). Un artículo divulgativo (RNZ, **B/C**) recoge que, con amistades cercanas, invitar —en lugar de dividir— suele dar más felicidad. Lectura: Balance debe **quitar la incomodidad de contar**, no volverla un examen: tono sin juicio, cifras sin acusación.
- **El obstáculo más repetido es invitar.** Las comparativas coinciden en que las apps que **no exigen cuenta** para entrar (Tricount, Splid) lo usan como ventaja; las que sí (Splitwise) se quejan de fricción (**C**). Balance exige cuenta por decisión (D3): hay que **compensarlo** con una invitación excelente.
- **Pagar ocurre fuera de la app.** En esta categoría casi nadie registra pagos dentro (Tricount, Splid no mueven dinero); en Costa Rica, el pago es **SINPE Móvil**, que pide teclear número y monto (§4). Balance (D6) sugiere transferencias y no las registra.

## 3. Competencia (confianza C; verificar antes de decidir)

| App | Acceso para entrar | Reparto | Liquidación | Lo que nos enseña |
|---|---|---|---|---|
| **Splitwise** | Cuenta | Igual, porcentaje, exacto | «Simplificar deudas»; el plan gratis **limita entradas diarias** (según varias comparativas) | El tope de uso gratis empuja a cambiar; la simplicidad y la reputación pesan |
| **Tricount** | Enlace, sin cuenta para ver | Igual y personalizado | Sugiere pagos; gratis | La barrera cero para invitar |
| **Splid** | Código del grupo, sin cuenta | Igual y variable | Minimiza transferencias | Códigos cortos funcionan |
| **Settle Up** | Cuenta opcional | Muy flexible, multimoneda | Con tolerancia para montos pequeños | La flexibilidad cuesta claridad |
| **SaldApp (actual)** | Número de grupo (IDs consecutivos) | Igual | Estimada y final | Lo que se corrige en Balance (inventario §10.3) |

**Qué hace distinto Balance:** reparto exacto con regla pública (centavos por orden de alta, D1), liquidación **igual para todos** (D2), grupos que se **reabren** (D7), y diseño centrado en **su situación** y en el **teléfono**.

## 4. Contexto costarricense

- **SINPE Móvil** es el medio natural para pagarse entre personas; el monto transado siguió creciendo en 2025 (Observador, **B**). Hay **dudas sobre el monitoreo** de las transferencias (Teletica, 20-jul-2026, **B**), **estafas con comprobantes falsos** (CRHoy, **B**) y el BCCR prepara **QR y alias** (Observador, **B**).
- Consecuencias de diseño: (1) **«Copiar monto»** exacto con la coma decimal que el teléfono espera; (2) el recordatorio de **verificar el pago en la cuenta propia** antes de darlo por recibido; (3) Balance **no guarda números de teléfono** ni datos bancarios (menos datos, menos riesgo).
- **Colón:** ₡ con coma decimal y espacio de miles; las partes pueden tener céntimos (de ahí D1). El yen y otras monedas sin decimales se prueban (G35–G38).
- **Privacidad:** Balance guarda nombres y gastos; la Ley de protección de la persona frente al tratamiento de sus datos personales (Ley 8968) aplica: **verificar** con asesoría antes de producción (no se evaluó en esta sesión).

## 5. Personas y entrevistas simuladas [H]

### 5.1 Ana, 29 años — organiza el paseo (rol: administra)
*«Siempre me toca llevar las cuentas y al final me da pena cobrar.»* Quiere **una lista que no sea suya**: que el número salga de la app y no de ella. Necesita invitar sin explicar cinco veces. → regla D1/D2 visible, enlace + código, «Una lista para todos». Al volver de un viaje necesita **cargar muchos gastos de una vez** (a veces decenas) y corregir errores sin abrir un formulario por cada uno → **Gestión de gastos** con borrador y guardado atómico (prototipo original), con pegado desde Excel.

### 5.2 Beto, 31 años — miembro, paga poco
Compró el súper y pagó la gasolina un día; el resto lo pagaron otras personas. Quiere **ver todo** (transparencia) pero **no tocar** lo ajeno. A veces se equivoca de monto. → ve todos los gastos, edita solo los suyos; validación junto al campo.

### 5.3 Doña Marta, 58 años — recibe el enlace por WhatsApp (sin cuenta)
*«¿Y para qué tengo que hacerme una cuenta?»* Si la página no le explica en 20 segundos qué hacer, deja el grupo. → página de invitación con 3 pasos, botón grande y regreso al código.

### 5.4 Diego, 36 años — segunda persona administradora
Quiere poder **ayudar a Ana** (corregir gastos, regenerar el enlace) y no depender de ella. → varios administradores (D3); invariantes: siempre al menos uno.

### 5.5 Elena, 24 años — no pagó nada y le da pena [H]
Siente que «le deben el favor». Le incomoda ver **«Debe ₡70 596,15»** en grande. → lenguaje sin juicio («Debe», no «Moroso»); ámbar y no rojo; la liquidación es una **lista de pasos**, no una acusación.

### 5.6 Persona de 62 años con texto grande
Usa «muy grande». → botones de 44 px, cifras grandes, nada que dependa del color, A / A+ / A++.

### 5.7 Propietario de Pastel (concede acceso)
Quiere que el estado «sin acceso» sea claro y **no genere soporte**. → 403 con «a quién pedirlo».

## 6. Mecanismos concretos (con límites)

| Mecanismo | Qué hace | Límite / cuidado |
|---|---|---|
| **«Su situación» arriba** | Responde la pregunta que todos traen: «¿cuánto me toca?» | Para quien está al día se dice «Está al día», no «0» |
| **Saldo en palabras + barra con eje** | Entiende de un vistazo quién da y quién recibe | La barra es decorativa; el texto lleva el significado |
| **Liquidación como recibo** | Objeto conocido; pasos concretos | No registra pagos (D6) |
| **Copiar monto** | Evita errores al teclear en SINPE | Propuesta no aprobada; no guarda datos bancarios |
| **Centavos con explicación** | «Sobran N unidades mínimas… las partes suman exacto» | Solo aparece si sobran |
| **Gestión de gastos con borrador** | Carga y corrige muchos gastos en una hoja; nada cambia hasta «Guardar» y, si una celda es inválida, no se guarda nada | Es para pantallas grandes y administración; el diálogo individual sigue para el día a día |
| **«Por qué queda saldado»** | Cada persona comprueba su número (pagó, parte, recibe o aporta) | Es una explicación, no una confirmación de pagos (D6) |
| **Pagos propios resaltados** | La persona encuentra «lo mío» sin leer todo | Los demás siguen visibles (transparencia) |
| **Página de invitación** | Reduce abandono de quien no tiene cuenta | No cambia D3 |
| **Bloqueo por intentos** | Protege el código de 4 dígitos (10 000 combinaciones) | 5 fallos por cuenta y enlace, 15 min |

## 7. Riesgos

- **Código de 4 dígitos:** con 5 intentos por cuenta y enlace, un atacante con **muchas cuentas** podría probar; el token del enlace (≥ 128 bits) es la defensa principal. Considerar límite global por enlace.
- **Enlaces filtrados:** no vencen (decisión); regenerar es manual.
- **Percepción de injusticia (D6):** puede hacer que los grupos se dividan o dejen de usar la app.
- **Comparativas comerciales sesgadas (C):** no basar decisiones de precio en ellas.
- **Dependencia de SINPE:** si cambia (QR, alias), el flujo «Copiar monto» puede quedar corto.

## 8. Métricas (sin vanidad)

Ver `REQUERIMIENTOS-BALANCE.md` §12: tiempo al primer gasto, embudo de invitación, disputas, grupos que llegan a «cuentas claras».

## 9. Guía para entrevistar de verdad (5–8 personas que ya compartan gastos)

1. «Cuénteme el último gasto compartido. ¿Cómo lo resolvieron?» (sin mostrar la app)
2. «¿Hubo algo incómodo? ¿Qué pasó?» — escuchar vergüenza, desconfianza, atrasos.
3. «¿Cómo se pagaron?» (¿SINPE, efectivo?) — validar «Copiar monto».
4. Tarea: «Registre que usted pagó ₡12 500 de gasolina» (¿dónde duda? ¿qué escribe en el monto?).
5. Mostrar Saldos y Liquidar: «¿Qué entiende de esta pantalla? ¿Qué sentiría si fuera Elena?»
6. Simular la invitación: «Le llega este enlace por WhatsApp; ¿qué hace?» (¿crea cuenta?).

## 10. Preguntas abiertas

Las de `REQUERIMIENTOS-BALANCE.md` §15 (41 vs 40 monedas, cuenta obligatoria, equidad, «Copiar monto», vencimiento del enlace, texto para WhatsApp, notificaciones), más: **¿cuántas personas tiene un grupo típico?** (el diseño asume 3–20; G26 prueba 20).
