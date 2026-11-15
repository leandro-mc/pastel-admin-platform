# Notas de investigación · Cosecha v2 y Ágora v2 (2026-10-24)

> Confianza: A (primaria/oficial/revisada por pares) · B (guía especializada) · C (blog/comercial). Los estudios son de otros países (Kenia, Etiopía, EE. UU., Taiwán): **dan dirección, no certeza para Costa Rica**; cada decisión incluye cómo validarla con personas reales.

## COSECHA

### Pago a productores y lealtad (base del modelo de pago)
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Productores con restricción de liquidez valoran **pagos agrupados y predecibles** como mecanismo de ahorro: en un experimento, **86 %** eligió pago mensual en lugar de diario aun con **15 % más** de precio por el diario; confían en la cooperativa más que en comerciantes que no pueden comprometerse a pagar después | Casaburi & Macchiavello (Kenia), povertyactionlab.org / warwick.ac.uk | A | **Calendario de pago fijo y público** (mismo día cada semana/quincena); no cambiar la fecha sin aviso |
| La **venta por fuera** (*side-selling*) se explica por falta de efectivo ante choques (salud, imprevistos) y por precios; la **flexibilidad de pago y el seguro** la reducen | Geng, Janssens et al. (IFPRI/Tinbergen) | A | **Adelanto de emergencia** acotado (no solo calendario rígido) |
| En café (Etiopía): **pago tardío** y grupos grandes favorecen la venta por fuera; **confianza en la dirigencia**, certificación, edad y educación la reducen | Shumeta et al., *J. Development Studies* 2018 | A | Transparencia radical (recibo, estado de cuenta, reglas escritas) y comunicación frecuente |
| Esquema clásico de cooperativas de fruta: **anticipo al entregar**, **pagos de avance** a medida que se vende el pool y **pago final** al liquidarlo; costos del pool prorrateados; riesgo y gastos compartidos de forma equitativa | USDA RBS Research Report 168 (Cooperative Pooling Operations) | A | **Modelo híbrido: anticipo + liquidación final por *pool* semanal** (ver `cosecha/MODELO-DE-PAGO.md`) |

### Reclamos de calidad (base de la política)
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| En EE. UU. (PACA), el rechazo debe comunicarse en **"términos claros e inequívocos"** y **en tiempo razonable**: para camión, **≈ 8 horas** desde el aviso de llegada y disponibilidad para inspección; "tiempo razonable" suele significar **el mismo día**; un aviso a los 3 días ya no es oportuno | producebluebook.com (PACA); wga.com; ams.usda.gov (Top 10 Contracting Issues) | A/B | **Ventana de reclamo de 8 h hábiles** desde la recepción, con aviso inmediato |
| **Aceptar** incluye descargar, desviar o **no avisar a tiempo**; tras aceptar, el comprador **debe probar** el incumplimiento | ams.usda.gov; fsrmagazine.com | A/B | Lo aceptado sin aviso en ventana se considera conforme, salvo defecto oculto probado |
| **Buena entrega** (referencia genérica): tolerancia de **5 % descomposición, 8 % daño serio, 15 % total**; existen guías por producto; sin guía para rambután | ams.usda.gov (PACA Good Delivery); fsrmagazine.com | A | Valores **iniciales** de Cosecha = referencia PACA, **a validar** con técnico y primeros compradores |
| La **inspección** respalda la reclamación; no es obligatoria para rechazar, pero la parte que rechaza sin prueba asume riesgo; arbitraje (Produce Bluebook, DRC en Canadá) para exportación | producebluebook.com; laws-lois.justice.gc.ca | A | Evidencia obligatoria (fotos con lote y hora); arbitraje externo solo en exportación |
| **Registros de temperatura y prueba de entrega** reducen reclamos injustos contra el transportista | fleetrabbit.com (C); truckstop.com (C) | C | Temperatura y foto de entrega en la hoja de ruta (F1 manual, F3 sensor) |

### Productores y tecnología (cómo se les habla)
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| La **confianza** es el fundamento de adopción; la apropiación (que el usuario haga suya la herramienta) pesa más que la "adopción" | Ofosu-Ampong et al. 2025 (Discover Agriculture); Coggins et al. 2021 (*Global Food Security*) | A | Co-diseño con productores reales; la asociación, no la app, es el "rostro" |
| Se prefiere **WhatsApp** (ya lo usan), pero para personas mayores/marginadas **la llamada telefónica es indispensable**; estrategia **multicanal**; se necesitan **multiplicadores** de confianza | arXiv 2601.11537 (AIEP) | A | Canal por productor: WhatsApp / nota de voz / llamada / **enlace de zona** |
| **Voz > texto**; muchos **no se desplazan** más de una pantalla; no contestan **números desconocidos**; **no instalan apps**; mala vista y pantallas rotas | ictworks.org (12 reasons farmers do not use mobile agritech) | B | Mensajes ≤ 3 líneas, idea principal primero, número **siempre el mismo y guardado**, notas de voz, recibos con letra grande |
| Texto + **video/voz corto** funciona mejor; si la confianza en el teléfono es baja, hace falta un **relevo humano de confianza** | hrnstiftung.org (Hotspot to Harvest) | B | Rol **Enlace de zona** (productor de confianza que retransmite) |

### Transportistas
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| **Esperas largas** (en refrigerados las peores), citas que no se respetan, pérdida de ingresos, pagos tardíos y **fraude** de falsos intermediarios en temporada | GAO-11-198; ATRI (freightwaves); thepacker.com; truckstop.com | A/B | Hoja de ruta con **ventana honrada**, **reloj de espera** registrado, pago prometido con fecha |
| Sin prueba (hora, foto, temperatura) el transportista queda expuesto a **reclamos subjetivos** | fleetrabbit.com | C | **Comprobante de entrega** (foto, nombre de quien recibe, hora, temperatura) que protege a todos |

### Compradores
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Barreras de chefs: **disponibilidad constante 52 %**, **calidad constante 33 %**, puntualidad 24 %, precio 14 %, ubicar productores 10 %, facturación 5 % | Produce Outlook Buyers Survey (ccd.uky.edu) | B | Prometer solo la **oferta prometible**; aviso temprano de cambios; ficha de calidad |
| Valoran **comunicación temprana ante problemas**, factura con cada entrega, muestras, empaque a su especificación y **"la cara y el lugar"** detrás del producto; el no cumplir un pedido suele cortar la relación | UK Extension, SARE, UMN, Cornell | B | Aviso proactivo; historia de la asociación en el kit; factura/ comprobante en cada entrega |
| Los compradores formales no logran **comunicar sus requisitos de calidad** al productor; los estándares escritos ayudan | Chang & Griffith 2011 (PNG) | B | **Ficha de calidad** con fotos (aceptable / no aceptable) compartida por ambas partes |

## ÁGORA

### Contexto costarricense
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Apoyo a la democracia 56 % pero **satisfacción 43 %** (Latinobarómetro); **~74 %** con poca o ninguna confianza en que el gobierno resuelva problemas (CIEP); **84–87 %** sin simpatía partidaria; indecisión muy alta; abstencionismo récord 2022 (40,65 % en primera ronda) y leve recuperación en feb. 2026; decisiones por **candidatos más que por partidos** | delfino.cr; nacion.com; observador.cr (CIEP-UCR) | A/B | El público **no está dividido en dos bandos: está desencantado, indeciso y desconfiado**. Ágora debe **orientar y dar herramientas**, no "debatir" |
| **80 %** considera grave la desinformación; en 2026 hubo ataques sin precedentes contra el TSE; la polarización es más de **desconfianza y escepticismo** que de bandos | PROLEDI-CIEP-UCR; Diario Extra | A/B | "Cómo sabemos esto", sello y fuentes visibles; **neutralidad electoral estricta** (guías para comparar propuestas, no recomendaciones) |
| Los jóvenes se informan en redes; las mujeres, jóvenes y personas con menor escolaridad concentran la indecisión | CIEP-UCR | B | Formatos cortos y de video; lenguaje llano; accesibilidad |

### Mecanismos para reducir la hostilidad
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| **Megaestudio (n = 32 059, *Science* 2024)**: **23 de 25** intervenciones breves (<8 min) redujeron la animosidad entre grupos; las más fuertes: mostrar **personas relatables con ideas distintas**, resaltar una **identidad común** ("mayoría agotada") y **corregir percepciones erróneas** sobre "los otros"; el efecto **decae a las 2 semanas** (necesita repetirse) | Voelkel et al.; news.stanford.edu; news.cornell.edu | A | Formatos **"Voces cercanas"**, **"Lo que nos une"**, **"Lo que sí piensa la mayoría"**; exposición **ligera y recurrente** (semanal), no un evento |
| **Ranking por puentes** (*bridging*): elevar lo que **personas de grupos distintos** valoran (Polis/vTaiwan, Community Notes); **Polis**: se vota afirmaciones (de acuerdo / en desacuerdo / paso) **sin responderse**; revela acuerdos entre grupos y reduce la **ignorancia pluralista**. Limitaciones: puede subir afirmaciones vagas; participación autoseleccionada | icip.cat; reframetech.de; arxiv 2503.05830; wiki.p2pfoundation | A/B | **"Escucha ciudadana"**: afirmaciones moderadas, voto sin comentarios, resultados con **acuerdos entre grupos** y aviso de que **no es una encuesta representativa** |
| Community Notes: solo notas valoradas por perspectivas diversas se muestran; **menos de 10 %** pasan | icip.cat | B | Sello por revisoras con **diversidad de formación** y alcance escrito |

### Roles y permisos
Diseño propio (no hay estándar único): **mínimo privilegio**, **separación de funciones** (quien escribe no verifica; quien modera no edita contenido), **auditoría** de acciones sensibles y **rotación** de permisos temporales. Ver `agora/ROLES-Y-PERMISOS.md`.
