# Notas de investigación · Brisa v3 y Balance v3 (2026-11-09)

> Confianza: A (primaria/oficial/revisada por pares) · B (guía especializada o prensa seria) · C (blog/comercial/testimonio). Los estudios son de otros países: **dan dirección, no certeza para Costa Rica**; cada decisión dice cómo validarla con personas reales. Todo se parafraseó. **Lo que no se pudo recuperar en esta sesión está marcado** y no se usa como base de ninguna cifra.

## BALANCE

### Competencia y fricción de invitar
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Varias apps de la categoría **no exigen cuenta** para entrar al grupo (Tricount, Splid); Splitwise sí y su plan gratuito **limita entradas diarias** según las comparativas | Comparativas de Finny, Partly, Gerald, Tricount (blog propio), Split-circle, Whistleout | C | Mantener D3 (cuenta obligatoria) pero **compensar** con una página de invitación que explique los pasos; medir abandono por paso |
| Las comparativas son comerciales y cambian con frecuencia (precios, límites) | Las mismas | C | **No** basar decisiones de precio ni de límites en ellas; revisar antes de decidir |
| Algunas apps minimizan transferencias; otras solo «simplifican»; ninguna mueve dinero | Las mismas | C | D2 (voraz determinista) y **no registrar pagos** (D6) son coherentes con el mercado |

### Dinero entre personas
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Quien divide **en partes iguales** tiende a pedir más (el costo propio se diluye) | Gneezy, Haruvy y Yafe, «The inefficiency of splitting the bill», *Economic Journal* (2004); entrevista en Gelf Magazine | B (se leyó la entrevista, **no el artículo original**) | D6 se mantiene; se registra el riesgo de **equidad percibida** y la pregunta abierta; no se cambia la regla |
| En una encuesta comercial británica, más de la mitad reparte igual «porque es más fácil» y alrededor de un tercio por **miedo a parecer tacaño** | OpenTable UK (blog) | C | El reparto igual es el valor por defecto social: la interfaz **no juzga** ni premia a quien paga más |
| En amistades cercanas pesan normas **comunitarias** (cuidar) frente a las de **intercambio** (contar) | Clark y Mills (1979), vía divulgación (RNZ) | B/C | Tono sin juicio; ámbar para «debe», no rojo; lista de pasos, no acusación |

### Liquidación
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Minimizar el **número de transferencias** para saldar deudas es un problema **NP-difícil** (Verhoeff, 2004); cualquier método voraz que cierre un saldo por pago garantiza a lo sumo (acreedores + deudores − 1) pagos | Verhoeff, *Informatics in Education* (2004), recogido en material de cursos y repositorios; artículos de optimización | A (teoría) / B (la revista *Informatics in Education* aparece en los resultados; **no se leyó el artículo completo**) | D2 (voraz determinista) es correcta; la propiedad «≤ n−1» se **prueba con 6 000 escenarios aleatorios**; «minimizar» queda opcional (G32) |

### Costa Rica
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| SINPE Móvil: el monto transado siguió creciendo en los primeros 10 meses de 2025 | Observador.cr | B | El pago ocurre **fuera** de Balance; no se integra |
| Hay dudas sobre el **monitoreo** de transferencias (julio 2026) | Teletica | B | Balance **no guarda teléfonos ni datos bancarios** |
| Hay **estafas con comprobantes falsos** | CRHoy | B | Aviso de **verificar el pago en la propia cuenta** (propuesta) |
| El BCCR prepara **QR y alias** para SINPE Móvil | Observador.cr; La Nación | B | «Copiar monto» puede quedar corto; revisar al implementar |
| Ley 8968 (datos personales) aplica a nombres y gastos | Conocimiento general; **no se verificó en esta sesión** | — | **Pendiente:** verificar con asesoría antes de producción |

## BRISA

### Planificación y carga mental
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| **Planes de implementación** (cuándo y dónde) mejoran el cumplimiento de metas: **94 pruebas**, efecto medio **d ≈ 0,65** | Gollwitzer y Sheeran (2006), *Advances in Experimental Social Psychology* 38 (se consultó un resumen; **la URL que devolvió el buscador no coincidía con el título: localizar la fuente oficial antes de citar**) | A (el estudio); URL por verificar | El **día asignado** es el componente «cuándo»: hipótesis de respaldo, no garantía (la evidencia es de planes «si–entonces») |
| **Escribir un plan** reduce la carga cognitiva de metas pendientes | Masicampo y Baumeister (2011) | B — **no recuperado en esta sesión: verificar** | Alta con un solo dato; no se cita ninguna cifra |

### Culpa por lo atrasado
| Hallazgo | Fuente | Conf. | Decisión |
|---|---|---|---|
| Quienes construyen y usan apps de tareas describen **abandono por la culpa** de ver acumuladas las «vencidas» | IndieHackers (varios testimonios), blogs de productividad | C | «Vencidas» ya es una pestaña propia y amable (decidido); contador neutro; **no** se añaden rachas ni alarmas |
| La procrastinación se vincula a **regular emociones** | Resultado de búsqueda (artículo no abierto) | C | **No se cita cifra**; contrastar antes de usar |

## Cosas que NO se encontraron
- Ningún estudio revisado por pares que mida si **mostrar «vencidas» en rojo** aumenta o reduce el abandono: lo disponible son testimonios (C). Se trata como **señal de diseño**, no como hecho.
- Cifras confiables de **adopción de SINPE Móvil por edad** o de **tamaño típico de un grupo de gastos** en Costa Rica: hay que preguntarlo en las entrevistas reales.
