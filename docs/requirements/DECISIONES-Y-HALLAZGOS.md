# Decisiones importantes, hallazgos y funcionalidades nuevas

> Complementa los tres documentos de requerimientos. Aquí está **lo que se decidió y por qué**, **lo que usted no había pedido pero la investigación y la empatía con cada actor hicieron necesario**, y **lo que no se pudo verificar**.
> Método: para cada app se asumió sucesivamente el rol de *product owner*, de *persona usuaria experta* en cada actor (productor, gestor, comprador, reclutador, candidata, lectora…) y de *revisor adversarial* ("¿cómo falla esto en la vida real?"). Cada decisión cita su evidencia (ver [`research/FUENTES.md`](research/FUENTES.md)).

---

## 0. Cambios de la v2 (2026-10-24)
Tras revisar sus capturas del navegador (ver [`REVISION-UX-V1.md`](REVISION-UX-V1.md)) y su pedido, se trabajó con el [`METODO-DE-TRABAJO.md`](METODO-DE-TRABAJO.md). Decisiones nuevas:

| ID | Decisión | Por qué |
|---|---|---|
| D-60 | **Barra de desarrollo** (selector de rol + tema + parámetros de URL) en **todos** los prototipos; no es parte del producto | Ver cada app **desde cada rol** y poder generar capturas/manuales reproducibles |
| D-61 | Colores con **`light-dark()`** y interruptor **Auto/Claro/Oscuro** | La v1 dependía de la preferencia del sistema; ahora hay claro y oscuro en todas (94 pares de contraste medidos) |
| D-62 | **Cosecha = una sola app por roles**, con diseño de **escritorio** y **móvil** reales | En v1 era un diseño móvil estirado y dos apps separadas (capturas) |
| D-63 | **Modelo de pago:** anticipo con calendario fijo + liquidación por *pool* + adelanto acotado + tope de capital de trabajo | Evidencia de pagos predecibles y pools de cooperativas → [`cosecha/MODELO-DE-PAGO.md`](cosecha/MODELO-DE-PAGO.md) |
| D-64 | **Política de reclamos:** ventana 8 h, 3 fotos, tolerancias, **fondo de reclamos que protege al productor** y se reparte al cerrar | Referencia PACA + incentivo colectivo a la calidad → [`cosecha/POLITICA-DE-RECLAMOS.md`](cosecha/POLITICA-DE-RECLAMOS.md) |
| D-65 | **Canal de contacto por productor** (WhatsApp / llamada / voz / enlace de zona) y **rol Enlace de zona** | Voz > texto; no contestan desconocidos; relevo humano de confianza |
| D-66 | **Acopio sin precios**; **Transportista** con prueba de entrega y espera pagable; Comercial sin pagos | Mínimo privilegio y protección de cada parte |
| D-67 | **Guías por rol generadas desde el propio prototipo** (las «capturas» son el prototipo en un estado) | No se desactualizan; verificadas (25/25) |
| D-68 | **Huella: banco = cuaderno privado en texto largo**; derivación de logros con preguntas por cifra; **filtros duros** | La v1 era una lista de frases; la persona *cuenta* |
| D-69 | **CV v2** (Source Sans 3, acento sobrio) + **Word en F1**; Junior con perfil de **3 líneas** | Imagen del CV (aspecto de plantilla por defecto + defecto en Educación) y guía local de PROCOMER |
| D-70 | **Estudio en una sola pantalla** con vista previa; se elimina el «Resultado» vacío | Callejón sin salida en las capturas |
| D-71 | **Ágora: matriz de roles con separación de funciones** y «Sin permiso» que explica el porqué | Confianza en el sello y en la curaduría → [`agora/ROLES-Y-PERMISOS.md`](agora/ROLES-Y-PERMISOS.md) |
| D-72 | **Ágora: despolarización** (*Voces cercanas*, *Lo que nos une*, *Perspectivas*, **Escucha ciudadana**, «leí antes de compartir») y neutralidad electoral | El público está desencantado, no dividido en bandos; evidencia de intervenciones breves → [`agora/INVESTIGACION-AGORA.md`](agora/INVESTIGACION-AGORA.md) |
| D-73 | **Revisión visual del propietario** como verificación obligatoria; las pruebas automáticas no ven el aspecto | Lección L6 del método |

## 0b. Cambios de la v3 (2026-11-09): Brisa y Balance

Se sumaron las dos apps que **ya existen** y se migran a Pastel, partiendo de las ramas `docs/brisa-inventory` y `docs/balance-inventory` (desactualizadas respecto del formato actual). Sus inventarios se conservan **intactos**; las decisiones que el propietario ya tomó (Brisa §13, Balance D1–D9) **prevalecen** y no se reabren.

| ID | Decisión | Por qué |
|---|---|---|
| D-80 | **Brisa no se rediseña:** se conserva el prototipo del carrusel que el propietario aprobó y se le agrega barra de desarrollo con 5 situaciones, tema Auto/Claro/Oscuro, reloj simulado y estados | «Me gusta mucho» → no se cambia lo aprobado; solo lo que el método exige |
| D-81 | **La regla de reprogramación diaria de Brisa vive en un módulo puro y probado** (`brisa/prototype/logic.js`): V1–V10 y AC1–AC7 del inventario como pruebas | Es el requisito obligatorio de Brisa; ahora es verificable (39 pruebas) |
| D-82 | **Brisa oscuro: el texto dentro de las tarjetas pastel se aclara** (`#f7f8f5`, secundario `#eceff1`) conservando la mezcla al 36 % | 7 de 10 tarjetas quedaban entre 4,34 y 4,49:1; el secundario bajaba de 4,5:1. **Para producción requiere token (CCR) o mezcla al 28 %** |
| D-83 | **Balance se rediseña** con el concepto «cuentas claras»: *su situación* primero, saldos **en palabras y cifra**, liquidación como **recibo**, saldos con **barra de eje central** | SaldApp mostraba una tabla de todos; la evidencia apunta a que la conversación sobre el dinero, no la aritmética, es el problema |
| D-84 | **Balance: paleta sin rojo/verde:** verde azulado = *le deben*, ámbar = *debe*; rojo solo para errores; Public Sans | Deber no es fallar; rojo/verde falla para daltonismo; todo medido AA |
| D-85 | **Balance: dominio ejecutable** (`money.js`, `rules.js`) probado con los casos dorados G01–G41 y 6 000 escenarios aleatorios | El diseño nuevo descansa sobre reglas ya verificadas (D1, D2, D4, D8, D3, D7) |
| D-86 | **Balance: página de invitación** para quien no tiene cuenta (3 pasos y regreso al código), **la misma** para cualquier enlace | La cuenta obligatoria (D3) es decisión del propietario; la fricción se compensa, no se cambia la decisión |
| D-87 | **Balance: «Copiar monto»** en los pagos propios | SINPE Móvil exige teclear el monto. **Propuesta, no aprobada** |
| D-88 | **Balance: lista de todos los gastos** del grupo con orden definido y edición desde la fila | Problema 10.3.8 de SaldApp |
| D-89 | **Los inventarios se movieron a `docs/requirements/<app>/INVENTARIO-*.md`**; las ramas `docs/*-inventory` quedan **sustituidas** (no se borraron) | Una sola ubicación y un solo formato; evita duplicados al fusionar |
| D-91 | **Balance: «Hoja de gastos»** para administración (editar en la celda, fila nueva, eliminar uno o varios con «Deshacer», pegar filas desde Excel, todo o nada) | El propietario detectó que se había perdido la gestión masiva de gastos; con muchos gastos un formulario por cada uno no es viable |
| D-92 | **Balance: filtros de gastos** (texto, quién pagó, fechas, orden) y **«Ver sus gastos»** de una persona desde Saldos y Personas | También se había perdido: el «Detalles» por integrante del SaldApp |
| D-90 | **`check-hard-rules.js`** (sin morado ni símbolos de IA) forma parte de las pruebas | Las reglas duras de `AGENTS.md` §7 se vigilan también en los prototipos |

**Hallazgos de la v3**
- **El inventario de Balance dice «41 códigos ISO» y su tabla trae 40** (contado por programa). Se implementaron los 40.
- **El motor de dinero reproduce al centavo G26** (20 integrantes, 19 pagos) y cumple las propiedades: partes y saldos exactos, a lo sumo *n−1* pagos, independiente del orden de entrada.
- **Tensiones de diseño entre decisiones del propietario y la evidencia** (se dejan como riesgo y pregunta, no se cambian): D3 (cuenta obligatoria) frente a la fricción de invitar; D6 (partes iguales sin excepción) frente a la equidad percibida.
- **Defecto de arranque (Brisa):** si «hoy» no existe al cargar los datos de ejemplo, las fechas salen inválidas y se guardan. Cubierto por prueba.
- **Singular:** el contador de Brisa decía «1 hechas».
- **Revisión del propietario sobre Balance (2026-11):** dos funciones del original se habían perdido en el rediseño (gestión masiva de gastos y vista por persona). Se recuperaron (D-91, D-92) y se creó la **tabla de paridad** de `balance/REQUERIMIENTOS-BALANCE.md` §12b. Al implementarlas la revisión visual con navegador sin cabeza halló tres defectos que las pruebas no ven (el atributo `hidden` anulado por el CSS, columnas cortadas y filtros truncados). **Limitación:** el inventario salió del código y **no registró** un panel estilo Excel; la hoja se construyó según la descripción del propietario y debe compararse con el original. Quedan por confirmar la **fecha de inicio/cierre** del grupo (§12b).
- **Fusión a `dev`:** `refactor/modular-foundation` tiene 1 commit más reciente que `research` (limpio) y el **CCR-1** (aprobado) choca con las zonas protegidas que `refactor` reescribió: ver [`PLAN-DE-FUSION-A-DEV.md`](PLAN-DE-FUSION-A-DEV.md).

---

## 1. Decisiones transversales (v1, vigentes)

| ID | Decisión | Por qué | Alternativa descartada | Requiere |
|---|---|---|---|---|
| D-01 | **Prototipos en HTML/CSS/JS puro**, sin compilar | Se abren con doble clic para validar con personas; sin acoplarse a React/Tailwind antes de decidir el diseño | Maquetar directamente en React dentro del repo (mezcla validación y producción) | — |
| D-02 | **Cada app con identidad propia**, no un cambio de tinte | El propio repo reconoce que la degradación visual vino de homogeneizar; autorizado a ignorar paletas | Reutilizar la paleta por módulo del repo | Aprobación visual |
| D-03 | **Typst como motor documental compartido** (`Pastel.Documents`): CV de Huella, cotizaciones/fichas/recibos de Cosecha, tarjetas PNG de Ágora | Un solo binario, PDF etiquetado por defecto, rápido; evita instalar una distribución TeX o un navegador sin cabeza | LaTeX completo (imagen enorme, trampas de ligaduras/iconos); Chromium sin cabeza (pesado, sin garantía de capa de texto) | **CCR** (zona protegida: Docker/BuildingBlocks) |
| D-04 | **Metadatos `og:*` inyectados por servidor** con un único ADR compartido (Huella + Ágora + kit de Cosecha) | Las apps de mensajería no ejecutan JS; hoy cada ficha lo pide por separado | Tres soluciones distintas | CCR/ADR |
| D-05 | Renombrar `Campaign` → **`Season`** en Cosecha | Evita choque con "campañas de contacto" (ahora *Secuencias*) | Mantener nombre ambiguo | Aprobación |
| D-06 | **Fuentes autoalojadas** en producción | La CSP actual bloquea terceros y es mejor para privacidad; los prototipos usan Google Fonts solo para ver el diseño | Depender de CDN | CSP/CCR |
| D-07 | Tono de interfaz **impersonal/de usted** por defecto; mensajes a productores **siempre de usted**; voseo disponible a pedido | Respeto a personas mayores; coincide con la política del repo (voseo permitido si lo solicita) | Voseo general | — |
| D-08 | **Todo lo normativo se marca "verificar"** y es editable | Varias fuentes consultadas eran antiguas o secundarias; no se afirma admisibilidad ni obligaciones fiscales de memoria | Presentarlo como hecho | Revisión con SFE/PROCOMER/contador/abogado |

## 2. Huella

| ID | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-10 | **La IA devuelve JSON, no LaTeX/Typst.** Plantilla fija + datos | Garantiza límites de página, impide errores de compilación e inyección, permite validar cada línea | "La IA escribe el .tex" (se propuso inicialmente): no hay garantía de tamaño ni de seguridad |
| D-11 | **Typst primario; `.tex` y `.docx` como exportaciones** desde el mismo JSON | Typst: PDF etiquetado, ligaduras controlables. DOCX: algunas fuentes lo señalan como el de mayor tasa de parseo; el `.tex` sirve para editar en Overleaf | Un solo formato |
| D-12 | **Límites por presupuesto de líneas, verificados**: script de cálculo + prueba de estrés contra el compilador real | Las cifras "a ojo" fallaron en la primera iteración (Junior desbordaba 8 líneas; la cabecera real ocupa 2 líneas de contacto) | Tabla de caracteres sin verificar |
| D-13 | **Junior 1 pág. · Mid 2 máx. · Senior 2 máx.**; sin tercer nivel "ejecutivo" | Consenso de guías 2026; tres páginas solo ejecutivo/académico | Dar 3 págs. a Senior |
| D-14 | **Escalera de ajuste**: comprimir → eliminar menos relevantes → fusionar → micro-tipografía (≥10 pt) → fallar con guía | El conteo de páginas del compilador es la verdad; nunca se reduce la fuente por debajo de 10 pt | Reducir la fuente hasta que quepa |
| D-15 | **Proveedores por nivel** (Rápido/Equilibrado/Máximo) con mapa editable y "Listar modelos" | Los nombres cambian cada trimestre (p. ej. nuevos modelos en septiembre 2026) | Codificar nombres de modelo |
| D-16 | **Modo manual** (copiar/pegar con la misma validación) | Coste cero y respaldo cuando se agota la cuota gratuita | Obligar a tener API |
| D-17 | **Escudo de PII** antes de enviar a la IA | En Gemini gratuito los datos pueden usarse para mejorar modelos y leerse por revisores | Enviar el CV completo |
| D-18 | **Guardián de verdad**: `sourceIds` obligatorios, cifras verificadas, entidades copiadas, la IA solo *sugiere* habilidades | Un CV con invento es un riesgo para el candidato | "Confiar en el prompt" |
| D-19 | **Generación por sección** con caché | Idea del propietario; además abarata, cabe en cuotas gratuitas y permite reintentar una sola sección | Una llamada monolítica |
| D-20 | **Dos variantes por logro** (corta/larga) | La escalera de ajuste puede elegir sin llamar a la IA | Pedir siempre reescritura |
| D-21 | Habilidades **con evidencia**, sin barras de nivel | Las barras no significan nada y los reclutadores las desconfían; la evidencia sí | Barras de porcentaje |
| D-22 | Perfil público: **huella generativa + resaltador**; paleta tinta/papel frío/marcador amarillo; Archivo + Atkinson Hyperlegible | Nace del contenido ("huella", "subrayar lo que importa"); **se evita también el kit "anti-IA" más repetido** (crema + terracota + serif) | Kit genérico o su sustituto de moda |
| D-23 | **Tracker de postulaciones** | Sin él no se aprende qué enfoque funciona | Solo generar CV |

## 3. Cosecha

| ID | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-30 | **Sin contacto en frío por WhatsApp**; solo con consentimiento o respuesta previa | Políticas de WhatsApp Business: opt-in, plantillas, calidad de cuenta; el bloqueo afectaría la línea con los productores | "Contacto masivo por WhatsApp" tal como se pidió |
| D-31 | **Correo B2B automatizado con guardas** (país, autenticación, baja en un clic, supresión global, pausa por rebotes/quejas) | Es legal bajo condiciones y los buzones aplican umbrales estrictos | Envío libre |
| D-32 | **Modelo *pull***: no se pide fruta sin demanda confirmada | Sin frío se oscurece en 3–4 días; la poscosecha manda | Acopio especulativo |
| D-33 | **Escalera de mercados** (0 cercano → 4 exportación directa) y exportar primero **con socio** | Quien parte de cero no puede asumir registros, frío y riesgo a la vez | Ir directo a exportar |
| D-34 | **Reparto con equidad** + explicación "por qué me tocó esto" | La confianza de los productores depende de percibir justicia | Solo proporcional a capacidad |
| D-35 | **Reloj de frescura y lotes** con vida útil **configurable** | Los valores de la literatura son de otras zonas/cultivares; calibrar con un técnico | Valores fijos |
| D-36 | **Caja proyectada 8 semanas** y modelos de pago | Pagar antes de cobrar quiebra asociaciones que venden bien | Solo margen informativo |
| D-37 | Roles **Comercial / Acopio / Contabilidad** + **"Ver como…"** | Dar acceso a 2–3 personas sin exponer pagos | Un único rol Gestor |
| D-38 | **Recepción sin conexión** | Fincas con cobertura inestable | Requerir red |
| D-39 | **Kit comercial público** (ES/EN, QR, formulario entrante) | Convierte la imposibilidad de "contactar a todos" en atracción de interesados | Solo salida |
| D-40 | **Ruta de arranque editable** | Incorpora el conocimiento de mercado que la asociación no tiene | Pantallas vacías |
| D-41 | **Hoy es fin de temporada**: la app muestra la fase del año (cierre + prospección 2027) | Temporada julio–inicios de noviembre | Interfaz estática |
| D-42 | **Segmento procesado/industrial** (harina de cáscara, enlatado, pulpa) para absorber descarte | UCR/TEC y otras iniciativas lo desarrollan; reduce pérdidas | Descartar el segundo grado como pérdida |

## 4. Ágora

| ID | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-50 | **Andamiaje familiar (Facebook) + feed finito** "Hoy en 5 minutos" / "Está al día" | Facebook: 80 % de adultos con celular; evitación de noticias ~42 %: agotamiento | Scroll infinito |
| D-51 | **Sin comentarios abiertos**; reacciones constructivas, preguntas al especialista curadas, "Señalar un error" | La gente prefiere compartir por WhatsApp antes que debatir en público; moderar es costoso | Comentarios desde el MVP |
| D-52 | **Tarjeta para WhatsApp con sello y fuente** | WhatsApp 96 %; la confianza debe viajar con el enlace | Solo botón "compartir" |
| D-53 | **Modo calma** y resumen semanal opcional | Respeta el ritmo | Notificaciones por defecto |
| D-54 | **Compositor guiado**: Se sabe / No se sabe / Por qué importa + lista de control | Calidad constante con poco equipo | Editor Markdown libre |
| D-55 | **Glosario en línea** y **"¿Qué entendí?"** | Objetivo declarado: comprender; mide comprensión sin guardar identidad | Solo texto |

---

## 5. Funcionalidades nuevas que no se habían pedido

> Cada una nace de un actor concreto. *Fase* según los documentos de requerimientos.

### Huella
| Funcionalidad | La motivó… | Valor | Fase |
|---|---|---|---|
| **Resaltador** en el perfil público | El reclutador con 7 s | Comprueba encaje sin leer todo | F1 |
| **Huella dactilar generativa** (sustituye foto) | El diseño genérico; la privacidad | Identidad sin subir archivos | F1 |
| **Reporte ATS "lo que ve el ATS"** (doble extracción) | El ATS como actor | Confianza real en el PDF | F1 |
| **Mapa de brechas honesto** previo a generar | El candidato que teme inflar | Evita inventos y gasto de llamadas | F1 |
| **Modo manual** y **escudo de PII** | Cuota gratuita y privacidad | Coste cero y seguro | F1 |
| **Variantes corta/larga** por logro | Ajuste de página | Sin llamadas extra | F1 |
| **Tracker de postulaciones** y **aviso de apertura** del enlace | Quien postula a 15 ofertas/semana | Aprende y hace seguimiento | F2 |
| Exportar `.tex` / `.docx` | Portales que piden Word; Overleaf | Flexibilidad | F2 |

### Cosecha
| Funcionalidad | La motivó… | Valor | Fase |
|---|---|---|---|
| **Ruta de arranque** | El gestor sin experiencia de mercado | Convierte conocimiento en pasos | F1 |
| **Escalera de mercados** | El propietario sin contactos | Evita saltar peldaños | F1 |
| **Kit comercial público + QR** | Compradores lejanos | Embudo entrante | F1 |
| **Cola de WhatsApp de 1 toque** + respuestas + plan B | Productores que no usan apps | Convocar en minutos | F1 |
| **Recibo al productor** y **estado de cuenta** por WhatsApp | *Don Mario* | Transparencia, menos disputas | F1 |
| **Reparto con equidad** y "por qué" | Productores | Confianza | F1 |
| **Caja proyectada** | Gestor | Evitar quiebra | F1 |
| **Oferta prometible** y semáforo | Gestor y comprador | Evitar sobreventa | F1 |
| **Recepción sin conexión**, foto y motivo de rechazo | Acopio | Sin disputas, sin señal | F1 |
| **Guardas de cumplimiento** de contacto | Reputación y ley | Protege dominio y línea | F2 |
| **Reloj de frescura**, lotes, **simulación de retiro** | Comprador y exportador | Trazabilidad | F2 |
| **Riesgo del comprador** → condiciones de pago | Compradores nuevos | Menos impagos | F2 |
| **Reclamos** con causa | Comprador | Aprende dónde se pierde | F2 |
| **"Ver como…"** e invitaciones temporales | Propietario que delega | Delegar sin exponer | F1 |
| **Cierre de temporada** e informe de impacto | Aliados | Aprendizaje y financiamiento | F2 |
| **Calendario de ferias** | Comercial | Planificar presencia | F2 |
| **Segmento procesado/industrial** | Productor (descarte) | Menos pérdida | F2 |

### Ágora
| Funcionalidad | La motivó… | Valor | Fase |
|---|---|---|---|
| **Hoy en 5 minutos / Está al día** | La lectora cansada | Sensación de control | F1 |
| **Se sabe / No se sabe / Por qué importa** | La persona escéptica | Muestra el límite del conocimiento | F1 |
| **Glosario en línea**, **¿Qué entendí?** | El objetivo de comprender | Comprensión medible | F1 |
| **Tarjeta WhatsApp con sello** | Dónde circula la información | La confianza viaja | F1 |
| **Modo calma** | Evitación de noticias | Retención sin presión | F1 |
| **Pregunte al especialista**, **Señalar un error** | Interacción sin hostilidad | Comunidad moderable | F1 |
| **Quiénes verifican** (perfiles) | Credibilidad | Confianza visible | F1 |
| **Resumen semanal** | Quien no abre a diario | Hábito suave | F2 |

---

## 6. Oportunidades entre apps
- **Motor documental común** (Typst): CV, cotizaciones, hoja de producto, recibos y tarjetas.
- **Un único mecanismo de enlace-capacidad** (token, hash, revocación, `noindex`) para el perfil de Huella y el kit de Cosecha.
- **Ágora como vitrina de historias reales** del origen de la fruta (serie "De la finca"): contenido para el kit comercial y el sello de la asociación. *Opcional, a decidir.*

## 7. Estado de las decisiones pendientes
| # | Tema | Estado |
|---|---|---|
| 1 | Dirección visual de cada app | **En revisión con sus capturas** (v2 incorpora el diseño nuevo; falta su visto bueno sobre la v2) |
| 2 | **CCR** para Typst + fuentes en el host y `Pastel.Documents` | ✅ **Aprobado** por el propietario (2026-10-24). Pendiente: redactar la solicitud de cambio |
| 3 | `Campaign → Season` | ✅ **Aprobado** |
| 4 | Huella solo Owner o invitados (F3) | Abierta (la v2 incluye la vista «Invitada (F3)» para decidir con algo concreto) |
| 5 | **Política de reclamos** | ✅ **Decidida con investigación** (valores iniciales a validar): [`cosecha/POLITICA-DE-RECLAMOS.md`](cosecha/POLITICA-DE-RECLAMOS.md) |
| 6 | **Modelo de pago a productores** | ✅ **Decidido con investigación** (porcentajes a validar con productores y ratificar en asamblea): [`cosecha/MODELO-DE-PAGO.md`](cosecha/MODELO-DE-PAGO.md) |
| 7 | Dominio de correo para secuencias | Abierta |
| 8 | Resumen semanal de Ágora en F1 | Abierta |
| 9 | Socio exportador candidato | Abierta |
| 10 | **Balance:** ¿41 o 40 monedas? (la tabla del inventario trae 40) | Abierta |
| 11 | **Balance:** cuenta obligatoria (D3) y fricción de invitar; partes iguales sin excepción (D6) | Abierta (se miden con el uso; ver `balance/REQUERIMIENTOS-BALANCE.md` §15) |
| 12 | **Balance:** «Copiar monto», aviso de verificar el pago, vencimiento del enlace, texto para WhatsApp | Propuestas sin aprobar |
| 13 | **Brisa:** tipografía, indicador de días acumulados, contraste oscuro de tarjetas (token o 28 %) | Abierta (`brisa/REQUERIMIENTOS-BRISA.md` §14) |
| 14 | **Fusión a `dev`** (orden, CCR-1, fichas de módulo) | Plan listo, **espera autorización expresa**: [`PLAN-DE-FUSION-A-DEV.md`](PLAN-DE-FUSION-A-DEV.md) |

## 8. Limitaciones y cosas no verificadas (honestidad)
- **Repositorio:** el nombre indicado (`pastel-workspace`) no existe con ese nombre para el token; se trabaja en **`leandro-mc/pastel-admin-platform`** (rama base `refactor/modular-foundation`).
- **Sincronización con la rama base:** el análisis partió de `a8c1c7d`. La rama avanzó mientras se trabajaba (estado actual: `fce65bd`). El cambio de producto del propietario del 2026-10-23 (*Cosecha la concede el Owner; Huella es exclusiva del Owner; Ágora obligatoria salvo decisión del Owner*) es **coherente con lo propuesto aquí**. Esta rama solo agrega archivos nuevos bajo `docs/requirements/` (sin conflictos posibles) y puede integrarse por *rebase* o *merge*.
- **Contraste:** 94 pares texto/fondo de las paletas (claro y oscuro) medidos contra WCAG 2.x con `prototype-tests/contrast.py`; al ampliar la lista aparecieron y se corrigieron defectos reales. El script solo conoce los pares listados: el CSS definitivo debe repetir la medición.
- **No se escribió en ninguna rama existente.** Todo está en `research/requirements-and-prototypes`.
- **Aspecto visual de la v2:** **no pude abrirla en un navegador**; lo verifico con pruebas de comportamiento (jsdom), contraste medido y, para el CV, **viendo el PDF renderizado**. **Su revisión visual es la verificación que falta** (envíe capturas de la v2).
- **Simulaciones:** las «entrevistas» son hipótesis; la IA de Huella está simulada; los datos son ficticios. Cada documento de investigación trae su **guía para hacerlo con personas reales**.
- **Valores a validar:** porcentajes de pago (60 % anticipo, 3 % fondo, 8 % gestión, 70 % grado B, 30 % adelanto), ventana de 8 h y tolerancias de reclamo (referencia de otro producto), tarifa de espera, reloj de frescura.
- **Admisibilidad, factura electrónica, datos personales, marco editorial** y **validez de cláusulas**: **verificar** con SFE/PROCOMER, contador y abogado.
- **ATS comerciales** no probados; solo la capa de texto del PDF y la lectura del Word.
- **Cifras de IA** (cuotas, modelos) cambian a diario: tabla editable.
- **v3 · revisión visual:** esta vez **sí** se abrieron Brisa y Balance en un navegador sin cabeza (escritorio y móvil, claro y oscuro) y se corrigieron un desborde móvil y un botón duplicado; **no** sustituye su revisión. La tipografía de Balance viene de Google Fonts: sin Internet se vio la del sistema, así que **su efecto real queda por revisar** (incluida la función de cifras tabulares).
- **v3 · fuentes sin verificar:** Masicampo y Baumeister (2011) y el artículo de Verhoeff (2004) **no se leyeron completos**; la URL que devolvió el buscador para Gollwitzer y Sheeran (2006) no coincidía con el título; la **Ley 8968** no se evaluó. Las comparativas de apps son comerciales (C) y sus cifras cambian.
- **v3 · alcance del prototipo de Balance:** datos en memoria, sin servidor, sin concurrencia (409), sin correo de invitación y con token de demostración (no criptográfico). **No** prueba SINPE Móvil.
- **v3 · pruebas de CV:** en el entorno de esta iteración no estaban `typst` ni `python-docx`, por lo que **no se volvieron a correr** las 4 suites de CV de Huella (ajenas a esta iteración). Las demás, sí: 398 comprobaciones, 215/215 pares de contraste.
- **v3 · una sola rama:** todo (Brisa, Balance, la política de pruebas por etapas y la investigación) vive en `research/requirements-and-prototypes`. La rama intermedia `research/brisa-balance-prototypes` se reunió aquí (9 commits, sin conflictos) y puede retirarse con autorización. `dev`, `main`, `refactor/*` y `docs/*` no se tocaron.
- **Seguridad:** el token de GitHub compartido en la conversación (otra vez en la v3) debe considerarse expuesto: **revóquelo**. Se usó solo en memoria del entorno y **no está en el repositorio** (verificado en archivos e historial).
