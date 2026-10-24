# Decisiones importantes, hallazgos y funcionalidades nuevas

> Complementa los tres documentos de requerimientos. Aquí está **lo que se decidió y por qué**, **lo que usted no había pedido pero la investigación y la empatía con cada actor hicieron necesario**, y **lo que no se pudo verificar**.
> Método: para cada app se asumió sucesivamente el rol de *product owner*, de *persona usuaria experta* en cada actor (productor, gestor, comprador, reclutador, candidata, lectora…) y de *revisor adversarial* ("¿cómo falla esto en la vida real?"). Cada decisión cita su evidencia (ver [`research/FUENTES.md`](research/FUENTES.md)).

---

## 1. Decisiones transversales

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

## 7. Decisiones que necesitan su confirmación
1. Aprobar la **dirección visual** de cada app (reemplaza paletas del repo). 2. **CCR** para Typst + fuentes en la imagen del host y `Pastel.Documents`. 3. `Campaign → Season`. 4. ¿Huella solo Owner o invitados (F3)? 5. **Política de reclamos** (quién absorbe). 6. **Modelo de pago** a productores. 7. **Dominio de correo** para secuencias. 8. ¿Resumen semanal de Ágora en F1? 9. ¿Quién será el socio exportador candidato?

## 8. Limitaciones y cosas no verificadas (honestidad)
- **Repositorio:** el nombre indicado (`pastel-workspace`) no existe con ese nombre para el token; la rama `refactor/modular-foundation` está en **`leandro-mc/pastel-admin-platform`**, y se trabajó allí.
- **No se escribió en ninguna rama existente.** Todo está en `research/requirements-and-prototypes`.
- **Sincronización con la rama base:** el análisis partió de `a8c1c7d`. Mientras se trabajaba, `refactor/modular-foundation` avanzó (`3d3ca6e`, otra sesión: pruebas de QA y una aclaración de producto del propietario del 2026-10-23: *Cosecha la concede el Owner/Superuser; Huella es exclusiva del Owner; Ágora es obligatoria salvo decisión del Owner*). Es **coherente con lo propuesto aquí** (roles de Cosecha concedidos solo por el Owner; Huella solo Owner), por lo que no cambia ninguna conclusión. La rama de este levantamiento solo agrega archivos nuevos bajo `docs/requirements/`, sin conflictos posibles; puede integrarse por *rebase* o *merge*.
- **Contraste:** las paletas de los prototipos se midieron contra WCAG 2.x (66 pares, claro y oscuro, todos ≥ 4,5:1) con `prototype-tests/contrast.py`. Al ampliar la lista aparecieron y se corrigieron 3 defectos reales. El script solo conoce los pares listados: el CSS definitivo debe repetir la medición.
- **Admisibilidad** de rambután costarricense por país y obligaciones fiscales (factura electrónica), de datos personales y editoriales **no se verificaron**; quedan como "verificar".
- **Cifras de poscosecha** vienen de estudios de otros cultivares/regiones: calibrar con un técnico local.
- **ATS reales** (Workday, Greenhouse, etc.) **no se probaron**; sí se verificó la capa de texto del PDF con `pdftotext` y fuentes con ToUnicode.
- **Límites de CV:** verificados con compilador real, pero con *Liberation Sans* (más ancha que la fuente final) y relleno sintético; la garantía final en producción es el conteo de páginas del compilador.
- **Cuotas, precios y nombres de modelos de IA** cambian a diario y las fuentes difieren: la tabla es editable y debe revisarse.
- **Estudio de seguimiento visual** (7,4 s): muestra pequeña; se usó como heurística.
- **Prototipos:** no se pudieron abrir en un navegador real en este entorno; se verificó sintaxis y lógica en Node (p. ej. los cinco casos de reparto del plan de pruebas). Las fuentes se cargan desde Google Fonts, por lo que sin Internet verá tipografías de respaldo.
- **Contenido de ejemplo:** personas, productores, compradores y piezas de Ágora son **ficticios**.
- **Seguridad:** el token de GitHub compartido en la conversación debe considerarse expuesto: **revóquelo y genere otro**. Se usó solo en memoria del entorno y **no se escribió en el repositorio**.
