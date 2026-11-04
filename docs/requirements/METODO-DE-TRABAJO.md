# Método de trabajo (consultar al empezar **cada** iteración)

> Este documento existe para no saltarse nada. Se lee completo antes de tocar un prototipo y se revisa la lista final antes de entregar. Si una iteración descubre un error nuevo, se agrega aquí como **lección**.

## 1. Quién soy en este proceso
No soy solo quien dibuja pantallas. En cada app asumo **sucesivamente** estos papeles, y cada uno puede decir "esto no sirve":

| Papel | Pregunta que defiende |
|---|---|
| **Persona usuaria experta** (una por actor real) | ¿Esto me sirve un martes a las 6 a. m., con prisa, sin señal, cansado o desconfiado? |
| **Product Owner** | ¿Resuelve el problema real que justifica la app? ¿Qué NO hacer? ¿En qué orden? |
| **Diseñador de interacción** | ¿Se entiende en 3 segundos? ¿Hay un solo siguiente paso? ¿Se ve distinto de lo genérico? |
| **Revisor adversarial** | ¿Cómo falla esto en la vida real? ¿Quién puede abusarlo? ¿Qué pasa en el peor caso? |
| **Responsable de confianza y datos** | ¿Qué dato sale, a quién, con qué base? ¿Qué se puede deshacer? |
| **QA / accesibilidad** | ¿Funciona con teclado, lector de pantalla, letra grande, modo oscuro, 320 px y 4G lenta? |

## 2. El ciclo (no se salta ningún paso)
1. **Entender** lo que pidió el propietario y **escribirlo** en el *Registro de comprensión* (§3). Si dudo, lo declaro como supuesto; no lo escondo.
2. **Mirar la evidencia real**: capturas, código, documentos del repo. (La v1 se corrigió mirando sus capturas: ver `REVISION-UX-V1.md`.)
3. **Empatizar**: por cada actor, una *ficha de persona* + *entrevista simulada* (§4) + *mapa de empatía*.
4. **Investigar** (búsqueda + fuentes primarias cuando existan). Cada hallazgo se registra con fuente, confianza (A/B/C) y **decisión que provoca**. Sin decisión, no es hallazgo: es ruido.
5. **Decidir** con alternativas descartadas y riesgos (ADR corto). Lo no verificable se marca **"verificar"**.
6. **Prototipar** con datos ficticios, **por rol** y **en claro y oscuro** (§6).
7. **Verificar**: pruebas automáticas (jsdom, contraste, auditoría ATS, estrés) y **revisión visual** (el propietario envía capturas; yo las analizo).
8. **Documentar**: requerimientos, decisiones, fuentes, manuales. Los documentos y el prototipo **no pueden contradecirse**.
9. **Validar comprensión** al cierre: ¿lo entregado responde a cada punto del pedido? (checklist §8).

## 3. Registro de comprensión (se actualiza en cada pedido)
| Lo que pidió (textual, resumido) | Cómo lo entiendo | Cómo lo verifico | Estado |
|---|---|---|---|
| Selector de **rol solo para desarrollo** en el encabezado de **todos** los prototipos, que cambie la vista | Una barra de desarrollo (no es parte del producto) con lista de roles reales de cada app; al elegir, cambian navegación, datos visibles y acciones permitidas | Pruebas por rol (qué ve / qué no ve cada uno) | Hecho en v2 |
| Tema **claro y oscuro** en todos | Interruptor explícito (auto/claro/oscuro) además de la preferencia del sistema; todos los pares de color medidos | `contrast.py` en ambos temas | Hecho en v2 |
| Huella: **banco de texto exhaustivo por sección** que nunca se publica; la IA arma CV a partir de él | Un cuaderno privado con texto libre largo (experiencia, habilidades y *por qué*, proyectos y *cómo están hechos*) + secciones estructuradas (educación, certificados, idiomas…). El CV se **deriva**, no se escribe a mano | Se puede escribir/editar texto largo; el generador usa lo escrito | Hecho en v2 |
| Huella: CV **muy ATS-friendly y a la vez muy bonito** (analizar la imagen) | Mejorar jerarquía, tipografía, espaciado y acento **sin** romper el contrato ATS; corregir el defecto de Educación | Auditoría ATS + estrés + inspección visual del PDF | Hecho en v2 |
| Cosecha: usabilidad pobre; cubrir psicología/educación de cada actor; **manuales** con capturas simuladas | Rediseño desde escritorio y móvil, un solo app, vistas por rol; manuales por rol con capturas generadas del propio prototipo | Revisión de capturas; manuales generados desde el prototipo real | Hecho en v2 |
| Ágora: cubrir roles, permisos y **despolarización** | Matriz de roles y permisos completa; mecanismos de interacción sin pelea; investigación | Documento + vistas por rol | Hecho en v2 |
| Decidir **política de reclamos** y **modelo de pago a productores** con investigación y validación | Dos decisiones fundamentadas, con alternativas y cómo validarlas con personas reales | Documentos de política | Hecho en v2 |
| CCR para Typst y fuentes; `Campaign → Season` | Aprobados; se reflejan en documentos | — | Hecho |

## 4. Entrevistas: cómo se hacen y **qué valen**
**Regla de honestidad:** yo no puedo entrevistar a personas reales. Las "entrevistas" de los documentos son **simuladas**, construidas con investigación y razonamiento sobre el contexto; sirven para **generar hipótesis y requisitos**, no para reemplazar el trabajo de campo. Cada afirmación se etiqueta:
- **[Evidencia]** respaldada por una fuente citada.
- **[Hipótesis]** razonable pero por validar con personas reales.

Para validar, cada documento de investigación incluye una **guía de entrevista real** (preguntas abiertas, sin preguntas inductoras) para que el propietario la use en finca, acopio, con compradores, reclutadores o lectores.

Plantilla de entrevista simulada: contexto y día típico → última vez que hizo X (historias, no opiniones) → qué le preocupa/qué lo hace sentir engañado → cómo resuelve hoy → dinero, tiempo y confianza → tecnología (qué usa, qué no) → qué le haría abandonar la herramienta → qué sería un "buen día" con ella.

Cada persona termina en: **mapa de empatía** (piensa/siente · ve · dice/hace · oye) + **trabajos por hacer (JTBD)** + **requisitos derivados** (ID) + **riesgos de uso**.

## 5. Lista anti-diseño-genérico (se revisa en cada pantalla)
Los patrones típicos de interfaces hechas por IA sin planificar, **y los "antídotos" que ya se volvieron patrón**:
- ✗ Fuente Inter/Roboto por defecto · degradado morado/índigo · héroe centrado + CTA + 3 tarjetas con icono · glassmorphism · emoji como títulos · texto con degradado · bordes redondeados iguales en todo · sombras difusas en todo · barras de porcentaje de habilidades · contadores de "likes".
- ✗ Antídotos ya manidos: crema + terracota + serif cursiva · "brutalismo suave" decorativo · mayúsculas con tracking en cada etiqueta.
- ✓ En su lugar: decisiones **derivadas del contenido y del actor** (qué necesita ver primero, qué debe poder hacer con una mano, qué tono respeta su edad), con tipografía y color elegidos por razón, no por defecto.
- ✓ Prueba final: tapar el logotipo. ¿Se sabe de qué app es? ¿Alguien diría "esto lo hizo una plantilla"?

## 6. Calidad de interfaz (obligatoria)
1. **Un diseño por dispositivo real**: escritorio (barra lateral, tablas, paneles) y móvil (pestañas inferiores, una mano). No estirar un diseño móvil en escritorio ni viceversa (error de la v1 en Cosecha).
2. **Claro y oscuro** con interruptor explícito + preferencia del sistema; colores con `light-dark()`; **todos** los pares texto/fondo ≥ 4,5:1 (script).
3. **Estados**: vacío (con siguiente acción, nunca un callejón sin salida), cargando, error (qué hacer), sin conexión, sin permiso (explica por qué y a quién pedirlo).
4. **Roles**: lo que no corresponde **no se muestra** (no "se deshabilita sin explicación"); lo que se ve pero no se puede editar, lo dice.
5. **Controles propios** (casillas, selects, rangos) con aspecto coherente; sin azul nativo de navegador ni enlaces visitados en morado.
6. **Accesibilidad**: teclado, foco visible, `aria-*`, objetivos táctiles ≥ 44 px, texto ampliable, `prefers-reduced-motion`, el estado nunca depende solo del color.
7. **Texto**: español de Costa Rica; **de usted** por defecto; frases cortas; sin jerga ("pipeline" → "seguimiento de compradores" salvo que el rol lo use).
8. **Edad**: Ágora = toda la población (letra ajustable, lectura en voz alta F2); Cosecha: el productor **no usa la app** (recibe mensajes y recibos legibles por WhatsApp), el equipo sí; Huella: adultos con tiempo limitado.

## 7. Investigación: qué buscar siempre
Por actor: **psicología** (miedos, aversión al riesgo, confianza, normas del grupo), **educación y alfabetización digital**, **economía** (cómo gana y cuándo), **tiempo** (cuándo puede atender), **dispositivo y señal**, **lenguaje** (cómo nombra las cosas), **conflictos típicos** y **qué lo haría confiar**. Por app: **qué problema resuelve de verdad** (y qué no), **qué ya existe y por qué falla**, **marco legal y de plataformas**, **riesgos de abuso**.

## 8. Lista de cierre (nada se entrega sin marcar todo)
- [ ] Registro de comprensión actualizado y cada punto del pedido tiene evidencia.
- [ ] Cada actor tiene ficha, entrevista simulada, JTBD y requisitos con ID.
- [ ] Hallazgos con fuente y decisión; lo no verificado dice "verificar".
- [ ] Cada prototipo: selector de rol (solo desarrollo), claro/oscuro, estados vacío/error/sin permiso.
- [ ] Revisión anti-genérico hecha pantalla por pantalla.
- [ ] Pruebas verdes (interfaz, contraste, CV) y **capturas revisadas por el propietario** (la única verificación visual real).
- [ ] Documentos y prototipos coherentes; manuales generados desde el prototipo real.
- [ ] Sin secretos en el repositorio; ramas existentes intactas.

## 9. Lecciones aprendidas (se amplía)
| # | Lección | Origen |
|---|---|---|
| L1 | Un diseño móvil estirado en escritorio parece roto: la barra inferior abarca toda la pantalla y las columnas quedan cortadas | Capturas de Cosecha v1 |
| L2 | Una pestaña "Resultado" vacía es un callejón sin salida; el flujo debe ser un camino, no tres pestañas | Capturas de Huella v1 |
| L3 | Una lista de frases cortas **no** es un banco de información: el propietario necesita **escribir contando** y que el sistema derive | Pedido de Huella v2 |
| L4 | Sin interruptor de tema, el prototipo queda atado a la preferencia del sistema | Capturas (todas oscuras) |
| L5 | Un CV "ATS-correcto" puede verse como plantilla de Word por defecto; la calidad visual también se diseña | Imagen del CV |
| L6 | Las pruebas automáticas no ven el aspecto: la revisión visual del propietario es insustituible | Todas |
| L7 | La verificación de contraste debe cubrir **todas** las combinaciones reales, no solo las que recuerdo | Defectos hallados en la v1 |
