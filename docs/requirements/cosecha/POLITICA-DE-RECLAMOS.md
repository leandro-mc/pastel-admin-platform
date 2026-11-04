# Política de reclamos de calidad · decisión

> **Estado:** decidida para implementar, **con valores iniciales a validar** con un técnico poscosecha y con los primeros compradores (§10). **Fecha:** 2026-10-24.
> **No es asesoría legal:** las condiciones se incluyen en cotizaciones y pedidos; su validez debe **verificarse con un abogado**. Prototipo: `prototype/` → módulo **Reclamos** (`ops.js`) y **portal del comprador** (`people.js`). Evidencia: [`../research/NOTAS-COSECHA-AGORA-V2.md`](../research/NOTAS-COSECHA-AGORA-V2.md).

## 1. El problema
La fruta es perecedera (sin frío se oscurece en 3–4 días). Cuando un comprador dice «llegó mala», hay **cuatro partes con incentivos distintos**: el comprador (quiere crédito), la asociación (quiere reputación y caja), el productor (teme que le descuenten) y el transportista (teme que le echen la culpa). Sin reglas **claras, medibles y anteriores al conflicto**, cada reclamo se vuelve una pelea y se pierde la confianza.

## 2. Qué dice la referencia (comercio de perecederos, EE. UU.)
| Principio | Fuente (conf.) | Cómo se usa |
|---|---|---|
| El rechazo se comunica **sin ambigüedad** y en **tiempo razonable**: para camión, **≈ 8 horas** desde el aviso de llegada y disponibilidad para inspección; «razonable» suele ser **el mismo día** | Produce Bluebook (PACA), WGA, USDA-AMS (A/B) | **Ventana de 8 horas** desde la recepción |
| **Aceptar** incluye descargar, desviar o **no avisar a tiempo**; después, el comprador **debe probar** el incumplimiento | USDA-AMS, FSR Magazine (A/B) | Lo no reclamado en ventana se considera conforme, salvo **defecto oculto** probado |
| **Buena entrega**: tolerancia genérica de **5 % descomposición, 8 % daño serio, 15 % total** (existen guías por producto; **no** para rambután) | USDA-AMS (PACA Good Delivery) (A) | Valores **iniciales** de Cosecha, **a calibrar** con técnico y compradores |
| La **inspección/evidencia** respalda el reclamo; quien rechaza sin prueba asume riesgo; arbitraje externo existe para exportación | Produce Bluebook, DRC Canadá (A) | **3 fotos** obligatorias; arbitraje solo en exportación |
| **Temperatura y prueba de entrega** reducen reclamos injustos contra el transportista | FleetRabbit, Truckstop (C) | Foto, nombre, hora y temperatura en la entrega |

## 3. Principios
1. **Regla antes que caso:** el comprador conoce la política **antes** de comprar (va en la cotización).
2. **Mismas reglas para todos** (comprador chico o grande).
3. **Rápido, con evidencia, medible:** ventana corta, fotos con lote, porcentaje de daño.
4. **El productor no paga por lo que ya se aceptó:** el acopio inspecciona y acepta; lo que pase después es riesgo de la **asociación** (transferencia de riesgo clara). Esto **protege la confianza del grupo**.
5. **Incentivo a la calidad sin castigo arbitrario:** vía **fondo de reclamos** compartido y **precio por calidad** (A/B), no vía descuentos sorpresa.
6. **Aprender de cada reclamo:** causa, lote, ruta, hora; para prevenir, no para culpar.

## 4. Reglas
### 4.1 Ventana y evidencia
- El comprador avisa **el mismo día y a más tardar a las 8 horas** de recibir (horas hábiles; configurable).
- Debe aportar **3 fotos**: (1) caja cerrada con **etiqueta de lote**, (2) fruta afectada, (3) balanza/cantidad; y **kilos afectados**.
- El sistema calcula la **cuenta regresiva**; fuera de ventana el reclamo se **considera aceptado**, salvo **defecto oculto** probado (se evalúa caso a caso, como **gesto comercial**).

### 4.2 Tolerancia y resolución (valores iniciales)
| % de kilos afectados | Resolución |
|---|---|
| **≤ 5 %** | Dentro de tolerancia: **sin crédito**; se registra |
| **> 5 % y ≤ 15 %** | **Crédito proporcional** por los kilos afectados: **100 %** si hongo/pudrición; **50 %** si oscurecimiento o daño que no afecta la pulpa |
| **> 15 %** | **Reclamo mayor:** inspección y decisión de la junta; puede incluir reposición o devolución |
Opciones de resolución, en orden de preferencia: **reposición** en el siguiente envío → **crédito** → **descuento** → **devolución**. El comprador elige entre las que la regla permite.

### 4.3 Causa probable (aprendizaje, no castigo)
| Causa | Probable origen | Quién ayuda a mejorar |
|---|---|---|
| Oscurecimiento de espinas | Frío tardío o manejo | Acopio / transporte |
| Golpes | Manejo o transporte | Transportista / acopio |
| Hongo o pudrición | Lote (cosecha/humedad) | Productor (con la foto de recepción) |
| Daño tras la entrega | Almacenamiento del comprador | Comprador (explicación) |

### 4.4 Quién absorbe el costo
1. **Todo crédito sale del *fondo de reclamos y mermas*** (valor inicial **3 %** de las ventas del pool).
2. **No se descuenta al productor** lo ya aceptado en el acopio.
3. **Excepciones** (escalonadas y con **prueba**): ocultamiento deliberado (p. ej., fruta mojada o en mal estado bajo capa buena, verificable con fotos de recepción) → **advertencia** → **recategorización a B** de los siguientes lotes → **suspensión temporal**, siempre con **derecho a respuesta** del productor y decisión de la junta.
4. **Si el fondo no alcanza**, el faltante lo absorbe el **pool** de la semana (riesgo compartido).
5. **Al cerrar la temporada**, **lo no usado del fondo se reparte** entre los productores **en proporción a los kilos ponderados entregados**: *todos ganan cuando hay menos reclamos* (incentivo colectivo a la calidad).

### 4.5 Tiempos de respuesta (compromiso de servicio)
| Etapa | Plazo |
|---|---|
| Acuse al comprador | **2 horas hábiles** |
| Resolución | **3 días hábiles** (reclamo mayor: 5) |
| Cierre y aprendizaje (causa, lote, ruta) | Al resolver |

### 4.6 Anti-abuso
- Solo se puede reclamar **una entrega recibida**, ligada a un **lote** real.
- Señales de alerta (a revisar, no a acusar): reclamos **sistemáticos** del mismo comprador cerca de la renegociación de precio, **fotos reutilizadas** (huella de la imagen), **tiempo de aviso siempre al límite**.
- **Límite razonable** de reclamos por comprador y mes sin inspección.
- Un comprador con historial limpio puede recibir **resolución más ágil**.

## 5. Roles (quién hace qué)
| Rol | Puede |
|---|---|
| **Comprador** | Reportar con ventana, 3 fotos y kilos; ver estado y decisión |
| **Comercial** | Ver el caso y acompañar al comprador; **no decide** |
| **Gestor** | Evaluar con la política, aplicar decisión, pedir más evidencia |
| **Propietario / junta** | Decidir reclamos mayores y excepciones al productor; ajustar parámetros |
| **Transportista / Acopio** | Aportar su prueba (entrega, foto de recepción, temperatura) |
| **Contabilidad** | Ver el fondo y los créditos aplicados |

## 6. Ejemplo con el prototipo
- **Frutería La Esquina:** lote RB-261022-P3, **6 kg de 40 kg** (15 %), oscurecimiento, avisó a las **5 h** con **3 fotos** → dentro de ventana, 15 % ≤ 15 % → **crédito del 50 %**: 6 kg × ₡ 1 350 × 0,5 = **₡ 4 050**, del fondo; **no se descuenta al productor**; causa probable: **frío/manejo**.
- **Hotel Playa Ejemplo:** 4 kg de 200 kg, golpes, avisó a las **20 h** con 1 foto → **fuera de ventana** y sin evidencia → se considera **aceptada**; se atiende solo como gesto comercial si hay defecto oculto probado.

## 7. Datos que se guardan
`Claim {entregaId, loteId, compradorId, kgEntregados, kgAfectados, causa, horasDesdeRecepción, fotos[3], estado, decisión, créditoCRC, atribución, resueltoPor, fechas}` · `ReserveFund {temporada, aportes, créditos, saldo}` · todo con **auditoría** y sin editar en silencio.

## 8. Riesgos
| Riesgo | Mitigación |
|---|---|
| Tolerancias mal calibradas (muy estrictas → pierde ventas; muy laxas → pierde plata) | Calibrar con técnico y 2–3 compradores; revisar tras 4 semanas |
| Compradores grandes no aceptan ventana de 8 h | Negociar por contrato; exportación con inspección/arbitraje externo |
| Productor siente que «le echan la culpa» | Principio 4.4(2); transparencia de causas; derecho a respuesta |
| Abuso por parte del comprador | §4.6 |
| El fondo se agota en semanas malas | Aporte ajustable; el pool absorbe; informe semanal |
| Validez legal de las condiciones | Revisión de abogado (§10) |

## 9. Cómo se explica
- **Comprador:** una página en la cotización: «Cómo reclamar en 4 pasos» (ver guía del comprador).
- **Productores:** «Lo que ya se aceptó en el acopio **no se le cobra**. Si hay reclamos, salen de un fondo común; lo que sobra se reparte al final de la temporada.»

## 10. Validación (obligatoria)
1. **Técnico poscosecha:** definir criterios de A/B, qué es «oscurecimiento que no afecta la pulpa», y tolerancias realistas **por calibre y por tiempo** (los números iniciales son de otro producto).
2. **2–3 compradores reales:** probar la política en papel: «¿aceptaría 8 horas? ¿las 3 fotos? ¿la tolerancia?». Registrar objeciones.
3. **Productores:** explicar el fondo con el ejemplo y medir comprensión y aceptación (ver `INVESTIGACION-COSECHA.md`).
4. **Abogado:** cláusulas en cotización/pedido y tratamiento de datos de las fotos.
5. **Piloto:** 6 semanas; medir % de reclamos, tiempo de resolución, % dentro de tolerancia, satisfacción del comprador y uso del fondo.
**Criterio de éxito:** ≥ 90 % de reclamos resueltos en el plazo; ningún productor descontado por lo ya aceptado; el fondo cubre ≥ 90 % de los créditos.
