# Cosecha — Requerimientos v2 (levantamiento profundo)

> **Estado:** propuesta para validación del propietario · **Rama:** `research/requirements-and-prototypes` · **Fecha:** 2026-10-23
> **Prototipos:** [`prototype-operacion/`](prototype-operacion/index.html) (Hoy · planificador de envío con reparto real · recepción · liquidación) · [`prototype-mercado/`](prototype-mercado/index.html) (Ruta de arranque · pipeline · secuencias con guardas de cumplimiento · kit comercial)
> Amplía `docs/modules/COSECHA.md`. El MVP actual resuelve muy bien **una parte** de la cadena (operar un envío). Este documento recorre **toda** la cadena, desde "no conozco a ningún comprador" hasta "cerré la temporada y sé qué hacer mejor el próximo año".

---

## 0. Resumen ejecutivo

**La situación de partida real:** una asociación de pequeños productores de mamón chino (rambután) —típicamente de 1–2 ha por finca— sin experiencia de mercado, sin contactos con compradores, lejos de los clientes, con una sola persona operando (el propietario como superusuario, quizá 2–3 apoyos), y productores que **no usan tecnología**.

**Lo que el MVP asume y no existe todavía:** que ya hay pedidos. Sin compradores, el mejor planificador de envíos está vacío. Por eso Cosecha v2 se organiza en **cinco motores** y una guía para quien empieza:

| Motor | Pregunta que responde | MVP | v2 |
|---|---|---|---|
| **1. Mercado** | ¿A quién le vendo y cómo lo convenzo? | — | Directorio, pipeline, secuencias de contacto, muestras, cotizador, kit comercial público |
| **2. Oferta** | ¿Cuánto puedo *prometer* y cuándo? | Capacidad estimada | Pronóstico semanal por productor, "oferta prometible", demanda vs. oferta |
| **3. Operación** | ¿Cómo lo recolecto, empaco y entrego sin perder fruta? | Núcleo sólido | + lotes, reloj de frescura, frío, empaque, ruta, reclamos, equidad |
| **4. Dinero** | ¿Gano?, ¿puedo pagar a tiempo? | Liquidación y margen informativo | + costos y precio mínimo, flujo de caja, cuentas por cobrar, comprobantes |
| **5. Cumplimiento** | ¿Tengo los papeles para vender aquí? | — | Bóveda, checklists por mercado, trazabilidad |
| **Guía** | ¿Qué hago esta semana? | — | **Ruta de arranque** con conocimiento de mercado incorporado |

**Tres decisiones que cambian el producto** (detalle en [`../DECISIONES-Y-HALLAZGOS.md`](../DECISIONES-Y-HALLAZGOS.md)):

1. **No existe "contacto masivo por WhatsApp en frío".** Las políticas de WhatsApp Business exigen consentimiento previo y plantillas aprobadas, y penalizan con bloqueo; ese número es además el que se usa con los productores. La prospección automatizada se hace por **correo B2B** (con guardas legales y de entregabilidad), **llamadas asistidas** y un **kit comercial público** que atrae solicitudes entrantes. WhatsApp se usa **solo con quien ya respondió** (§7.4).
2. **El modelo es "pull":** no se pide fruta a productores sin demanda confirmada. La fruta se oscurece en ~3–4 días sin frío (§2): improvisar cuesta producto y reputación.
3. **La equidad es una función, no un deseo:** el reparto proporcional se complementa con un **balance de equidad** y una explicación "por qué me tocó esto", porque la confianza de los productores en una asociación depende de que el reparto se perciba justo (§8.2).

---

## 1. Diagnóstico del MVP

**Lo que se conserva (es bueno):** un operador único; productores sin cuenta; algoritmo de reparto proporcional con tope y mayor resto; montos con `acceptedKg × precio`; registro de cambios con nota; WhatsApp sin API (`wa.me`); teléfono CR normalizado; CSV Excel-friendly; estados de pedido/envío/entrega; auditoría de cierres y pagos; mobile-first.

**Lo que falta frente al objetivo "empezar desde cero y posicionar el producto":**

| Brecha | Efecto |
|---|---|
| No hay descubrimiento ni seguimiento de compradores | La app solo sirve a quien ya vendió |
| No hay pronóstico de oferta | Se promete sin saber; riesgo de incumplir al primer comprador |
| Sin lotes ni reloj de frescura | No se puede explicar ni prevenir una pérdida por frío |
| Sin costos/precio mínimo ni flujo de caja | La asociación puede vender "bien" y quedarse sin caja (paga a productores antes de cobrar) |
| Sin cotizaciones, muestras ni materiales comerciales | Cada venta se improvisa |
| Sin documentos ni listas de requisitos por mercado | Se descubre tarde que faltaba un papel |
| Un único rol operativo (Gestor) | No se puede dar un acceso acotado a un apoyo |
| Sin modo sin conexión | La recepción ocurre en fincas con cobertura inestable |
| Temporada tratada como estática | Hoy (23 oct) la temporada **está terminando**; lo valioso ahora es cerrar y prospectar 2027 |

**Cambio de nombre propuesto:** el `Campaign` del MVP (campaña = temporada) pasa a **`Season`/"Temporada"**, para no chocar con las *campañas de contacto* (que se llamarán **Secuencias**).

---

## 2. Investigación aplicada (fuentes en [`../research/FUENTES.md`](../research/FUENTES.md))

| Hallazgo | Decisión |
|---|---|
| En Costa Rica la fruta está en manos de **pequeños productores** (1–2 ha); la temporada va de **julio a inicios de noviembre**; se vende en supermercados, ferias y se exporta (EE. UU., Canadá; Europa y Chile en distintas etapas); hay productos industrializados en desarrollo (UCR/TEC: harina de cáscara, etc.) | El producto comercial no es solo "fruta fresca": se modela **segmento procesado/industrial** para absorber descarte y sobreproducción |
| Asociaciones de referencia: una de la región Brunca con ~115 socios y ~550 t estimadas; en 2009 hubo ~400 productores y ~800 ha | Diseñar para **10–300 productores** |
| **Poscosecha:** sin frío la cáscara/espinas se oscurecen en **3–4 días**; a temperatura ambiente las espinas se deshidratan en ~48 h sin envoltura; **~10 °C** es la mejor temperatura (a 7 °C hay daño por frío); en frío dura ~10–14 días; el *hidroenfriado* subió de 4–6 a 10–14 días en un estudio; para exportación se cosecha con el cuerpo rojo y espinas aún verdes; **planificar la cosecha según la fecha y volumen que pide el comprador** | "Reloj de frescura" por lote; modelo *pull*; parámetros de vida útil **configurables** (los valores por defecto deben validarse con un técnico) |
| El **mercado de importación** de fruta exótica en Europa se canaliza por mayoristas y centros de distribución; los datos específicos de rambután son escasos; existen programas de apoyo a la importación (p. ej. el de CBI, de Países Bajos); las ferias *Fruit Logistica* (Berlín) y *Fruit Attraction* (Madrid) reúnen importadores | "Calendario de ferias" y **fuentes guiadas** de prospección (§6.2) |
| **Admisibilidad** de ingreso depende de cada país y producto (p. ej. EE. UU. aprueba por producto y origen; los textos consultados no son concluyentes para Costa Rica) | Matriz de admisibilidad con estado **"Por verificar"** (con SFE/PROCOMER); **nunca** se asume |
| **WhatsApp Business:** el mensaje saliente fuera de una conversación activa exige **opt-in** y **plantillas aprobadas**; la prospección en frío afecta la calidad de la cuenta y puede terminar en restricción o bloqueo; las herramientas no oficiales de envío masivo suelen acabar en bloqueos permanentes | WhatsApp = **solo contactos con consentimiento o que respondieron**; mensajes a productores desde una línea **separada** de cualquier prospección |
| **Correo B2B en frío:** es legal en la mayoría de jurisdicciones bajo condiciones. EE. UU. (CAN-SPAM): identidad real, dirección física, baja efectiva (≤10 días hábiles). UE/Reino Unido (RGPD): **interés legítimo documentado**, correos de rol profesional. Canadá (CASL): la más estricta, exige consentimiento (expreso o tácito). Los buzones imponen: SPF+DKIM+DMARC, **baja en un clic** atendida en ≤2 días, quejas < ~0,3 %, rebotes < ~2 % | Motor de secuencias con **guarda por país**, lista de supresión global, registro de base legal, comprobador de dominio (§7.3) |
| Los costarricenses usan WhatsApp masivamente (96 % de adultos con celular) | Toda comunicación con productores es por **WhatsApp de una persona real**, con un toque; no por una app que ellos deban abrir |
| La confianza en intermediarios es el cuello de botella clásico de la agricultura asociativa (precio opaco, pagos tardíos, rechazos no explicados) | **Comprobante de recibo** y **estado de cuenta simple** por WhatsApp; reparto explicable |

---

## 3. Actores y empatía

> Se redactan como personas para decidir con ellas en mente. Son **arquetipos**, no datos reales.

| Actor | Situación | Miedos | Necesita | Qué hace Cosecha por él |
|---|---|---|---|---|
| **Productor** (*don Mario*, 62 años, 1,5 ha, WhatsApp, sin correo) | Cosecha cuando la fruta está; no sabe a quién se vende ni a cuánto | Que rechacen su fruta sin explicación; que le paguen tarde o menos; que lo dejen fuera del reparto | Saber **cuánto, cuándo, dónde y a cuánto**; cobrar a tiempo; respeto | Mensajes cortos y claros por WhatsApp (de usted); recibo por cada entrega; estado de cuenta; reparto explicado. **No instala nada** |
| **Gestor / superusuario** (propietario) | Hace todo: vende, planifica, llama, paga | Sobrevender; quedarse sin caja; equivocarse con plata ajena; no saber "qué sigue" | Un camino guiado, automatización, menos decisiones, números en los que confiar | Ruta de arranque, "Hoy", automatización de contacto con guardas, caja proyectada, deshacer |
| **Colaborador comercial** (apoyo 1) | Busca clientes, hace llamadas, envía muestras | Escribir mal a un cliente; tocar dinero de la asociación | Lista de pendientes, guiones, plantillas, ver solo lo comercial | Rol **Comercial**: ve Mercado, no ve pagos ni precios a productores |
| **Colaborador de acopio** (apoyo 2) | En el punto de recibo, con prisa, con guantes, sin señal | Digitar mal un peso | Pantalla enorme, números grandes, funcionar sin internet, foto del problema | Rol **Acopio** en "modo campo": solo Recepción; sin precios |
| **Comprador local** (fruterías, ferias, restaurantes, hoteles, procesadores) | Quiere fruta firme, entrega puntual, precio claro | Fruta oscurecida; que no llegue | Ficha clara, precio, disponibilidad real, respuesta rápida a un reclamo | Kit comercial, pedidos con fecha, aviso de entrega, canal de reclamo |
| **Comprador mayorista/supermercado** | Exige consistencia, facturación, documentos | Quedarse sin producto en góndola | Proveedor confiable y formal | Checklists de proveedor, facturación (F3), calidad por lote |
| **Importador / exportador aliado** | Evalúa riesgos, volúmenes, papeles | Rechazos en destino | Trazabilidad, certificados, calendario de oferta | Bóveda de documentos, oferta semanal, lote → envío |
| **Transportista** | Rutas con ventanas de hora | Esperar en la finca; fruta sin frío | Hoja de ruta con paradas y contactos | Hoja de ruta imprimible/WhatsApp; registro de temperatura (opc.) |
| **Contador** | Necesita ventas/compras ordenadas | Facturas faltantes | Exportes limpios | CSV/Excel; (F3) integración de factura electrónica *(verificar con el contador)* |
| **Aliados** (PROCOMER, ONG, banca) | Quieren evidencia de tracción | — | Reporte de impacto | Reporte: kg, productores, ingresos pagados, destinos |

---

## 4. Principios de diseño

1. **Un solo "siguiente paso".** Cada pantalla vacía propone la próxima mejor acción (no tablas vacías).
2. **Cero pérdida de datos:** guardado local primero; reintento; nunca "perdió lo escrito".
3. **Todo lo que mueve dinero o cantidades es reversible o auditable** (deshacer 10 s + registro).
4. **El teléfono es el computador principal.** Se diseña desde 360 px; escritorio es ampliación (el panel de mercado sí gana con pantalla grande).
5. **Lo importante, grande; lo raro, escondido.** Botones ≥ 48 px, números con `inputmode="decimal"`.
6. **Nada depende del color.** Icono + texto + color (estado).
7. **Hablar como persona de Costa Rica:** ₡ 58 500,00 · kg con dos decimales · "jue 29 oct" · mensajes a productores **de usted**.
8. **Automatizar con freno:** el sistema **prepara**, la persona **aprueba**; lo que sale al exterior pasa por guardas.

---

## 5. Cadena de valor completa y qué hace Cosecha en cada etapa

| # | Etapa | Dolor típico | Qué hace Cosecha | Automatización | Fase |
|---|---|---|---|---|---|
| 1 | Definir producto y precio | No sabe su costo real ni su precio mínimo | Calculadora de costo por kg; ficha de producto (calibres, empaques) | Cálculo y alertas de margen | F1 |
| 2 | Encontrar compradores | No conoce a nadie | Fuentes guiadas, directorio, importación CSV, puntuación de encaje | Deduplicación, puntuación, (F3) prospector asistido | F1–F3 |
| 3 | Contactar | Miedo/ignorancia | Secuencias por correo con guardas; tareas de llamada con guion | Envío escalonado, parada al responder, tareas automáticas | F2 |
| 4 | Convencer | No tiene materiales | **Kit comercial público** (ES/EN) y PDF de una página | Generado desde el producto y la oferta | F1 |
| 5 | Muestras | Se pierden en el correo/courier | Flujo de muestras con seguimiento y retroalimentación | Recordatorios | F1 |
| 6 | Cotizar y acordar | Precios improvisados | Cotizador con costo + margen + Incoterm; PDF | Borrador asistido por IA | F1 |
| 7 | Prometer oferta | Sobreventa | Pronóstico semanal y "oferta prometible" | Semáforo demanda/oferta | F1 |
| 8 | Planificar envío | Reparto a ojo | Reparto proporcional + **equidad** | Sugerido | F1 |
| 9 | Convocar productores | Llamadas sin fin | **Cola de WhatsApp de 1 toque** + registro de respuesta; plan B automático | Mensaje prellenado; redistribución | F1 |
| 10 | Recolectar/recibir | Disputas de peso y calidad | Recepción en modo campo (offline), fotos, motivos de rechazo, **lote y reloj de frescura**, recibo | Lote automático; recibo por WhatsApp | F1–F2 |
| 11 | Frío y empaque | Fruta que se pasa | Existencias en frío (PEPS), formatos y materiales | Alertas de vencimiento | F2 |
| 12 | Transporte y entrega | Retrasos | Hoja de ruta; confirmación de entrega con foto | Mensaje al comprador "salió/llegó" | F2 |
| 13 | Reclamos | "Llegó oscura" y nadie sabe por qué | Reclamo con foto, kg afectados, resolución y causa | Análisis por lote/ruta/productor | F2 |
| 14 | Cobrar | Caja en rojo | Cuentas por cobrar, vencimientos, recordatorios | Recordatorio por WhatsApp/correo (a quien consintió) | F2 |
| 15 | Pagar a productores | Tardanza = desconfianza | Liquidación, anticipos, **comprobante**, estado de cuenta | Cálculo; recordatorios | F1 |
| 16 | Papeles | Falta un documento | Bóveda + checklist por mercado | Alertas de vencimiento | F2 |
| 17 | Aprender | Se repiten errores | **Cierre de temporada** con lecciones y prellenado del próximo año | Informe automático | F2 |

---

## 6. Motor de Mercado

### 6.1 Escalera de mercados (desde cero, sin saltarse peldaños)

| Peldaño | Quién | Requisitos típicos | Ticket | Riesgo principal |
|---|---|---|---|---|
| **0 · Cercano directo** | Ferias, fruterías, restaurantes, hoteles, heladerías/jugos | Fruta, precio, entrega | Bajo | Volumen irregular |
| **1 · Nacional formal** | Mayoristas, supermercados | Facturación, consistencia, ficha, a veces certificaciones | Medio | Pago a plazo largo |
| **2 · Regional** | Compradores de Centroamérica/Panamá | Documentos de exportación, transporte | Medio | Logística y papeles |
| **3 · Exportación con socio** | Exportador/consolidador que ya tiene registros | Contrato, calidad, calendario | Alto | Dependencia del socio |
| **4 · Exportación directa** | Importadores en EE. UU./UE/Canadá | Registros SFE, certificado fitosanitario, admisibilidad vigente, frío | Alto | Complejidad y capital |

La app muestra **en qué peldaño está la asociación** y qué checklist desbloquea el siguiente. Recomendación por defecto: **0 → 1 en la próxima temporada**, y **3** (con socio) como primera exportación.

### 6.2 Fuentes guiadas ("dónde buscar")
Biblioteca editable de recetas, cada una con pasos, ejemplo de búsqueda y plantilla de importación: búsqueda en mapas/directorios locales ("frutas y verduras mayoristas", "fruterías", "hoteles"); programas y ruedas de negocios de PROCOMER; listados de expositores de **Fruit Logistica** y **Fruit Attraction**; directorios sectoriales (p. ej. *Produce Blue Book*); datos de comercio y precios (p. ej. Tridge) para dimensionar mercados; perfiles de importadores en LinkedIn; recomendaciones de clientes actuales. Cada receta indica **qué dato guardar y con qué base legal** (§7.3).

### 6.3 Directorio de prospectos (`Lead`)
Organización, tipo (feria, frutería, restaurante/hotel, procesador, mayorista, supermercado, importador, exportador aliado), país/ciudad, web, **contactos** (nombre, rol, correo, teléfono; estado de consentimiento por canal), **fuente**, volumen estimado, ventana de temporada, requisitos, **etapa**, **puntuación de encaje explicable**, próxima acción y fecha, responsable, motivo de pérdida, riesgo de pago.
**Etapas:** Nuevo → Investigado → Contactado → Respondió → Muestra → Cotizado → Negociación → **Cliente** · Perdido (con motivo) · **No contactar**.
**Puntuación de encaje (0–100, explicable):** tipo de comprador (30) + encaje de volumen (20) + ventana de temporada (15) + requisitos que ya cumplimos (15) + canal disponible con base legal (10) + señales de interés (10). Se muestra el desglose; el propietario puede ajustar los pesos.

### 6.4 Importación y calidad de datos
CSV/pegar lista → mapeo de columnas → deduplicación por dominio/correo → validación (sintaxis, MX, correo "de rol" vs. personal) → clasificación del tipo por IA con revisión (**nunca inventa correos**; solo clasifica lo que ve) *(F2)*.

### 6.5 Kit comercial público
Página `/cosecha/oferta/:token` (enlace-capacidad, `noindex`) en ES/EN con: ficha del producto (variedad, calibres, empaques, pedido mínimo), **calendario de disponibilidad** (barras semanales; nunca nombres de productores), fotos/video, calidad y manejo de frío, certificaciones y documentos *vigentes*, Incoterms ofrecidos, preguntas frecuentes (vida útil, transporte) y formulario **"Pedir muestra / cotización"** que crea un `Lead` entrante (base legal: solicitud del interesado). Se acompaña de un **PDF de una página** y un **QR** para ferias. Reutiliza el motor de PDF de Huella (proyecto compartido `Pastel.Documents`, por CCR).

### 6.6 Cotizador
Costo por kg (§9.1) + margen objetivo + empaque + flete + trámites → **precio por Incoterm** (EXW/FCA/FOB/CIP según el peldaño), validez, condiciones de pago según **riesgo del comprador** (*comprador nuevo en exportación: prepago o carta de crédito; verificar opciones con el banco*). PDF ES/EN. Aceptada → se convierte en **Pedido**.

### 6.7 Muestras
`Sample {lead, kg, courier, guía, costo, estado, fecha, retroalimentación}`: Solicitada → Enviada → Recibida → Con retroalimentación. El costo se imputa a mercadeo. Recordatorio automático a los 3 días de recibida.

### 6.8 Ferias y eventos
Calendario (p. ej. *Fruit Logistica* —febrero, Berlín—, *Fruit Attraction* —octubre, Madrid—, ferias locales del mamón chino, ruedas de negocios de PROCOMER) con **lista de preparación** y **captura rápida de contactos** en el stand (formulario móvil; OCR de tarjeta en F3).

### 6.9 Inteligencia de precios
Registro manual de precios observados (canal, fecha, moneda, kg, fuente) → gráfica y rango; alimenta la sugerencia de precio mínimo.

### 6.10 Tablero
Kanban por etapa, embudo y conversión por fuente/segmento/canal. Vista "Hoy": 5 próximas acciones comerciales.

---

## 7. Automatización del contacto (con freno)

### 7.1 Qué se automatiza y qué no
| Canal | Frío (sin relación) | Con consentimiento / respondió |
|---|---|---|
| **Correo B2B** | **Sí**, con secuencia y guardas | Sí |
| **Llamada** | **Asistida:** tarea con guion y registro de resultado | Sí |
| **WhatsApp** | **No** (riesgo de bloqueo y de reputación) | Sí: `wa.me` de 1 toque (F1); API oficial con plantillas (F3) |
| **LinkedIn / redes** | Tareas manuales con texto sugerido (sin automatizar: viola términos de uso) | Manual |
| **Formulario del kit** | Entrante (el interesado inicia) | — |

### 7.2 Secuencia estándar (editable)
Día 0 presentación breve + enlace al kit · Día 4 seguimiento (valor distinto: calendario de oferta) · Día 9 oferta de muestra · Día 16 cierre cortés. **Se detiene** al haber respuesta, rebote, baja o queja. Ritmo de calentamiento del buzón: 10 → 20 → 30 → máx. 40 envíos/día por buzón; horario laboral del destinatario; sin fines de semana. Personalización por campo (nombre, tipo, país, idioma) y **primera línea redactada con IA a partir del sitio web del prospecto** (revisión obligatoria).

### 7.3 Guardas de cumplimiento (bloquean el envío si no se cumplen)
| Guarda | Regla |
|---|---|
| **País** | UE/RU: solo correos de rol profesional + texto de **interés legítimo** documentado; Canadá: solo con consentimiento expreso o tácito *(verificar)*; EE. UU.: pie con dirección física y baja; Costa Rica: respetar la ley de protección de datos *(verificar con asesoría)* |
| **Identidad** | Remitente real, asunto fiel, dominio propio (no correos gratuitos) |
| **Autenticación** | SPF, DKIM y DMARC verificados por la app (semáforo) antes de habilitar secuencias |
| **Baja** | Cabecera de baja en un clic + página de baja; atendida de inmediato; **lista de supresión global** entre secuencias |
| **Calidad** | Rebotes > 2 % o quejas > 0,3 % → **pausa automática** |
| **Datos** | Cada contacto guarda **fuente y base legal**; botón "Olvidar a esta persona" |
| **Separación** | La línea de WhatsApp de operación (productores) nunca se usa para prospección |

### 7.4 WhatsApp
Con productores: cola de 1 toque con mensaje prellenado y registro de respuesta (§8.3). Con clientes que ya respondieron: `wa.me` o, en F3, **API oficial** con plantillas aprobadas, opt-in registrado por categoría y baja inmediata. No se usan herramientas no oficiales.

---

## 8. Motores de Oferta y Operación

### 8.1 Oferta y capacidad
- **Productor 360:** finca (ha, árboles, variedades, edad), ubicación, **semanas de cosecha declaradas** (inicio/pico/fin), capacidad por temporada, preferencia de contacto (llamada/WhatsApp/nota de voz; mejor hora), método de pago (efectivo/SINPE/transferencia), consentimiento de datos y mensajes.
- **Pronóstico semanal:** el sistema pide "actualizar estimación (hace 9 días)" con controles ±; sin formularios largos.
- **Oferta prometible por semana** = Σ estimación × factor de confiabilidad (configurable, inicial 0,8) → es la cifra que se muestra a compradores (redondeada, anónima).
- **Semáforo demanda/oferta:** no se confirman pedidos por encima de oferta × 0,9.

### 8.2 Reparto (conserva el algoritmo del MVP y añade equidad)
Se mantiene: proporcional a capacidad, topes con redistribución, mayor resto, determinista, `shortfallKg`. **Añadido (configurable):** peso efectivo `w'ᵢ = wᵢ × (1 + k × déficitᵢ)`, con `déficitᵢ = (parte justa − parte recibida)/parte justa`, acotado a ±30 % y `k` inicial 0,5. Cada cuota se acompaña de **"por qué"** ("capacidad 30 kg; +4 % por haber quedado corto en el envío anterior"). El prototipo reproduce los casos del plan de pruebas del MVP y los verifica en Node.

### 8.3 Convocatoria a productores
Cola "Siguiente: don Mario → *Abrir WhatsApp*" (mensaje de usted prellenado) → respuesta con tres botones: **Confirmó · No puede · No contestó (reintentar a las 3:00 p. m.)**. Si no puede: la app propone la redistribución y muestra quién tiene holgura. Todo en la misma pantalla; sin envío automático.

### 8.4 Recepción en modo campo
Pantalla de acopio: productor, **peso** (teclado numérico enorme), **rechazo** con motivo (golpeado, inmaduro, plaga/hongo, calibre, sucio) y **foto**, calidad, **hora de cosecha** (la dice el productor) y de llegada → **lote automático** `RB-AAMMDD-P07` y **reloj de frescura** (tiempo desde la cosecha; alerta según vida útil configurada). Funciona **sin conexión** (cola local que sincroniza; conflicto → se conserva ambas versiones y se pide decidir). Genera **recibo** (imagen/PDF) enviable por WhatsApp al productor.

### 8.5 Frío, empaque y transporte
Existencias en cuarto frío con PEPS y marca "hidroenfriado"; formatos de empaque y materiales con alerta de mínimos; hoja de ruta (paradas, contactos, ventana horaria) imprimible/WhatsApp; confirmación de entrega con foto y nombre de quien recibe; temperatura opcional.

### 8.6 Reclamos
`Claim {pedido, lote, kg afectados, foto, causa (cosecha/frío/transporte/otra), resolución (crédito/reposición/descuento), responsable}`. Política configurable de **quién absorbe** la pérdida (por defecto: la asociación hasta definir una regla pactada con los productores). Informe de causas por lote/ruta.

---

## 9. Motor de Dinero

### 9.1 Costo y precio mínimo
Por kg: pago al productor + empaque + flete finca→acopio + frío + mano de obra de acopio + flete/seguro al cliente + trámites (certificados, etc.) + gestión de la asociación (%) + **merma esperada (%)** = **costo puesto en destino**. Con **margen objetivo** → **precio mínimo por canal** y **punto de equilibrio** (kg/semana). Moneda CRC/USD con tipo de cambio manual.

### 9.2 Pagos a productores
Se conserva la liquidación del MVP. **Añadido:** anticipos; deducciones acordadas; **modelo de pago** configurable (a X días fijos / al cobrar / liquidación final con ajuste); **comprobante** y **estado de cuenta simple** por WhatsApp.

### 9.3 Flujo de caja (el riesgo oculto)
Proyección 8 semanas: entradas esperadas (cuentas por cobrar por vencimiento) vs. salidas (pagos a productores por modelo) → alerta "en la semana del 12 nov faltarían ₡ 1 240 000". La mayor causa de quiebre de una asociación que vende bien es pagar antes de cobrar.

### 9.4 Cuentas por cobrar
Facturas (F3: integración de factura electrónica con un proveedor autorizado; **verificar obligaciones con el contador**), vencimientos, antigüedad, recordatorios, abonos.

### 9.5 Margen real
Por envío, comprador, canal y temporada, contra lo planeado.

---

## 10. Cumplimiento y documentos

- **Bóveda** (asociación, fincas, envío, comprador) con vencimientos y alertas. Datos personales sensibles del productor, solo los mínimos.
- **Checklists por peldaño/mercado**, sembrados con el contenido que sabemos (registros SFE, certificado fitosanitario, admisibilidad vigente, factura, lista de empaque, documento de transporte) y marcados **"verificar con SFE/PROCOMER"**. El propietario edita y marca cumplido.
- **Trazabilidad:** productor → lote → envío → comprador; **simulación de retiro**: "¿a quién le llegó fruta del lote RB-261023-P07?".
- *(F3)* Cuaderno de aplicaciones de agroquímicos con intervalos previos a la cosecha (exigido por muchos compradores).

---

## 11. Equipo, roles y permisos

| Rol | Mercado | Operación | Recepción | Dinero | Documentos | Equipo/Config |
|---|---|---|---|---|---|---|
| **Owner / Superusuario** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Gestor** | ✔ | ✔ | ✔ | ✔ | ✔ | ver |
| **Comercial** | ✔ | solo lectura de oferta | — | — | kit y cotizaciones | — |
| **Acopio** | — | ver envío del día | ✔ (modo campo, sin precios) | — | — | — |
| **Contabilidad** | — | — | — | ✔ lectura/exportar | ✔ | — |
| **Comprador** | — | sus pedidos (lectura) | — | — | — | — |

- **"Ver como…"**: el propietario previsualiza lo que ve cada rol antes de invitar.
- **Invitación temporal** (caduca) y revocación inmediata. Solo el Owner concede acceso (decisión existente).
- Acciones de dinero e invitaciones: **confirmación reforzada**.
- Auditoría de todo lo sensible (cierres, pagos, precios, cantidades, exportes, accesos).

---

## 12. UX: pantallas y flujos

**Navegación móvil (5 pestañas):** **Hoy · Mercado · Envíos · Dinero · Más**. Botón **+** global: nuevo pedido, prospecto, recepción, pago.
**Más:** Productores, Compradores/Clientes, Documentos, Equipo, Temporadas, Ajustes, Ayuda.

| Pantalla | Contenido clave |
|---|---|
| **Hoy** | Fase del año ("Cierre de temporada: faltan 3 liquidaciones · Prospección 2027: 2 acciones hoy"), semáforo, tareas, caja proyectada |
| **Ruta de arranque** | Pasos A–E (§13) con "por qué importa", "cómo se hace" y botón a la herramienta |
| **Mercado** | Kanban, ficha de prospecto, secuencias, muestras, cotizaciones, ferias |
| **Envío (detalle)** | Pestañas: Pedidos · Productores (reparto + cola WhatsApp) · Recepción · Entrega · Resumen |
| **Recepción (modo campo)** | Alto contraste, teclado grande, foto, reloj de frescura |
| **Dinero** | Caja 8 semanas, por cobrar, por pagar, margen, costos |
| **Producto y kit** | Ficha, calendario de disponibilidad, vista pública |

Estados vacíos con acción siguiente, esqueletos de carga, errores que dicen qué hacer, búsqueda global (⌘K en escritorio), deshacer 10 s, banda "Sin conexión: se guarda en el teléfono".

---

## 13. Ruta de arranque (guía con conocimiento de mercado)

| Fase | Objetivo | Tareas (cada una con "por qué" y "cómo") |
|---|---|---|
| **A · Ordenar la casa** (sem. 1–3) | Saber qué se vende y a qué costo | Definir producto y formatos · Registrar productores y semanas de cosecha · **Costo por kg y precio mínimo** · Reunir documentos base *(verificar con SFE)* · Fotos y video estándar · **Publicar el kit comercial** |
| **B · Primeros compradores** (sem. 3–8) | Cerrar 3–5 clientes cercanos | Lista de 30 prospectos (fuentes guiadas) · Llamadas con guion · Enviar muestras · **Primer pedido pequeño** con pago contra entrega/prepago · Pedir retroalimentación |
| **C · Cumplir y estabilizar** (temporada) | Reputación de puntualidad y calidad | Planificar con modelo *pull* · Recepción con lote y frescura · Pagar a productores a tiempo · Registrar reclamos |
| **D · Escalar nacional** (pre-temporada) | Mayoristas/supermercados | Ficha de proveedor · Requisitos formales · Consistencia semanal comprobada · Facturación |
| **E · Exportar con socio** | Primer contenedor sin asumir todo el riesgo | Elegir exportador/consolidador · **Verificar admisibilidad vigente** · Muestras internacionales · Secuencia por correo · Cotizar por Incoterm · Condiciones de pago seguras |

El contenido de la guía es **editable** y versionado: es conocimiento de la asociación, no texto fijo.

---

## 14. Modelo de datos (delta)

`Season` (renombra `Campaign`), `Lead`, `LeadContact`, `ConsentRecord {contacto, canal, baseLegal, fuente, fecha}`, `Suppression`, `OutreachSequence/Step/Enrollment/Message` (registro sin contenido sensible), `Sample`, `Quote/QuoteLine`, `FairEvent`, `PriceObservation`, `ProducerForecast {productor, semanaISO, kg, actualizadoEl}`, `Lot`, `Reception`, `RejectionReason`, `ColdStock`, `PackFormat`, `PackMaterialStock`, `Vehicle`, `Route/Stop`, `Claim`, `CostModel`, `CashEntry` (derivado), `Document/Checklist/ChecklistItem`, `TeamInvite`, `RoleAssignment`.
Convenciones del MVP se mantienen: `Guid` v7, UTC, `numeric(18,2)` CRC, `numeric(12,2)` kg, token de concurrencia, borrado lógico, `ChangeLogEntry`.

## 15. Algoritmos (con pruebas)
1. **Reparto proporcional + equidad** (§8.2). *Verificado en el prototipo con Node contra los casos 1–5 del plan de pruebas del MVP.*
2. **Oferta prometible** (§8.1). 3. **Puntuación de encaje** (§6.3). 4. **Programador de secuencias** (ritmo, horario, paradas). 5. **Reloj de frescura:** `edad = ahora − horaCosecha`; estados Fresca / Atención / Vence según vida útil configurada. 6. **Costo y precio mínimo** (§9.1). 7. **Caja proyectada** (§9.3).

## 16. Requerimientos funcionales (resumen priorizado)

| ID | Requerimiento | Prio | Fase |
|---|---|---|---|
| CO-GUI-01 | Ruta de arranque editable | M | F1 |
| CO-MER-01 | Directorio de prospectos + pipeline + puntuación explicable | M | F1 |
| CO-MER-02 | Importación CSV con deduplicación y validación | M | F1 |
| CO-MER-03 | Kit comercial público ES/EN + PDF + QR + formulario entrante | M | F1 |
| CO-MER-04 | Cotizador con precio mínimo y Incoterm | M | F1 |
| CO-MER-05 | Muestras con seguimiento | S | F1 |
| CO-MER-06 | Secuencias de correo con guardas (§7.3) | M | F2 |
| CO-MER-07 | Tareas de llamada con guion | S | F1 |
| CO-MER-08 | Calendario de ferias y captura rápida | C | F2 |
| CO-OFE-01 | Productor 360 + pronóstico semanal + oferta prometible + semáforo | M | F1 |
| CO-OPE-01 | Todo lo del MVP (pedidos, envíos, recepción, entrega, cierre) | M | F1 |
| CO-OPE-02 | Cola de convocatoria WhatsApp con respuestas y plan B | M | F1 |
| CO-OPE-03 | Reparto con equidad y explicación | S | F1 |
| CO-OPE-04 | Recepción en modo campo **sin conexión** + foto + recibo | M | F1 |
| CO-OPE-05 | Lotes y reloj de frescura | S | F2 |
| CO-OPE-06 | Frío, empaque, hoja de ruta, reclamos | S | F2 |
| CO-DIN-01 | Costo/precio mínimo | M | F1 |
| CO-DIN-02 | Liquidación + anticipos + comprobante + estado de cuenta | M | F1 |
| CO-DIN-03 | Caja proyectada 8 semanas | S | F1 |
| CO-DIN-04 | Cuentas por cobrar y factura electrónica | S | F2–F3 |
| CO-CUM-01 | Bóveda + checklists por peldaño + trazabilidad | S | F2 |
| CO-EQP-01 | Roles Comercial/Acopio/Contabilidad, "Ver como…", invitación temporal | M | F1 |
| CO-REP-01 | Cierre de temporada e informe de impacto | S | F2 |
| CO-WA-01 | WhatsApp API oficial con plantillas y opt-in (solo con consentimiento) | C | F3 |
| CO-IA-01 | Asistente de redacción y clasificación de prospectos (revisión humana) | C | F2 |

## 17. No funcionales
**Offline:** PWA con cola local (IndexedDB) y sincronización idempotente para Recepción y Pedido rápido. **Rendimiento:** listas paginadas (hasta 300 productores / 1 000 prospectos); LCP < 2,5 s en 4G. **Accesibilidad:** WCAG 2.2 AA, texto "Muy grande", 320 px. **Seguridad:** permisos en servidor, filtro por propiedad, secretos de correo cifrados, auditoría; límites de tasa en el kit público. **Privacidad:** minimización, base legal por contacto, supresión, retención definida. **Observabilidad:** sin PII en logs.

## 18. Riesgos
| Riesgo | Mitigación |
|---|---|
| Baneo por prospección en frío por WhatsApp | Política §7.1; separación de líneas |
| Dominio marcado como spam | Calentamiento, autenticación, topes, pausa automática |
| Sobreventa | Oferta prometible con factor 0,8 y semáforo |
| Pérdida de fruta por frío/tiempo | Modelo *pull*, reloj de frescura, vida útil configurable |
| Caja negativa | Proyección 8 semanas y modelo de pago |
| Percepción de injusticia | Equidad + "por qué" + recibos |
| Fraude/impago de compradores nuevos | Riesgo de comprador, prepago/carta de crédito, cuentas por cobrar |
| Conectividad | Offline en recepción |
| Dependencia de una sola persona | Roles, "Ver como…", guía y documentos versionados |
| Requisitos legales mal asumidos | Todo lo normativo marcado **"verificar"** y editable |

## 19. Métricas
Prospectos → respuestas → muestras → cotizaciones → pedidos (conversión por fuente) · kg vendidos vs. oferta prometida · % rechazo por lote · días promedio de pago a productores · caja mínima proyectada · margen por envío · retención de productores · tiempo de registro de una recepción (< 30 s).

## 20. Qué demuestran (y qué no) los prototipos
- **`prototype-operacion/`**: *Hoy* con fase del año; **planificador con el algoritmo real** (proporcional, topes, mayor resto, equidad) probado en Node; cola de WhatsApp; recepción en modo campo con reloj de frescura; liquidación y comprobante. **Datos ficticios**; sin servidor.
- **`prototype-mercado/`**: Ruta de arranque, Kanban, puntuación de encaje real, secuencias con **guardas de cumplimiento que bloquean** (WhatsApp en frío, país, autenticación), vista previa del correo con pie legal y del kit público. **No envía nada.**

## 21. Preguntas abiertas
1. ¿La asociación tiene personería jurídica y qué registros ya posee (SFE, etc.)? 2. ¿Quién será el "socio exportador" candidato? 3. ¿Se acepta la regla por defecto de que la asociación absorbe los reclamos? 4. ¿Dominio de correo propio disponible para secuencias? 5. ¿Se aprueba el cambio `Campaign → Season`? 6. ¿Hay cuarto frío propio o se alquila? 7. ¿Qué modelo de pago a productores se prefiere (a X días / al cobrar)?
