# Huella · investigación (v2): un banco de relatos privado que se convierte en el CV que sí pasa el filtro

> Las «entrevistas» son **simuladas** (hipótesis, no sustituto del trabajo de campo). **[E]** = evidencia citada; **[H]** = hipótesis por validar. Evidencia: [`../research/NOTAS-HUELLA-V2.md`](../research/NOTAS-HUELLA-V2.md) y [`../research/FUENTES.md`](../research/FUENTES.md).

## 1. Qué resuelve (de verdad)
Postular bien cuesta una tarde por oferta. Quien postula a 15–20 ofertas por semana **no puede** reescribir su CV cada vez, y si lo hace rápido **sacrifica verdad o calidad**. Huella resuelve tres cosas: (1) **recordar y guardar todo** lo vivido **una sola vez**, contando; (2) **derivar de ahí un CV a la medida de cada oferta**, sin inventar nada y dentro de los límites de página; (3) **advertir** si una oferta tiene un requisito eliminatorio que usted no cumple, **antes** de gastar tiempo.

## 2. Cómo se filtra realmente (y qué implica)
| Hallazgo | Fuente (conf.) | Decisión |
|---|---|---|
| El ATS es sobre todo una **base de datos que el reclutador busca** con palabras exactas; la búsqueda corre sobre el **texto que el parser extrajo** [E/B] | huntr.co; airesume.guru | **Ser encontrable**: título de mercado, herramientas, siglas desplegadas una vez, **sin trucos** |
| Los ATS grandes **no rechazan solos** por contenido; **filtran las preguntas eliminatorias** (autorización, ubicación, años mínimos, certificaciones) [B/C] | huntr.co; enhancv.com | **Filtros duros**: comparar la oferta con **datos privados** del banco antes de generar |
| El orden de candidatos es cada vez más **semántico**; el *stuffing* y el texto oculto **perjudican** [C] | theinterviewguys.com | Redactar con **evidencia**, no con listas; prohibido ocultar texto |
| Los «puntajes ATS» comerciales suelen ser métricas inventadas [C] | tietalent.com | **No** prometer un «% ATS»; mostrar **comprobaciones concretas** y **cobertura honesta** |
| Reclutadores: **~7 s** de triaje (muestra pequeña), miran nombre, cargo/empresa actual, fechas, previo y educación [A, matiz] | TheLadders 2018 | Cabecera y primera pantalla del CV y del perfil público responden «¿encaja?» |

**Conclusión de diseño:** el CV debe ser **legible por máquina, encontrable por palabras reales, verdadero, y escaneable por una persona en segundos**.

## 3. El banco: un cuaderno privado en texto largo
### 3.1 Por qué texto largo y no campos sueltos
La v1 pedía frases cortas. **No** sirve para recordar: las personas **cuentan historias**, no redactan viñetas. [E] La práctica recomendada es mantener un **currículum maestro** exhaustivo del que se derivan versiones [B/C]. El banco v2 es ese maestro, **privado** (nunca sale) y **escrito contando**.

### 3.2 Secciones
**Mi historia** · **Experiencia** (por empleo, relato largo) · **Habilidades y por qué las tengo** · **Proyectos** (qué hace / cómo está hecho) · **Educación** · **Certificados** · **Idiomas** (CEFR) · **Otros** (voluntariado, charlas, premios) · **Privado: filtros y preferencias** (ubicación, modalidad, disponibilidad, autorización, pretensión, lo que no quiere) · **Mi voz** (cómo escribo y qué evito) · **Datos del encabezado**. Cada sección muestra su **estado** (vacío / poco / completo) y las preguntas que ayudan a recordar.

### 3.3 De relato a logro
La IA extrae del relato cada **logro** en forma **XYZ** (*logré X, medido por Y, haciendo Z*) [B/C]; cuando falta la cifra **pregunta** («¿cuánto tiempo ahorró?, ¿a cuántas personas?») en vez de inventarla; si no hay cifra posible usa **CAR** (reto-acción-resultado). Cada logro guarda **variante corta** (1 línea) y **larga** (2 líneas) para la escalera de ajuste. En el prototipo la extracción es **simulada por reglas** (verbo en primera persona y pasado + cifras) y se ve en vivo bajo cada relato. *Hallazgo del prototipo:* en JavaScript `\b` no reconoce vocales con tilde; la v1 de la regla perdía casi todos los verbos («Automaticé», «Diseñé»…), un recordatorio de que **la derivación debe probarse con texto real en español**.

### 3.4 Habilidades **con por qué**
Sin barras de nivel: cada habilidad lleva **desde cuándo** y **por qué la tengo**; el sistema muestra **cuántos logros la respaldan** y marca las **«sin respaldo»** para no usarlas como argumento fuerte (p. ej., *Docker*: «lo uso para entornos locales, no he operado producción»). Evita prometer de más y **sobrevivir a la entrevista**.

### 3.5 Privacidad
Todo es privado. Con IA gratuita (Gemini) los datos pueden usarse para entrenar y revisarse por humanos [C]: **escudo de PII** obligatorio (correo/teléfono/dirección se sustituyen y se reinyectan al renderizar). Para quien no quiera enviar nada: **modo manual** (copiar/pegar).

## 4. Del banco al CV (pipeline)
`Relato → logros (X/Y/Z) → mapa de evidencia (✓ cubierto · ~ parcial · ✕ brecha) → **filtros duros** → generación por sección (con topes) → guardián de verdad → escalera de ajuste a la página → PDF/Word + reporte ATS`.
- **Guardián de verdad:** cada línea cita su logro de origen; las **cifras** deben existir en el banco; las **entidades** (empresa, cargo, fechas) se copian; la IA **no añade habilidades** (solo las sugiere); la oferta se trata como **dato** (anti *prompt injection*).
- **Filtros duros** (nuevo): años de experiencia en X, modalidad, país/ubicación, nivel de inglés, título universitario. Se comparan con **datos privados**; si no cumple, el sistema lo dice (**no aplicar o responder con honestidad**), sin impedir generar.

## 5. El CV: análisis de la imagen v1 y rediseño v2
**Hallazgos del PDF v1** (de su captura): parecía **plantilla de Word por defecto** (fuente tipo Arial en un solo peso), **sin acento**, **espaciado apretado** entre títulos y contenido, **contacto partido** con separadores dobles, y un **defecto real**: en Educación **la fecha y el detalle quedaban en la misma línea**.
**Principios aplicados (v2)** [B/C + guía local A]: **una columna**, **una familia tipográfica** en pocos pesos (*Source Sans 3*, OFL), **un solo acento sobrio** (verde azulado #0F4C5C) **solo** en nombre, títulos y viñetas, **cuerpo casi negro**, **títulos en versalitas con filete**, fechas **a la derecha, apagadas, en la misma línea**, contacto en **dos líneas controladas**, mucho aire, y que se vea bien **impreso en blanco y negro**. La guía de PROCOMER/Costa Rica Inversión (2026) pide **sin foto**, fuentes universales 10–12 pt, **perfil de 3–4 líneas**, **.docx o .pdf de texto** [A]: Junior pasa a **3 líneas** de perfil y se agrega **exportación a Word (Calibri)** desde el mismo JSON.
**Verificación:** auditoría ATS del PDF compilado **14/14** (incluye fuente real embebida, ToUnicode, sin ligaduras, orden de lectura, **regresión del defecto de Educación**), Word leído de vuelta **9/9**, límites y estrés **6/6**. *Limitación:* no probado en ATS comerciales.

## 6. Actores y entrevistas simuladas

### 6.1 La candidata (propietaria) [H]
Aplica a muchas ofertas; teme **mentir sin querer**, **sonar a robot**, y **perder el control**. *«Me paso la tarde adaptando el CV y siento que siempre se me olvida algo bueno.»* → HU2-01 **banco narrativo** · HU2-02 **logros derivados con preguntas por cifra** · HU2-03 **«Mi voz»** · HU2-04 **mapa de brechas honesto** · HU2-05 **filtros duros** · HU2-06 **edición de cada línea con validación**.

### 6.2 Reclutadora corporativa (Costa Rica) [H]
Recibe cientos de CV; **busca por palabras clave** y mira primero cargo y empresa. *«Si no veo el puesto parecido en dos segundos, sigo.»* → HU2-07 **titular y cargo de mercado**, siglas desplegadas, **fechas claras** · HU2-08 **PDF de texto** y **Word** disponibles.

### 6.3 Líder técnico que contrata [H]
Quiere **evidencia**, no listas. *«Dime qué hiciste y qué cambió; el resto lo pregunto en entrevista.»* → HU2-09 **logros con cifra al inicio**; habilidades **con evidencia**.

### 6.4 El ATS (actor no humano) [E/H]
Segmenta por encabezados, extrae entidades, compara texto. → HU2-10 **encabezados estándar**, una columna, sin iconos/tablas, **orden de lectura** correcto; **reporte ATS**.

## 7. Requisitos derivados → dónde se ven
| ID | Requisito | Dónde |
|---|---|---|
| HU2-01/02/03 | Banco narrativo, logros derivados, voz | Estudio → Banco |
| HU2-04/05 | Mapa de brechas y filtros duros | Estudio → Crear CV, paso 2 |
| HU2-06 | Edición validada | Estudio → Resultado |
| HU2-07/08/10 | Titular, texto legible, formatos | Plantilla Typst v2, Word, reporte ATS |
| HU2-09 | Logros con cifra | Derivación y plantilla |

## 8. Riesgos
Inventos de la IA (→ guardián) · **texto que suena a IA** (→ «Mi voz», frases prohibidas) · fuga de datos personales (→ escudo de PII, modo manual) · **sesgo** (sin foto, edad ni estado civil) · variabilidad entre ATS (→ contrato conservador, Word + PDF) · extracción mala en español (→ pruebas con texto real) · dependencia de proveedores de IA (→ niveles, modo manual).

## 9. Métricas
Tiempo «banco cargado → primer CV» (< 15 min la primera vez; < 2 min después) · % de líneas editadas a mano (< 30 %) · rechazos del guardián por 100 líneas (↓) · **% de logros con cifra** · cobertura honesta de la oferta · tasa de respuesta por **enfoque** (F2).

## 10. Guía para entrevistar de verdad
**Candidatas (3–5 personas que buscan trabajo):** ¿Cómo prepara hoy cada postulación? ¿Qué se le olvida? · ¿Qué le da **miedo** de que una IA escriba su CV? · Muéstreme un CV suyo y dígame qué **no** cuenta de lo que hizo. · ¿Cuándo no postuló por un requisito que no cumplía y se arrepintió? · (Mostrar el CV v2) ¿Qué le parece? ¿Lo mandaría?
**Reclutadoras/líderes (3–5):** ¿Cómo **buscan** en su sistema? ¿Qué leen primero? ¿Qué las hace descartar un CV? ¿Prefieren PDF o Word? ¿Han recibido CV «hechos por IA» y cómo los reconocen?
**Prueba técnica:** pasar el PDF/Word por **parsers y ATS de prueba** (planes gratuitos) y comparar la extracción.

## 11. Preguntas abiertas
¿Idiomas del CV desde F1 (ES/EN)? ¿Se abre Huella a invitados (F3)? ¿Qué ATS usan las empresas objetivo (para probar con ellos)? ¿Se agrega **carta de presentación** por oferta?
