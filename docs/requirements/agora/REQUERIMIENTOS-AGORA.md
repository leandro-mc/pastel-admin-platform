# Ágora — Requerimientos v2 (levantamiento profundo)

> **Estado:** propuesta para validación del propietario · **Rama:** `research/requirements-and-prototypes` · **Fecha:** 2026-10-23
> **Prototipo:** [`prototype/`](prototype/index.html) — inicio, pieza, panel editorial (datos de **ejemplo**; contenido evergreen, sin afirmaciones sobre noticias reales)
> Amplía `docs/modules/AGORA.md`. Se conserva todo su núcleo de confianza (sello "Verificado", fuentes, tipo de contenido, correcciones, sin comentarios abiertos en el MVP).

---

## 0. Resumen ejecutivo

Ágora es la **entrada pública de Pastel** (visitas anónimas aterrizan aquí). Su promesa: *ayudar a comprender qué pasa, cómo funciona y por qué importa, sin cansar ni decirle a nadie qué pensar*. El MVP resolvió bien la **capa de confianza** (fuentes, verificación, correcciones). Le falta la **capa de comodidad**: que quien llegue —una señora de 58 años en Facebook o un joven de 21 en TikTok— sienta "esto lo sé usar" en 3 segundos, y vuelva.

**Idea rectora: andamiaje familiar, capa de contenido distinta.**

| Se toma de Facebook (familiaridad) | Se descarta a propósito (lo que asfixia) |
|---|---|
| Barra superior con búsqueda; navegación lateral; columna central; columna derecha | Scroll infinito |
| Tarjetas con autor/fecha/etiqueta, acciones debajo, guardar, compartir | Ranking algorítmico y "para ti" opaco |
| Fila de "historias" → aquí: **Series** | Reacciones de enojo/viral y contadores de vanidad |
| Compositor "¿Qué quiere explicar hoy?" para quien edita | Comentarios abiertos (requieren moderación: etapa "Comunidad") |
| Barra inferior de 5 pestañas en móvil | Reproducción automática, insignias rojas, anuncios |
| Modo oscuro y tamaño de texto | Notificaciones por defecto |

**Cinco decisiones centrales** (detalle en [`../DECISIONES-Y-HALLAZGOS.md`](../DECISIONES-Y-HALLAZGOS.md)):

1. **Inicio finito: "Hoy en 5 minutos"** con marca de fin **"Está al día"**. Un feed con final es la respuesta directa al agotamiento informativo.
2. **Contexto antes que opinión:** cada tarjeta lleva *Qué debe saber en 20 segundos*, tipo de contenido, estado de verificación y número de fuentes **visibles sin abrir la pieza**.
3. **WhatsApp primero para compartir:** es donde ya circula la información (y la desinformación). Tarjeta compartible con **sello y fuente incluidos**.
4. **Interacción sin hostilidad:** reacciones constructivas (*Me ayudó a entender · Quiero más fuentes · Guardar*), **preguntas al especialista** curadas y "Señalar un error", en lugar de comentarios abiertos.
5. **Respeto del ritmo:** *Modo calma* (oculta actualidad dura 24 h/7 días), resumen semanal opcional, cero insignias rojas.

---

## 1. Diagnóstico del MVP

**Se conserva:** roles (visitante, registrada, autor, revisor, administrador), sello con tres estados, fuentes por pieza, tipo (Hechos/Análisis/Opinión), correcciones visibles, video con fachada `youtube-nocookie`, noticias solo enlazadas con contexto propio, Markdown sanitizado, endpoints públicos con límite de tasa, SEO sin ejecutar JS.

| Brecha | Consecuencia |
|---|---|
| Pantallas descritas como listados/piezas, sin *experiencia de entrada* | Un visitante nuevo no sabe por dónde empezar ni cuánto "falta" |
| No hay estrategia de compartir | Se pierde el canal dominante (WhatsApp) y la confianza no viaja con el enlace |
| Sin formatos de comprensión (glosario, "se sabe / no se sabe", mini-comprobación) | Se publica contenido, pero no se garantiza que se *entienda* |
| Sin onboarding ni preferencias | Todo es igual para todos; sin "Modo calma" |
| Panel editorial técnico (Markdown + formulario) | Cuesta producir con calidad constante |
| Sin ruta de retroalimentación del lector | El error factual no tiene un canal ordenado |

---

## 2. Investigación aplicada (fuentes en [`../research/FUENTES.md`](../research/FUENTES.md))

| Hallazgo | Decisión |
|---|---|
| **Uso de plataformas en Costa Rica (CICOM-UCR, 2025, adultos con celular):** WhatsApp 96 %, **Facebook 80 %** (75 % de uso intenso), YouTube 77 %, TikTok 58 % (ya no es solo de jóvenes), Instagram 47 %, X 15 %, LinkedIn 11 %, Threads 8 %. El uso de Facebook decae tras los 55 años y con menor escolaridad, pero **WhatsApp/Facebook/YouTube se mantienen masivos** | Andamiaje de Facebook; compartir por WhatsApp; video por YouTube; **prototipar para móvil y para personas mayores** |
| Estudio UCR sobre noticias en redes: el consumo de noticias periodísticas en redes es bajo; interés mayor por sucesos y problemas sociales; **solo 36 %** dice poder reconocer noticias falsas; una parte reconoce haber compartido noticias que sabía falsas; la gente **prefiere compartir por WhatsApp antes que discutir en público** | Sin comentarios abiertos; **señal de verificación portable**; "Cómo sabemos esto" |
| **Reuters Institute, Digital News Report 2026 (48 mercados):** redes y video superan a TV y webs como vía principal; confianza global **37 %**, la más baja desde 2015; **evitación de noticias ~42 %**; 62 % preocupado por contenido falso; el público quiere noticias *más accesibles, comprensibles y relevantes*; funcionan explicadores, resúmenes y boletines; el video largo también funciona; Facebook repunta como vía de noticias | **Explicadores primero**; resumen de 20 s; inicio finito; Modo calma; no imitar herramientas de IA genéricas |
| Los patrones de interfaz de redes sociales más probados: columna central + barras laterales en escritorio; barra inferior en móvil | Se adoptan tal cual (familiaridad = menor esfuerzo) |
| Heurística de lectura en F: títulos y primera línea concentran la atención | Titular + resumen de 20 s + sello **arriba** de cada tarjeta |

---

## 3. Actores y empatía

| Actor | Quién es | Siente | Necesita | Ágora le da |
|---|---|---|---|---|
| **Lectora casual** (*doña Rosa*, 58) | Facebook y WhatsApp; lee en el celular, con letra grande | Cansancio y desconfianza; miedo a "no entender" o a que la engañen | Letra grande, orden, un lugar sin pelea | Inicio finito, tamaño de texto, sello comprensible, compartir por WhatsApp |
| **Joven** (*Diego*, 21) | TikTok/YouTube; lee poco texto largo | Aburrimiento ante "noticias de adultos" | Formato breve y claro; video | Explicadores cortos, videos, "Series", glosario |
| **Estudiante/docente** | Necesita citar | Desconfía de lo sin fuente | Fuentes, fecha, versión, corrección | Fuentes expandibles, historial de correcciones, citar |
| **Persona escéptica** | Evita medios | Cinismo | Ver *cómo* se sabe algo | "Cómo sabemos esto", verificación visible, separación hechos/opinión |
| **Autor/editor** (propietario y colaboradores) | Escribe y publica | Presión por producir con calidad constante | Plantilla guiada y lista de control | Compositor guiado; checklist de publicación |
| **Revisor especialista** | Voluntario, poco tiempo | Miedo a que lo cite mal | Proceso liviano y alcance claro | Cola corta, alcance de verificación por escrito, versión revisada |
| **Administrador** | Soporte de plataforma | — | Auditoría | Registro de publicar/verificar/retirar |

---

## 4. Principios

1. **Familiar:** si ya sabe usar Facebook, sabe usar Ágora. 2. **Finito:** siempre se ve el final. 3. **Contexto antes que reacción.** 4. **Confianza visible:** nada de "confíe en nosotros"; se *muestra* cómo. 5. **Sin hostilidad por diseño.** 6. **Accesible de verdad:** tamaño de texto, contraste, 320 px, teclado, lectura en voz alta (F2). 7. **Respetuoso del tiempo:** tiempo de lectura estimado en cada tarjeta. 8. **Sin trackers de terceros.**

---

## 5. Experiencia (pantallas)

### 5.1 Estructura (escritorio / móvil)
- **Escritorio (≥ 1100 px):** barra superior (marca, búsqueda, atajos, tema, cuenta) · columna izquierda (Inicio, Explorar, Actualidad, Videos, Guardados, Series) · **centro (feed, 600–680 px)** · columna derecha (*Actualidad enlazada*, *Pregunte al especialista*, *Glosario del día*).
- **Móvil:** barra superior mínima + **pestañas inferiores**: Inicio · Explorar · Actualidad · Guardados · Cuenta. Compositor solo para editores.

### 5.2 Inicio — "Hoy en 5 minutos"
1. Banner de bienvenida **solo la primera vez** (cerrable): "¿Qué le interesa?" (chips; se guarda en el navegador; sin cuenta).
2. **Fila de Series** (círculos como "historias").
3. **Bloque "Hoy en 5 minutos"**: de 3 a 5 piezas elegidas por el equipo editorial, con tiempo de lectura total.
4. Tarjetas cronológicas por tema seguido.
5. **Marca de fin: "Está al día. Vuelva mañana o active el resumen semanal."**
Sin ranking algorítmico: **orden = decisión editorial + fecha**.

### 5.3 Tarjeta de pieza
Autor y rol · fecha y **tiempo de lectura** · **chip de tipo** (Hechos documentados · Análisis · Opinión) · titular · **"En 20 segundos"** (≤ 280 caracteres) · imagen/video (fachada) · **sello** (Verificado por X el …/Pendiente de verificación/Modificada tras la verificación + icono + texto) · **Fuentes (n)** expandible · acciones: *Me ayudó a entender · Quiero más fuentes · Guardar · WhatsApp*.

### 5.4 Pieza
Titular y resumen de 20 s · **Se sabe / No se sabe / Por qué importa** (bloques fijos) · cuerpo · **términos del glosario subrayados** (toque = definición) · video · **Fuentes** con tipo y nota de contexto · **"Cómo sabemos esto"** (alcance de la verificación) · **Correcciones** con fecha · **"¿Qué entendí?"** (2–3 preguntas, solo en el navegador, sin puntaje almacenado) · **Pregunte al especialista** · **Señalar un error** · compartir (tarjeta de WhatsApp).

### 5.5 Otras
**Explorar** (categorías, series, etiquetas, búsqueda por título) · **Actualidad** (noticias enlazadas con contexto propio, nunca copia) · **Videos** · **Guardados** · **Cuenta/preferencias** (tema, tamaño de texto, Modo calma, resumen semanal) · **Estándares editoriales** y **Quiénes verifican** (perfiles de revisores con credenciales).

### 5.6 Editorial
Compositor guiado (campos y límites en §7), vista previa idéntica a la pública, **lista de control de publicación**, cola de revisión (solo piezas sin verificar o modificadas), gestión de series, glosario, enlaces de actualidad y bandeja de "errores señalados" y "preguntas".

---

## 6. Requerimientos funcionales

| ID | Requerimiento | Prio | Criterio de aceptación |
|---|---|---|---|
| AG-INI-01 | Inicio finito "Hoy en 5 minutos" con marca "Está al día" | M | Sin scroll infinito; la marca siempre aparece |
| AG-INI-02 | Series (fila tipo historias) y seguir temas | M | Seguir/dejar de seguir sin cuenta (local) y con cuenta (servidor) |
| AG-TAR-01 | Tarjeta con resumen 20 s, tipo, sello, fuentes (n), tiempo de lectura | M | Sello con icono + texto (no solo color) |
| AG-PIE-01 | Bloques "Se sabe / No se sabe / Por qué importa" | M | Campos obligatorios para tipo *Hechos* |
| AG-PIE-02 | Glosario en línea | S | Definición accesible con teclado |
| AG-PIE-03 | Mini-comprobación "¿Qué entendí?" | S | Sin guardar puntajes ni identidad |
| AG-CON-01 | **Tarjeta para WhatsApp**: enlace con vista previa (`og:*`) + imagen con sello y titular | M | El sello viaja en la vista previa |
| AG-CON-02 | Reacciones constructivas y guardar | M | Sin contadores públicos de vanidad (solo propios) |
| AG-CON-03 | Pregunte al especialista (curado) | S | Solo se publica lo que el editor aprueba |
| AG-CON-04 | Señalar un error / fuente faltante | M | Llega a la bandeja editorial; acuse al lector |
| AG-CAL-01 | **Modo calma** y resumen semanal opcional (correo) | S | Oculta actualidad 24 h/7 días; sin notificaciones por defecto |
| AG-ACC-01 | Tamaño de texto A / A+ / A++ y modo lectura | M | Hasta 200 % sin romper el diseño |
| AG-ACC-02 | Lectura en voz alta (síntesis del navegador) | C | F2 |
| AG-VER-01 | Sello y flujo de revisión del MVP | M | Autor no puede verificar lo propio |
| AG-EDI-01 | Compositor guiado + lista de control de publicación | M | No se marca "Listo" sin ≥ 2 fuentes, tipo y resumen |
| AG-EDI-02 | Panel de autor con métricas útiles (lecturas completas, guardados, "me ayudó", compartidos) | S | Sin métricas de vanidad |
| AG-SEO-01 | `title`/`description`/`og:*` y JSON-LD `Article` en la respuesta inicial | M | Mismo método que Huella (ADR conjunto) |
| AG-FUT-01 | Línea de tiempo del tema, comparar fuentes, notas privadas, audio | C | F2 |
| AG-COM-01 | Comentarios moderados | W | Etapa "Comunidad" |

*(M = imprescindible, S = deseable, C = posible, W = no ahora)*

---

## 7. Compositor y reglas editoriales

| Campo | Límite | Regla |
|---|---|---|
| Titular | 90 | Informativo; sin gancho engañoso |
| **En 20 segundos** | 280 | Obligatorio |
| Tipo | — | Hechos documentados / Análisis / Opinión |
| Se sabe | 600 | Cada afirmación factual cita una fuente numerada |
| No se sabe | 400 | Obligatorio en *Hechos* y *Análisis* |
| Por qué importa | 400 | |
| Cuerpo (Markdown sanitizado) | — | Sin HTML crudo |
| Fuentes | ≥ 2 para "Listo" | Título, autor/entidad, fecha, URL, tipo y nota |
| Imagen | alt obligatorio | |
| Glosario | términos enlazados | |
| Mini-comprobación | 0–3 preguntas | |

**Lista de control de publicación:** ≥ 2 fuentes · tipo definido · resumen ≤ 280 · alt en imágenes · sin texto copiado de otros · términos difíciles enlazados al glosario. **El sello lo otorga solo un revisor** (regla del MVP).

---

## 8. Modelo de datos (delta)
`Topic` (tema/hilo), `GlossaryTerm`, `QuizQuestion`, `ExpertQuestion {estado: recibida/publicada/descartada}`, `ErrorReport {pieza, texto, estado}`, `Reaction {pieza, usuario, tipo}` (tipos limitados), `ReaderPreference` (servidor; el anónimo guarda en el navegador), `DigestSubscription` (correo, consentimiento), `ReviewerProfile` (credenciales visibles), `ShareCard` (metadatos de la imagen para WhatsApp). Imagen compartible generada con el mismo motor de documentos (PNG desde Typst) para no añadir un servidor de imágenes.

## 9. No funcionales
**Rendimiento:** LCP < 2,5 s en 4G con teléfono de gama media; JS inicial acotado; imágenes con dimensiones y `loading="lazy"`; fachada de video. **Accesibilidad:** WCAG 2.2 AA; contraste verificado; teclado; 320 px; texto "Muy grande"; el sello no depende del color. **SEO/compartir:** sin ejecutar JS. **Privacidad:** sin trackers de terceros; YouTube `nocookie`; correo solo con consentimiento. **Seguridad:** sanitización estricta; límites de tasa; CSP (requiere CCR para `frame-src`/imágenes).

## 10. Riesgos
| Riesgo | Mitigación |
|---|---|
| Percepción de sesgo | Separar hechos/análisis/opinión; fuentes y verificación visibles; estándares publicados |
| Difamación o error factual | Revisión, correcciones públicas y canal "Señalar un error"; **revisión legal del marco de responsabilidad editorial** *(verificar)* |
| Derechos de autor | Solo enlazar noticias; citas breves; imágenes con licencia |
| Escasez de revisores | Cola corta, alcance acotado; el sello no es obligatorio para publicar (MVP) |
| Spam en preguntas | Sesión obligatoria, 280 caracteres, curado |
| Apariencia genérica | Dirección visual propia (§11) |

## 11. Dirección visual (propuesta)
- **Familiaridad sin copia:** fondo gris azulado suave, tarjetas blancas, azul "plaza" de marca; **verde** = verificado, **ámbar** = pendiente, **verde azulado** = corregida (siempre con icono y texto). Sin morado.
- **Tipografía:** *Source Sans 3* para interfaz; *Source Serif 4* para titulares de pieza (identidad editorial).
- **Marca:** columna/pórtico simple (la plaza pública), sin símbolos de "IA mágica".
- **Movimiento:** mínimo; respeta `prefers-reduced-motion`.
- El repositorio asignaba un azul grisáceo; aquí se amplía por autorización expresa para conseguir contraste y calidez.

## 12. Métricas
Lectura completa por pieza · "Me ayudó a entender" por 100 lecturas · guardados · compartidos por WhatsApp · retorno semanal · % de piezas con verificación vigente · tiempo de respuesta a errores señalados · tasa de abandono en el onboarding. **No** se optimiza tiempo en pantalla.

## 13. Qué demuestra el prototipo
Inicio finito con "Está al día", fila de Series, tarjetas con sello/fuentes/tiempo de lectura, pieza con *Se sabe/No se sabe*, glosario en línea, mini-comprobación, compartir por WhatsApp, tamaño de texto, tema claro/oscuro, Modo calma, y compositor guiado con lista de control. **No** hay servidor: las acciones se guardan en el navegador.

## 14. Preguntas abiertas
1. ¿Voz del texto de interfaz: *usted* (por defecto) o voseo (permitido si lo solicita)? 2. ¿Resumen semanal por correo desde F1? 3. ¿Cuántos revisores se espera tener al inicio? 4. ¿Se publica una política de correcciones antes del lanzamiento? 5. ¿Se aprueba el cambio de paleta frente al azul grisáceo del repositorio?
