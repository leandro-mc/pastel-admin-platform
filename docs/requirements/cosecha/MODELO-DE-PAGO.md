# Modelo de pago a productores · decisión

> **Estado:** decidido para implementar, **con parámetros iniciales a validar con productores reales** (§9). **Fecha:** 2026-10-24.
> **Quién decide qué:** la *estructura* (anticipo + liquidación por pool + calendario fijo) está decidida aquí con evidencia. Los *porcentajes* (anticipo, fondo, gestión, adelanto) los define y ratifica la **asamblea** de la asociación; el sistema los guarda como configuración.
> Prototipo: `prototype/` → módulo **Dinero** (`money.js`). Evidencia completa: [`../research/NOTAS-COSECHA-AGORA-V2.md`](../research/NOTAS-COSECHA-AGORA-V2.md).

## 1. El problema real
Una asociación que vende bien puede quebrar por **cobrar tarde y pagar temprano**, y puede perder a sus productores si **paga tarde, paga distinto a lo prometido o no se entiende cómo se calculó**. El productor decide entre «entregar a la asociación» y «vender por fuera» con tres preguntas: *¿cuánto me van a pagar?, ¿cuándo?, ¿puedo confiar?* El modelo de pago es, por tanto, **el principal instrumento de confianza** de la app.

## 2. Qué dice la evidencia
| Hallazgo | Fuente (conf.) | Qué implica |
|---|---|---|
| Productores con poca liquidez **prefieren pagos agrupados y predecibles**: **86 %** eligió pago mensual en vez de diario aun con **15 % más** de precio por el diario; lo usan como mecanismo de ahorro | Casaburi & Macchiavello, lecheros de Kenia (A) | Un **calendario fijo** vale más que pagar «al instante». La *previsibilidad* es un servicio |
| Aun así, con choques (salud, imprevistos) venden por fuera: la **flexibilidad** (adelantos) y el seguro **reducen** la venta por fuera | Geng et al. (A) | Hace falta una **válvula**: adelanto de emergencia acotado |
| **Pago tardío** favorece la venta por fuera; la **confianza en la dirigencia** la reduce | Shumeta et al., café de Etiopía (A) | Reglas escritas, recibos, estado de cuenta, comunicación frecuente |
| Cooperativas de fruta: **anticipo al entregar → pagos de avance → pago final**, costos del pool prorrateados, riesgo y gastos compartidos de forma equitativa | USDA RBS RR-168, *Cooperative Pooling Operations* (A) | Estructura probada: **anticipo + liquidación final por *pool*** |
| Los productores confían en la cooperativa **más que en comerciantes** que no pueden comprometerse a pagar después | Casaburi & Macchiavello (A) | La asociación compite en **confianza**, no solo en precio |

*Límites de la evidencia:* estudios de Kenia, Etiopía y EE. UU.; **no** de Costa Rica ni de rambután. Dan dirección; los números se validan localmente (§9).

## 3. Alternativas consideradas
| Opción | Cómo funciona | A favor | En contra | Veredicto |
|---|---|---|---|---|
| **A. Pago al recibir (spot)** | Se paga en el acto al precio del día | Simple; el productor ve el dinero ya | La asociación paga **antes de cobrar** (riesgo de caja); precio opaco si cambia; difícil de sostener con compradores que pagan a plazo | ✗ |
| **B. Pago mensual agrupado** | Se paga una vez al mes todo lo entregado | Muy predecible; ahorro forzado | Espera larga: **fruta perecedera con cosecha de 4 meses** → la plata llega tarde; riesgo de venta por fuera | ✗ (como único) |
| **C. Precio fijo por contrato** | Precio acordado antes de la temporada | Certeza total de precio | Riesgo de precio lo asume la asociación; sin historial no puede fijarlo; incumplimientos en ambos sentidos | ✗ (a futuro, con datos) |
| **D. Pago solo al cobrar** | Se paga cuando el comprador paga | Cero riesgo de caja | Demora impredecible; el productor financia a la asociación | ✗ |
| **E. Anticipo + liquidación final por *pool* semanal + calendario fijo + adelanto acotado** | Anticipo fijo el viernes siguiente a la entrega; saldo al cerrar el pool | Combina previsibilidad y justicia; cubre liquidez; riesgo compartido; probado en cooperativas | Más complejo de **explicar**; requiere caja para el anticipo | ✔ **elegida** |

## 4. Decisión
**Modelo E:** *anticipo con calendario fijo + liquidación final por pool semanal + adelanto de emergencia acotado + tope de capital de trabajo + transparencia total.*

### 4.1 Reglas
1. **Pool semanal:** toda la fruta aceptada de la semana forma un pool; sus **ventas, costos y reparto** se calculan juntos (riesgo y costos prorrateados).
2. **Anticipo:** el **viernes siguiente** a la entrega, el **60 %** de un **precio de referencia** × kilos ponderados. *Valor inicial*; la asamblea lo fija.
3. **Liquidación final:** al **cerrar el pool** (cuando se cobró), se paga el **saldo** = total del pool − anticipo − adelantos. También en **viernes**.
4. **Calendario fijo y público:** los pagos se hacen **siempre el viernes**; la fecha **no cambia** sin avisar por escrito con anticipación.
5. **Ponderación por calidad:** kilo **A = 100 %**, kilo **B = 70 %** (valor inicial; la ficha de calidad define A/B).
6. **Adelanto de emergencia:** hasta **30 % del saldo** esperado, para imprevistos; se descuenta del saldo; lo registra gestor o propietario.
7. **Tope de capital de trabajo:** **no se paga anticipo** si la caja proyectada a 8 semanas quedaría negativa; **se avisa antes, no después** (a los productores, con fecha nueva).
8. **Transparencia:** **recibo** por cada entrega y **estado de cuenta** semanal por WhatsApp con tres cifras grandes (entregó / ya se le pagó / falta); el cálculo del pool está disponible para quien lo pida.

### 4.2 Fórmulas
```
ingresos   = Σ (kg vendidos × precio de venta)
costos     = flete + empaque + frío (+ otros directos del pool)
fondo      = fondo_pct × ingresos          (reclamos y mermas; ver POLITICA-DE-RECLAMOS.md)
gestión    = gestión_pct × ingresos
neto       = ingresos − costos − fondo − gestión
kg_pond    = Σ (kg_A + gradoB × kg_B)       (gradoB = 0,70)
precio_A   = neto / kg_pond
pago_prod  = (kg_A + gradoB × kg_B) × precio_A
anticipo   = anticipo_pct × precio_ref × kg_pond
saldo      = pago_prod − anticipo − adelantos
```

### 4.3 Ejemplo con los números del prototipo (ficticios)
Ventas **₡ 644 000** (120 kg × 1 450 + 200 kg × 1 350 + 160 kg × 1 250). Costos **₡ 138 000**. Fondo 3 % = **₡ 19 320**. Gestión 8 % = **₡ 51 520**. **Neto ₡ 435 160**. Entregas: 440 kg A + 25 kg B → 457,5 kg ponderados → **precio A ≈ ₡ 951/kg**.
*Don Mario* (85 kg A + 7 kg B → 89,9 kg pond.): total ≈ **₡ 85 5xx**; anticipo (60 % × 800 × 89,9) = **₡ 43 152**; **saldo ≈ ₡ 42 3xx**. Si pidió un adelanto de ₡ 10 000, el saldo baja a ≈ ₡ 32 3xx.

## 5. Cómo se comunica (y por qué importa)
- Mensaje de **estado de cuenta** (WhatsApp, de usted, ≤ 3 líneas): «Entregó 90 kg. Ya se le pagó ₡ 43 152. Falta ₡ 42 3xx (se paga al cerrar la semana).»
- **Explicación oral** la primera vez, en la asamblea, con el ejemplo de §4.3 en pizarra. [Hipótesis] Quien entiende el cálculo una vez, confía en la cifra después.
- A productores sin WhatsApp: **llamada** o **enlace de zona** (ver `INVESTIGACION-COSECHA.md`).

## 6. Casos límite
| Caso | Regla |
|---|---|
| El comprador **paga tarde** | El anticipo ya salió; el saldo espera. Se informa la fecha nueva. El **fondo de capital de trabajo** (a definir) cubre el desfase; no se retrasa el anticipo siguiente si la caja lo permite |
| El comprador **no paga** | El pool absorbe la pérdida **en proporción** (riesgo compartido), con aviso y acta. Medida preventiva: **riesgo del comprador** y prepago/carta de crédito a compradores nuevos |
| **Reclamo** de calidad | Sale del **fondo de reclamos**, no del productor (ver política de reclamos) |
| Precio de venta **cambia** a mitad de semana | Cada venta usa su precio real; el pool promedia. El anticipo usa un precio de referencia estable para no depender del día |
| Productor **no entrega** lo confirmado | Se registra; el próximo reparto no lo compensa (equidad solo compensa lo que la **asociación** no pidió) |
| **Error de peso/pago** | Se corrige con **ajuste visible** (nunca se edita en silencio); queda en auditoría |

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| Caja insuficiente para anticipos | Tope de capital de trabajo + caja proyectada + financiamiento puente (PROCOMER/banca; a explorar) |
| Productores no entienden el pool | Ejemplo en asamblea, tarjeta del productor, estado de cuenta de 3 cifras |
| Percepción de que «la asociación gana de más» | Gestión y fondo **publicados**; informe al cerrar la temporada con el reparto del fondo |
| Anticipo muy bajo → venden por fuera | Validar % con productores (§9); permitir adelanto |
| Anticipo muy alto → pérdidas si se cae el precio | Precio de referencia **conservador** (revisar semanalmente) |

## 8. Gobierno del modelo
Parámetros en **configuración** (versionada y auditada): `anticipo_pct`, `precio_ref`, `gradoB`, `fondo_pct`, `gestión_pct`, `adelanto_max_pct`, `día_de_pago`. Cambios solo por **acuerdo de asamblea** (acta adjunta) y con **vigencia desde la siguiente semana**. Revisión al cierre de cada temporada.

## 9. Validación con personas reales (obligatoria antes de fijar parámetros)
1. **Experimento de elección** (adaptado de Casaburi & Macchiavello) con 15–30 productores: tarjetas con 3 opciones (p. ej., *pago al recibir con precio X*; *anticipo 60 % el viernes + saldo en 2 semanas con precio X+5 %*; *pago mensual con X+10 %*). Pregunta: «¿Cuál escogería? ¿Por qué?». Medir qué premio de precio aceptan por previsibilidad.
2. **Entrevistas de liquidez** (§Guía en `INVESTIGACION-COSECHA.md`): cuándo necesitan plata, para qué, con qué frecuencia surgen imprevistos.
3. **Prueba de comprensión:** mostrar el estado de cuenta y pedir que expliquen con sus palabras «¿cuánto le falta y cuándo?». Meta: ≥ 80 % lo explica bien.
4. **Piloto de 4 semanas** con 8–10 productores: medir % de pagos en fecha, consultas por «¿por qué me pagaron esto?», y **entrega a la asociación vs. venta por fuera**.
**Criterio de éxito:** 100 % de pagos en la fecha prometida, ≥ 80 % de comprensión, y ninguna baja de entregas atribuible al esquema.

## 10. Preguntas abiertas
¿Hay capital para el tope de caja o se necesita financiamiento puente? ¿La asociación factura al comprador con factura electrónica (obligación a verificar con el contador)? ¿Se acepta pagar por **SINPE** como medio único? ¿Qué pasa con productores sin cuenta?
