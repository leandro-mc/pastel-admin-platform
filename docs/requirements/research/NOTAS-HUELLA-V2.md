# Notas de investigación · Huella v2 (2026-10-24)

> Cada hallazgo termina en una **decisión**. Confianza: A (primaria/oficial) · B (guía especializada) · C (blog/comercial, contrastar). Las cifras de porcentajes de reclutadores varían entre fuentes y alguna se discute; se usan solo como dirección, no como dato duro.

## 1. Qué hace realmente un ATS (y qué no)
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| El ATS es sobre todo una **base de datos que el reclutador busca** con palabras exactas ("Boolean con mejor pintura"); la búsqueda corre sobre el **texto exacto que el parser extrajo** | huntr.co/blog/what-recruiters-actually-do-with-your-resume · airesume.guru/blog/how-does-an-ats-work | B/C | El CV debe contener, de forma **veraz**, los términos que un reclutador tecleará: título de mercado, herramientas, siglas **desplegadas una vez** ("Integración y entrega continuas (CI/CD)") |
| Ningún ATS grande rechaza **de forma autónoma** por contenido; lo que filtra son las **preguntas eliminatorias** (autorización de trabajo, ubicación, años mínimos, certificaciones) | huntr.co/blog/how-applicant-tracking-systems-work · enhancv.com/blog/does-ats-reject-resumes | B/C | Nuevo módulo **"Filtros duros"**: el Estudio extrae los requisitos eliminatorios de la oferta y los compara con los *hechos privados* del propietario (años por habilidad, ubicación, títulos, idiomas, disponibilidad) **antes** de generar. Si no cumple, lo dice (no aplicar, o responder honestamente) |
| El orden de los candidatos usa cada vez más **coincidencia semántica** (embeddings), no solo conteo de palabras; el "stuffing" y el texto blanco microscópico **perjudican** | blog.theinterviewguys.com (Match-Score Trap) · chitchatswithlonni | C | Redactar con **evidencia** (qué hice, cómo, qué resultó) y no listas de palabras. Prohibido ocultar texto. La puntuación interna de cobertura es **orientativa**, no una promesa |
| Los "puntajes ATS" de escáneres comerciales son a menudo métricas inventadas | tietalent.com/en/blog/249 | C | No se muestra un "% ATS" como garantía: se muestran **comprobaciones concretas** (formato legible, términos presentes, filtros duros) |

## 2. Cómo se construye un banco de logros desde relatos largos
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Práctica recomendada: un **currículum maestro** largo y exhaustivo (todo empleo, proyecto, curso, certificado, logro) del que se derivan versiones por oferta | freeacademy.ai (Tailoring with AI) · LinkedIn (master resume) | B/C | El **Banco** es exactamente eso, pero **privado** y escrito **contando** (texto libre largo) |
| Fórmulas de logro: **XYZ** (*Logré X, medido por Y, haciendo Z*; Laszlo Bock, Google), **CAR** (Reto-Acción-Resultado) y **STAR** (las dos últimas para entrevistas o cuando faltan cifras). XYZ es la más "nativa" de CV porque pone el resultado primero | airesume.guru/blog/star-method-resume-bullets · stylingcv.com (XYZ 2026) · enhancv.com | B/C | La IA extrae del relato cada logro en **X / Y / Z**; si falta la cifra, **pregunta** («¿cuánto? ¿cuántas personas? ¿cuánto tiempo ahorró?») en vez de inventarla; si no hay cifra, usa CAR |
| Solo ~26 % de candidatos incluye datos medibles en 2026 (dato de un blog) | stylingcv.com | C | Pedir cifras es una **ventaja competitiva**; "Detector de logros sin cifra" en el Banco |

## 3. Un CV que se vea bien **y** sea legible por máquina
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Consenso: **una columna**, texto real, **una familia tipográfica** (máx. dos), **un solo acento** sobrio solo en nombre/encabezados, cuerpo casi negro, mucho espacio, que se vea bien impreso en blanco y negro; evitar iconos, fotos, gráficos | madegooddesigns.com/resume-design-guide · resumegeni.com (design FAQ) · lilachbullock.com | B/C | Plantilla v2: acento **verde azulado profundo** (#0F4C5C) solo en nombre y títulos; **Source Sans 3** (humanista, legible) en cuatro pesos; tamaño nombre ~22 pt, títulos ~10,5 pt en versalitas con tracking leve, cuerpo 10,5 pt |
| Guía **local** (PROCOMER / Costa Rica Inversión / Falent, abril 2026): **sin fotografía** salvo que se pida; Arial/Calibri/TNR 10–12 pt; encabezados consistentes; perfil de **3–4 líneas**; formación universitaria sin detallar secundaria; competencias técnicas y blandas; idiomas con nivel; referencias "a solicitud"; archivo **.docx o .pdf de texto** | investincr.com/wp-content/uploads/2026/04/Guia-Practica-para-Crear-un-CV.docx | A | **DOCX pasa a F1** (algunos portales/ATS lo prefieren); el DOCX usa **Calibri/Arial** (universales) y el PDF usa fuentes embebidas; perfil de 3 líneas para Junior; "Referencias disponibles a solicitud" opcional |
| Portales usados en Costa Rica: LinkedIn, Indeed Costa Rica, Computrabajo; muchas multinacionales usan Workday, SuccessFactors, Taleo (dato de un blog comercial, **verificar**) | resumly.ai/…costa-rica (C) | C | Dos versiones de idioma (ES/EN); papel **Carta**; sin cédula/estado civil/edad en el CV (solo en "Filtros duros" privados si el portal lo pide) |

## 4. Autenticidad
| Hallazgo | Decisión |
|---|---|
| La tarea correcta de la IA es **ordenar y redactar lo verdadero**, no inventar; los reclutadores perciben el texto genérico | Guardián de verdad (ya existente) + **"Voz propia"**: el Banco guarda cómo escribe el propietario (muestras) y el prompt exige conservar su vocabulario; prohibidas muletillas de IA |
