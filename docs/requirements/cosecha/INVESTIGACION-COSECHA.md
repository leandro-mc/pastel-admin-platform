# Cosecha · investigación por actor (v2)

> **Cómo leer este documento.** Las «entrevistas» son **simuladas**: las construí a partir de la investigación citada y del razonamiento sobre el contexto. Sirven para **generar hipótesis y requisitos**, no para reemplazar el trabajo de campo. Cada afirmación está etiquetada **[E]** *evidencia citada* o **[H]** *hipótesis por validar*. La §5 es la **guía para entrevistar de verdad** a cada persona.
> Evidencia: [`../research/NOTAS-COSECHA-AGORA-V2.md`](../research/NOTAS-COSECHA-AGORA-V2.md). Método: [`../METODO-DE-TRABAJO.md`](../METODO-DE-TRABAJO.md).

## 1. Qué problema resuelve (de verdad) esta app
No es «una app de agricultura». Es **un sistema de confianza y de caja** para un grupo de personas que, **sin experiencia de mercado**, quiere vender una fruta perecedera a compradores lejanos. Si falla la confianza entre productores y asociación, se venden por fuera; si falla la caja, se quiebra; si falla la calidad, se pierde al comprador. Por eso la app gira en torno a **cuatro promesas**: *prometer solo lo que se puede cumplir*, *pagar en fecha y explicar cómo se calculó*, *repartir de forma que se vea justa* y *resolver reclamos con reglas claras*.

## 2. Actores y qué ven en la app
| Actor | Usa la app | Ve | Nunca ve |
|---|---|---|---|
| Productor | **No** (recibe mensajes) | Su aviso, recibo, estado de cuenta | — |
| Enlace de zona | Sí (simple) | Fechas y cantidades de su zona | Montos |
| Gestor / Propietario | Sí | Todo lo operativo; propietario también permisos | — |
| Comercial | Sí | Mercado y reclamos (lectura) | Pagos a productores, precios internos |
| Acopio | Sí (móvil, sin señal) | Recepción | Precios y montos |
| Transportista | Sí (móvil) | Su ruta y su pago | Precios de fruta |
| Contabilidad | Sí | Dinero (lectura), exportes | Prospectos |
| Comprador | Portal | Sus pedidos, oferta, calidad, reclamos | Productores individuales |
| Junta / asociados | Indirecto | Informes y decisiones (política, fondo) | — |

## 3. Fichas por actor

### 3.1 Productor mayor, finca pequeña — *Don Mario, 62 años, 1,5 ha, Corredores*
- **Cómo ve el mundo** [H]: la tierra y la palabra valen; desconfía de intermediarios que «se quedan con lo suyo»; recuerda haber esperado semanas por un pago; prefiere tratar **con personas** que conoce. **Aversión al riesgo** alta: prefiere certeza de un pago menor que una promesa mayor y tardía [E: preferencia por pagos predecibles, Casaburi & Macchiavello].
- **Educación y tecnología** [H]: primaria o secundaria incompleta; WhatsApp sí (96 % de la población adulta con celular [E: CICOM-UCR]); **no contesta números desconocidos**; no desplaza la pantalla; mala vista [E: ictworks]. **Voz antes que texto** [E].
- **Entrevista simulada (hipótesis)**
  - *¿Qué le preocupa de vender la fruta?* — «Que la boten y no me digan por qué. Y que me paguen cuando se les antoje.»
  - *¿Qué hace cuando necesita plata y no le han pagado?* — «Le vendo al que pase, aunque pague menos.» **→ riesgo de venta por fuera.**
  - *¿Qué le hace confiar?* — «Que me expliquen el peso delante mío y me den un papelito.»
  - *¿Qué lo haría dejar la asociación?* — «Que cambien la fecha de pago sin avisar, o que me descuenten sin explicarme.»
  - *¿Cómo prefiere que le avisen?* — «Una llamada, o un mensaje de voz. Leer me cansa.»
- **Necesita → requisitos:** CV2-01 mensajes **de usted**, ≤ 3 líneas, **mismo número** guardado · CV2-02 **canal por persona** (WhatsApp / llamada / voz / enlace) · CV2-03 **recibo** con cifras grandes por cada entrega · CV2-04 **calendario de pago fijo** y estado de cuenta de 3 cifras · CV2-05 **explicación del reparto** («por qué me tocó esto»).
- **Lo que arruinaría la confianza:** fecha de pago movida; rechazo sin foto ni motivo; descuento por reclamos de lo ya aceptado.

### 3.2 Productora joven con smartphone — *Karla, 34 años, 0,8 ha, Pococí*
- [H] Sabe usar el teléfono, **poco tiempo** (trabaja fuera de la finca), quiere **ver su estado de cuenta sin llamar**; compara precios por WhatsApp con otros compradores → **riesgo de venta por fuera**. Valora la **transparencia** y puede **explicarles** a los demás.
- **Entrevista simulada:** *«Si me mandan el resumen claro, no tengo que llamar. Pero si el pago se atrasa, vendo afuera: tengo que pagar la escuela.»* **→** CV2-06 **adelanto de emergencia** acotado.

### 3.3 Productor sin WhatsApp — *Don Beto, 70 años*
- [H] No usa mensajería; confía en **vecinos**. [E] Las personas que no usan teléfono necesitan un **relevo humano de confianza** (arXiv 2601.11537; hrnstiftung). → CV2-07 **Enlace de zona** que lleva el aviso y **lo registra a su nombre**.

### 3.4 Gestor / propietario — *la persona que hoy hace todo*
- **Cómo ve el mundo** [H]: sobrecargado; teme **sobrevender**, **quedarse sin caja** y **equivocarse con plata ajena**; no tiene experiencia de mercado y necesita **un camino**, no solo herramientas. Aprende haciendo; valora que el sistema le diga **«qué sigue»**.
- **Entrevista simulada:** *¿Qué es lo más difícil? — «No saber a quién venderle ni a cuánto. Y llamar a ocho productores sin perder la mañana.»* *¿Qué lo desvelaría? — «Pagarle a los productores y que el comprador no me pague.»*
- **Necesita → requisitos:** CV2-08 **ruta de arranque** con conocimiento de mercado incorporado · CV2-09 **cola de convocatoria** de 1 toque · CV2-10 **caja a 8 semanas** y tope de capital de trabajo · CV2-11 **oferta prometible** y semáforo de demanda · CV2-12 deshacer y auditoría.

### 3.5 Comercial (apoyo para vender)
- [H] Puede ser joven, con facilidad digital; **teme escribir mal a un cliente** y **tocar plata de la asociación**; necesita **guiones**, plantillas y límites claros. → CV2-13 **guardas de cumplimiento** que explican el *por qué* del bloqueo · CV2-14 **no ve pagos ni precios a productores**.

### 3.6 Acopio — *Iván, 28 años*
- [H] Trabaja con guantes, a pleno sol, **sin señal**, con prisa y con productores mirando; **teme digitar mal un peso** y que lo culpen. → CV2-15 **pantalla enorme**, **foto** y **motivo** de rechazo, **sin conexión**, **sin precios** · CV2-16 **reloj de frescura** y aviso de temperatura.

### 3.7 Transportista — *Jorge, 45 años, flete independiente*
- **Cómo ve el mundo** [E/H]: ingreso por viaje; las **esperas** le cuestan plata y las **citas no se respetan**; teme **pagos tardíos** y **reclamos injustos** sin prueba [E: GAO-11-198; ATRI; thepacker.com]. 
- **Entrevista simulada:** *¿Qué es lo peor del trabajo? — «Esperar tres horas en un andén y que no me paguen nada de eso. Y si dicen que la fruta llegó mal, yo no puedo probar lo contrario.»*
- **Necesita → requisitos:** CV2-17 **ventana honrada** y **reloj de espera** con tarifa a partir de la 2.ª hora (a validar) · CV2-18 **prueba de entrega** (nombre, foto, hora, temperatura) · CV2-19 **pago prometido con fecha**.

### 3.8 Contabilidad — *Karen*
- [H] Quiere **exportes limpios** y que **cuadre**; teme **facturas faltantes** y cambios silenciosos. → CV2-20 CSV/Excel · CV2-21 ajustes **visibles**, nunca ediciones silenciosas · CV2-22 verificar con el contador la **factura electrónica** (obligación fiscal a confirmar).

### 3.9 Compradores
**a) Frutería / feria local.** [H] Margen estrecho; compra poco y seguido; valora **trato directo** y que **no le fallen**. **b) Chef de hotel/restaurante.** [E: barreras de chefs] prioriza **disponibilidad constante (52 %)** y **calidad constante (33 %)**, luego puntualidad; valora **aviso temprano** de problemas, **factura con cada entrega**, ficha de calidad y «la cara y el lugar» detrás del producto. **c) Mayorista/supermercado.** [H] Exige consistencia, factura, documentos; poca tolerancia al incumplimiento. **d) Importador.** [H] Evalúa riesgos, trazabilidad, calendario; compara con otros orígenes.
- **Entrevista simulada (chef):** *«Prefiero menos fruta pero segura. Si me van a fallar, avísenme antes, no cuando llega el camión.»*
- **Necesitan → requisitos:** CV2-23 **oferta semanal prometible** (nunca más de lo seguro) y **aviso proactivo** de cambios · CV2-24 **ficha de calidad** con aceptable / no aceptable · CV2-25 **reclamo con ventana de 8 h y 3 fotos**, reglas **antes** de comprar · CV2-26 **historia de la asociación** en el kit.

### 3.10 Junta / asociados
- [H] Quieren **decidir con información** y evitar peleas por plata; son quienes **ratifican** los parámetros (anticipo, fondo). → CV2-27 **informe de cierre de temporada** (ventas, pagos, reclamos, reparto del fondo) y **parámetros con acta**.

### 3.11 Aliados (PROCOMER, banca, ONG)
- [H] Buscan **tracción verificable**. → CV2-28 **reporte de impacto** (kg, productores, ingresos pagados, destinos).

## 4. Hallazgos transversales
1. **Confianza** es el cimiento de la adopción y de la lealtad [E]. Se construye con **previsibilidad** (fecha fija), **transparencia** (recibo, estado de cuenta, reglas escritas) y **justicia percibida** (reparto explicado, reclamos sin descuentos sorpresa).
2. **El teléfono llega; la pantalla no.** Productores: mensajes; equipo: app. [E]
3. **La poscosecha manda** el calendario: modelo *pull* y reloj de frescura. [E]
4. **El cuello de botella no es técnico: es de caja y de confianza.** [E/H]
5. **La asociación necesita conocimiento de mercado**, no solo registros: ruta de arranque y fuentes guiadas.

## 5. Guía para entrevistar de verdad (productores)
**Antes:** pedir **permiso** (y para grabar, **consentimiento escrito u oral registrado**); entrevistar **en la finca**, no en la oficina; 30–45 min; **no prometer** funciones; llevar café.
**Preguntas abiertas (sin inducir):**
1. Cuénteme cómo fue la **última** vez que vendió su fruta. ¿A quién, a cuánto, cuándo le pagaron?
2. ¿Qué le ha salido **mal** alguna vez con una venta? ¿Qué hizo?
3. Cuando necesita plata de golpe, ¿qué hace? ¿Con qué frecuencia pasa?
4. ¿Cómo le gusta que le avisen: llamada, mensaje, voz, persona? ¿A qué hora?
5. ¿Qué haría que usted **confiara** en un grupo que le vende su fruta? ¿Qué lo haría **irse**?
6. ¿Quién en su comunidad le explica las cosas cuando no entiende?
7. (Mostrar el **estado de cuenta** impreso) Dígame con sus palabras: ¿cuánto le falta y cuándo se lo pagan?
**Registrar:** frases textuales (no interpretaciones), emociones, **qué hace hoy** en cada situación. **Después:** resumir y **devolver** lo entendido al entrevistado («¿le entendí bien?»).
**Variantes:** compradores (¿qué le hace dejar a un proveedor?, ¿cómo reclama hoy?), transportistas (¿última vez que esperó?, ¿qué prueba tiene?), acopio (¿cómo anota hoy?, ¿qué pasa sin señal?).

## 6. Requisitos derivados → dónde se ven en el prototipo
| ID | Requisito | Dónde |
|---|---|---|
| CV2-01/02 | Mensajes de usted, canal por persona | Envíos (cola), Productores, vista «WhatsApp» |
| CV2-03/04/05 | Recibo, estado de cuenta, explicación del reparto | Recepción, Dinero, «¿Por qué esta cantidad?» |
| CV2-06 | Adelanto de emergencia | Dinero → Pagos |
| CV2-07 | Enlace de zona | Mi zona |
| CV2-08–12 | Ruta de arranque, cola, caja, oferta prometible | Mercado, Envíos, Dinero, Hoy |
| CV2-13/14 | Guardas y separación de datos | Mercado → Contacto; matriz de roles |
| CV2-15/16 | Recepción móvil sin señal, sin precios, reloj de frescura | Recepción (Acopio) |
| CV2-17/18/19 | Espera pagable, prueba de entrega, pago con fecha | Mi ruta |
| CV2-20–22 | Exportes, ajustes visibles, factura (verificar) | Dinero |
| CV2-23–26 | Oferta prometible, ficha de calidad, reclamo con ventana, historia | Portal del comprador, Reclamos, Kit |
| CV2-27/28 | Informe de temporada e impacto | F2 |

## 7. Riesgos y preguntas abiertas
Riesgo de **sesgo del investigador** (usted y yo asumimos cosas) → validar en campo. ¿Qué porcentaje de productores **no** tiene teléfono propio? ¿Quiénes son los **enlaces de zona** naturales? ¿Qué calibre/tiempo define A/B según el técnico? ¿Qué tarifa de espera aceptan transportistas y compradores? ¿La asociación tiene **personería** y registros para facturar?
