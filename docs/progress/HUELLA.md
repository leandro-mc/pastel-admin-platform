# Progreso — Huella

Estado actual (no es un diario: se reemplaza lo obsoleto). Última actualización: 2026-11-16.

## Estado
- **Rama:** `feat/huella-mvp` · PR #43 hacia `dev`. **No integrada**: el propietario la integra cuando confirme que funciona.
- **Hecho en la rama:** banco privado, estudio de CV (ofertas, evidencia, generación, versiones, edición validada, texto ATS), perfil público por enlace secreto, **PDF** con Typst (`Pastel.Documents`, CCR-2) e **IA** en tres caminos con el mismo prompt: automática con la clave y el modelo del propietario (Gemini, OpenAI o Anthropic; clave cifrada y nunca devuelta), prompt descargable (`.md`/`.txt`) para una IA externa e importación de su respuesta. Todo pasa por el guardián de verdad.
- **Mejoras de uso (2026-11-16):** banco con autoguardado, buscador y elementos colapsados, confirmación al quitar, fecha y hora en ofertas y versiones de CV, enlace público siempre visible y copiable (guardado cifrado) y vista previa real en pestaña nueva. Después: descarga del CV también en Word (.docx), iconos por enlace del perfil (predeterminado según el tipo, cambiable) y nivel inicial Junior.
- **Rediseño de IA y perfil (2026-11-16):** el banco es material en bruto; el CV lo redacta la IA desde el banco y la oferta en una sola solicitud, con idioma por generación (sin idioma global); el perfil público tiene contenido propio en español e inglés (secciones con máximo, editables en español, inglés reescrito por IA al guardar) y se genera sección por sección; toda acción de IA tiene ventana de progreso, alerta y prompt externo equivalente; la página pública va sin el marco de Pastel, con selector de idioma y tema, barra fija con nombre, titular y correo e índice fijo.
- **Crear CV e historial (2026-11-16):** Crear CV pasa a tres pestañas con barra de contexto (Ofertas, Generar, Documentos), buscadores, filtros y páginas de 5; las ofertas tienen estado de postulación, seguimiento y notas; los CV se marcan como enviados; nueva pantalla Historial (reemplaza «Postulaciones»). **Cartas de presentación** (reemplazan «Carta de recomendación»): se generan en Crear CV con IA desde el banco y la oferta (tres vías, prompt propio), se editan, descargan (PDF/Word) y se envían; entran al historial. La carta tiene forma de carta formal (remitente, fecha, destinatario, asunto, saludo, cuerpo con sangría y justificado, despedida, firma) en Times New Roman o Arial, compacta (fecha a la derecha, solo el país arriba y el correo y el teléfono, uno por renglón, al pie con la firma) y limitada a una página.
- En `dev` solo existe el esqueleto del módulo.

## Última validación (en la rama, 2026-11-15)
`test-backend.ps1` completo (Documents 2/2, Huella 8/8), `test-database.ps1` 58/58 (las 6 de Huella y la de IA, con las migraciones aplicadas), `has-pending-model-changes` sin cambios, `test-frontend.ps1` completo y recorrido real por nginx (CV, prompt, importación, PDF, clave sin filtrarse, llamada real a Gemini con clave falsa).

## Por verificar
- Presentación del CV (PDF y Word): cabecera de entrada que pasa el subtítulo completo al renglón siguiente cuando no cabe, tecnologías del proyecto limitadas a las principales en su propio renglón, formación sin detalle repetido y algo más de aire entre entradas; revisado con el CV de ejemplo en Typst y Word real, sin recorrer aún con el cupo de página lleno (el cupo LU subió un poco por entrada).
- Crear CV en pestañas, Historial y cartas: solo se compiló (`tsc`, `dotnet build`); se probó a mano la lectura de la respuesta de la IA de la carta, el Word (se abre con python-docx) y la plantilla Typst de la carta (compilada y vista). El formato de la carta se revisó en el Word (abierto con Word real) y en el PDF (Typst con Liberation Serif); el cupo de una página se midió con cartas llenadas hasta el máximo en Times y Arial, Letter y A4: siempre 1 página, con 2,6 a 5,6 renglones de holgura. Escritas y no ejecutadas: `HUELLA-E1-9`, `HUELLA-E1-10`, `LetterAiTests`. Falta recorrerlo en navegador y aplicar las migraciones `AddHuellaApplicationTracking` y `AddHuellaCoverLetters` (al arrancar la API).
- Rediseño de IA y perfil: solo se compiló (`tsc`, `dotnet build` de Huella y de las dos suites) y se probó a mano el armado de prompts y la lectura de respuestas con un banco de ejemplo. Escritas y no ejecutadas: `CvAiComposeTests`, `HUELLA-E1-8`, la prueba del perfil público bilingüe y la de la vista pública. Falta recorrerlo en navegador con una IA real (CV en uno y dos idiomas, perfil completo, edición con reescritura del inglés, barra fija e índice, idioma y tema, impresión). Aplicar la migración `AddHuellaPublicContent` (al arrancar la API) y publicar de nuevo: las publicaciones anteriores no traen las dos versiones y responden 404 hasta entonces.
- Las mejoras de uso del 2026-11-16 solo se compilaron (`tsc`, `dotnet build`); el propietario las probó a mano en el navegador (banco, enlace, vista previa). La prueba HUELLA-E1-6 y las nuevas (`CvDocxTests`, icono inválido en el perfil) están escritas y no se ejecutaron.
- El Word (.docx) se comprobó abriéndolo con Word real (sin avisos de reparación, 1 página); falta abrirlo en Google Docs. Un icono elegido en un enlace solo aparece en el perfil público tras volver a publicar.
- Respuestas reales de Gemini, OpenAI y Anthropic con claves válidas (lo hace el propietario en «Configurar IA»).
- Revisión visual en navegador (Etapa 2).

## Decisiones del propietario pendientes
- Tema de Huella en `module-themes.css`.
- Metadatos `og:*` del enlace público (nginx).
- Fuentes de la interfaz (CCR-2, punto 4).
- ¿Idiomas del CV solo ES/EN desde F1? ¿Varios «enfoques» visibles en el perfil público?
