# Brisa · investigación (v3): llevar pendientes sin culpa

> **Honestidad metodológica:** las «entrevistas» de §4 son **simuladas** (hipótesis [H] para validar con personas reales; guía en §8). La evidencia externa está en [`../research/NOTAS-BRISA-BALANCE-V3.md`](../research/NOTAS-BRISA-BALANCE-V3.md) y [`../research/FUENTES.md`](../research/FUENTES.md) con confianza A/B/C. Esta investigación **respalda y matiza** las decisiones del propietario ([`INVENTARIO-BRISA.md`](INVENTARIO-BRISA.md) §13); no las reabre.

## 1. Qué resuelve (de verdad) Brisa

No «gestiona tareas»: ayuda a **soltar la cabeza** al final del día sabiendo qué toca mañana. El trabajo (*job*) es: *«cuando tengo muchas cosas pendientes, quiero ponerlas en un día concreto y olvidarme hasta que toque, para no sentirme atrasada»*. Todo lo que añada presión (alarmas, rojos, rachas, listas largas) compite con ese trabajo.

## 2. Diagnóstico: el problema no es la lista, es lo que la lista le dice a la persona

- **Lo atrasado pesa más que lo pendiente.** Una lista que acumula «vencidas» en rojo convierte una herramienta en un reproche; varias personas que construyeron o dejaron apps de tareas lo cuentan como la razón del abandono (confianza **C**: testimonios, no estudios). Brisa ya lo resuelve en lo esencial: «Vencidas» es una pestaña con tono amable («Pendientes atrasados»), se puede **mover** sin perder detalles y su estado vacío es «Vas al día».
- **El atraso real suele ser fecha mal puesta, no pereza.** La regla aprobada (§13.1) lo reconoce: si la fecha límite sigue vigente, la tarea **aparece hoy** en lugar de quedarse en un día pasado. Eso elimina la fuente más común de «vencidas» falsas.
- **Anotar ya alivia.** Los estudios sobre planes y metas abiertas (ver §3) sugieren que poner una tarea en un plan reduce la carga que genera; por eso el alta es de un solo dato.

## 3. Qué dice la evidencia (y hasta dónde)

| Qué | Fuente | Confianza | Límite |
|---|---|---|---|
| Los **planes de implementación** («cuándo y dónde lo haré») mejoran el cumplimiento de metas: meta-análisis de **94 pruebas**, efecto medio **d ≈ 0,65** | Gollwitzer y Sheeran (2006), *Advances in Experimental Social Psychology* 38 | **A** (el estudio; la URL del resultado de búsqueda no coincidía con el título: **localizar la fuente oficial antes de citar**) | Mide planes «si–entonces». Asignar un día es solo el componente «cuándo»: **hipótesis**, no garantía. El efecto varía por tipo de meta |
| **Escribir un plan** para una meta pendiente reduce su carga cognitiva | Masicampo y Baumeister (2011), *J. Personality and Social Psychology* | **B** — recordado de la literatura; **no se recuperó en esta sesión: verificar antes de citarlo** | Estudios de laboratorio con tareas breves |
| Las apps con **etiquetas de «vencida»** generan evitación; quitarlas o suavizarlas ayuda a volver | Publicaciones de desarrolladores y usuarios (IndieHackers) | **C** | Anecdótico; no hay medición. Sirve como señal de diseño, no como prueba |
| La procrastinación se asocia a **regular emociones** más que a mal manejo del tiempo | Literatura de psicología (resultado de búsqueda sin verificar el artículo) | **C** | No se cita cifra alguna; contrastar antes de usar |

**Lectura honesta:** la evidencia sólida (A) respalda pensar en *cuándo*; el resto es orientación de diseño. Ninguna decisión de Brisa depende de una cifra que no esté verificada.

## 4. Principios de diseño derivados

1. **Cuándo antes que cuánto:** el día es el dato central (por eso el carrusel).
2. **Lo atrasado se trata con calma y salida:** nombre amable, mover sin perder detalles, estado vacío que reconoce.
3. **Anotar es casi gratis:** un solo dato obligatorio.
4. **Regla visible, no magia:** lo que se mueve solo lo hace por una regla que se puede explicar (§13.1).
5. **Sin gamificación de la culpa:** ni rachas ni contadores de «fallos».

## 5. Personas y entrevistas simuladas [H]

### 5.1 Marcela, 34 años — oficina, teletrabajo, Android
*«Lo mío son diez cosas chiquitas al día que si no las apunto se me olvidan.»* Abre Brisa en el bus y a las 9 p. m. Necesita **crear en 5 segundos** y marcar hecha con un dedo. Le molesta cualquier pantalla de configuración al empezar. → BR-04, BR-06.

### 5.2 Don Jorge, 62 años — jubilado, texto grande
Lleva citas médicas y pagos. Usa el texto en tamaño «muy grande» y se pierde si los botones cambian de lugar. Prefiere ver pocas cosas. → texto ampliable (BR-13), objetivos de 44 px, estados vacíos que dicen qué hacer.

### 5.3 Sofía, 19 años — universitaria, muchos plazos
Tiene entregas con fecha límite y quiere que la tarea «aparezca hoy» mientras no venza. Le importa la **fecha límite** más que el día. → BR-01, BR-02, pestaña Fechas límite.

### 5.4 Andrés, 41 años — se desorganiza con las listas largas [H]
*«Si abro y veo veinte cosas atrasadas, cierro y no vuelvo.»* Necesita que lo atrasado **no domine** la pantalla de entrada y que «Vencidas» sea un lugar al que decide ir. → «Vencidas» separada, contador neutro, «Vas al día». **No** representa un diagnóstico: es un patrón de uso a validar.

### 5.5 Persona con baja visión o daltonismo [H]
No distingue prioridades por color. → punto **y** texto («ALTA», «MEDIA», «BAJA»); estados con icono y texto; contraste AA en claro y oscuro.

### 5.6 Quien administra la cuenta de Pastel (concede acceso) [H]
Recibe la petición «necesito Brisa». → el estado 403 dice **a quién** pedirlo; la persona nueva sin acceso no ve datos ni se queda sin salida.

## 6. Mecanismos concretos (con límites)

| Mecanismo | Qué hace | Límite / cuidado |
|---|---|---|
| **Día efectivo derivado** | Una tarea abierta con fecha límite vigente aparece hoy sin que nadie la mueva | No reescribe `ScheduledDate`; con límite vencido se queda en el día del límite y pasa a «Vencidas» |
| **Reloj simulado** (solo prototipo) | Muestra el paso de los días sin esperar | No es del producto |
| **Estado vacío con un solo paso** | La primera vez, un único botón | No es un tour; se puede validar si hace falta más |
| **Contador neutro en «Vencidas»** | Informa sin alarmar | Si algún día se quiere avisar más, que sea tras validar con personas |
| **Tema que sigue al sistema** | Evita el destello blanco de noche | Si la persona elige, se respeta |

## 7. Riesgos

- Que la regla derivada **oculte** el patrón de postergación (una tarea viaja semanas). Propuesta sin aprobar en `REQUERIMIENTOS-BRISA.md` §14.
- Que el tono sin culpa se vuelva **ignorable**: validar si «Vencidas» se resuelve o solo se evita.
- Que se importe o escriba una fecha límite **ya vencida**: se rechaza si el día es posterior al límite (BR-03).

## 8. Métricas (sin vanidad)

Ver `REQUERIMIENTOS-BRISA.md` §12. Principal: proporción de «Vencidas» que se resuelven o se mueven en 7 días.

## 9. Guía para entrevistar de verdad (5 personas, 30 min)

1. «Cuénteme cómo anota hoy lo que tiene pendiente.» (sin mostrar Brisa)
2. «¿Qué hace cuando algo se le atrasa?» — escuchar emociones, no solo método.
3. Tarea de uso: «Anote que mañana debe pagar el agua» (¿cuántos pasos? ¿dónde duda?).
4. Mostrar el carrusel con el reloj +4 días: «¿Por qué cree que esa tarea está aquí?» (¿entiende la regla?).
5. «¿Cómo se sintió al ver Vencidas?»

## 10. Preguntas abiertas

Las mismas de `REQUERIMIENTOS-BRISA.md` §14: tipografía, días acumulados, contraste de tarjetas oscuras, deshacer y primera vez.
