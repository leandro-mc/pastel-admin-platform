/** Textos de Ágora. Voz de la interfaz: trato de usted (AG-TXT-01); el voseo solo si el propietario lo pide. */
export const strings = {
  name: "Ágora",
  tagline: "Divulgación humanística y de actualidad",

  nav: {
    home: "Inicio",
    explore: "Explorar",
    news: "Actualidad",
    saved: "Guardados",
    standards: "Estándares editoriales",
    editorial: "Panel editorial",
  },

  common: {
    loading: "Cargando…",
    retry: "Intentar de nuevo",
    errorTitle: "No pudimos cargar esta sección",
    errorFallback: "Ocurrió un problema. Intente de nuevo en un momento.",
    back: "Volver",
    previous: "Anterior",
    next: "Siguiente",
    pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
    pieces: (count: number) => (count === 1 ? "1 pieza" : `${count} piezas`),
    readingMinutes: (minutes: number) => `${minutes} min de lectura`,
    by: (name: string) => `Por ${name}`,
    published: (date: string) => `Publicada el ${date}`,
    updated: (date: string) => `Actualizada el ${date}`,
    signIn: "Iniciar sesión",
    noPermission:
      "Su cuenta todavía no tiene habilitada esta acción. Pida acceso al equipo de Ágora.",
  },

  home: {
    eyebrow: "Hoy en 5 minutos",
    title: "Lo esencial de hoy, sin prisa",
    description:
      "Las piezas que el equipo editorial eligió para hoy. Cada una dice qué se sabe, qué no se sabe y por qué importa.",
    totalTime: (minutes: number) =>
      `Lectura total aproximada: ${minutes} min.`,
    noPicksTitle: "Todavía no hay piezas elegidas para hoy",
    noPicksDescription:
      "El equipo editorial aún no eligió las piezas de hoy. Mientras tanto, puede ver lo más reciente.",
    forYouTitle: "De los temas que usted sigue",
    recentTitle: "Más recientes",
    emptyTitle: "Ágora todavía no tiene piezas publicadas",
    emptyDescription: "Cuando se publique la primera, aparecerá aquí.",
    endTitle: "Está al día",
    endDescription:
      "Eso es todo por ahora. Aquí no hay nada más que desplazar: vuelva mañana o explore por tema.",
    exploreCta: "Explorar por tema",
    topicsTitle: "Temas",
    seriesTitle: "Series",
    newsTitle: "Actualidad",
    newsAll: "Ver toda la actualidad",
  },

  calm: {
    label: "Modo calma",
    hint: "Oculta la actualidad y deja solo lo esencial.",
    on: "Modo calma activado",
    off: "Modo calma desactivado",
  },

  seal: {
    verified: "Verificado",
    verifiedBy: (names: string) => `Verificado por ${names}`,
    pending: "Pendiente de verificación",
    modified: "Modificada tras la verificación",
    progress: (current: number, required: number) =>
      `${current} de ${required} verificaciones necesarias`,
    explainVerified:
      "Una persona revisora distinta de quien escribió la pieza comprobó lo que indica el alcance de la verificación.",
    explainPending:
      "Todavía no la revisó otra persona. Lea las fuentes y forme su propio criterio.",
    explainModified:
      "El contenido cambió después de la última verificación. La pieza volvió a la cola de revisión.",
    verifiedOn: (date: string) => `el ${date}`,
  },

  contentType: {
    facts: "Hechos",
    analysis: "Análisis",
    opinion: "Opinión",
    factsHint: "Información comprobable, con sus fuentes.",
    analysisHint: "Interpretación de hechos, con sus supuestos a la vista.",
    opinionHint: "Punto de vista de quien escribe; no es un hecho.",
  },

  article: {
    notFoundTitle: "No encontramos esa pieza",
    notFoundDescription:
      "Puede que se haya despublicado o que el enlace esté incompleto.",
    summary: "En 20 segundos",
    known: "Lo que se sabe",
    unknown: "Lo que no se sabe",
    why: "Por qué importa",
    video: "Video",
    body: "Lectura completa",
    sources: "Fuentes",
    sourcesMissing: "Esta pieza no lista fuentes.",
    openSource: "Abrir fuente",
    sourceKinds: {
      official: "Fuente oficial",
      press: "Prensa",
      academic: "Académica",
      document: "Documento",
      other: "Otra",
    },
    howWeKnow: "Cómo sabemos esto",
    scope: "Alcance de la verificación",
    note: "Nota de la persona revisora",
    verificationBy: (name: string, date: string) =>
      `${name}, el ${date}`,
    corrections: "Correcciones",
    correctedOn: (date: string) => `Corregida el ${date}`,
    seriesPart: (name: string, order: number | null) =>
      order === null ? `Serie: ${name}` : `Serie: ${name} · parte ${order}`,
    standardsLink: "Cómo trabajamos y cómo corregimos",
    save: "Guardar",
    saved: "Guardada",
    unsave: "Quitar de guardados",
    helped: "Me ayudó",
    moreSources: "Faltan fuentes",
    share: "Compartir por WhatsApp",
    copyLink: "Copiar enlace",
    linkCopied: "Enlace copiado",
    linkCopyFailed: "No se pudo copiar. Copie la dirección desde el navegador.",
    follow: (topic: string) => `Seguir ${topic}`,
    following: (topic: string) => `Siguiendo ${topic}`,
    reportError: "Señalar un error",
    reportTitle: "Señalar un error en esta pieza",
    reportHint:
      "Cuéntenos qué dato o enunciado parece incorrecto y por qué. Lo revisa el equipo editorial.",
    reportField: "¿Qué error encontró?",
    reportSend: "Enviar aviso",
    reportSending: "Enviando…",
    reportThanks: "Gracias. El equipo editorial revisará el aviso.",
    reportLength: (min: number, max: number) =>
      `Cuéntenos el error en ${min} a ${max} caracteres.`,
    loginToAct:
      "Inicie sesión para guardar piezas, reaccionar o señalar errores.",
    actionDone: "Listo.",
    actionFailed: "No se pudo completar la acción.",
  },

  video: {
    play: (title: string) => `Reproducir video: ${title}`,
    privacy:
      "Al reproducirlo se carga YouTube en modo de privacidad mejorada.",
    openOnYouTube: "Ver en YouTube",
  },

  explore: {
    title: "Explorar",
    description: "Encuentre piezas por tema, serie o etiqueta.",
    search: "Buscar por título o etiqueta",
    searchPlaceholder: "Por ejemplo: abolición del ejército",
    topics: "Temas",
    series: "Series",
    tags: "Etiquetas",
    all: "Todo",
    clear: "Quitar filtros",
    empty: "No encontramos piezas con esos filtros.",
    emptyHint: "Pruebe con otra palabra o quite algún filtro.",
    resultsFor: (count: number) =>
      count === 1 ? "1 pieza encontrada" : `${count} piezas encontradas`,
  },

  news: {
    title: "Actualidad",
    description:
      "Enlaces a noticias de otros medios, con el contexto de Ágora. No copiamos su texto: lea la nota en su fuente.",
    featured: "Destacada",
    readAt: (outlet: string) => `Leer en ${outlet}`,
    empty: "Todavía no hay enlaces de actualidad.",
    topicLabel: "Tema",
    allTopics: "Todos los temas",
    calmTitle: "La actualidad está oculta",
    calmDescription:
      "Tiene activado el modo calma. Puede desactivarlo cuando quiera.",
  },

  saved: {
    title: "Guardados",
    description: "Las piezas que usted guardó para leer con calma.",
    emptyTitle: "Todavía no guardó piezas",
    emptyDescription:
      "Use «Guardar» en cualquier pieza y la encontrará aquí.",
    loginTitle: "Inicie sesión para ver sus guardados",
    loginDescription:
      "Sus piezas guardadas se asocian a su cuenta. Lo público se puede leer sin iniciar sesión.",
  },

  standards: {
    title: "Estándares editoriales",
    description:
      "Cómo se muestra la confianza en Ágora: fuentes, estado de verificación y correcciones.",
    provisional:
      "Este texto describe cómo funciona la plataforma. La política editorial completa la redacta y aprueba el propietario de Ágora antes del lanzamiento.",
    sealTitle: "Qué significa el sello",
    sealIntro:
      "Cada pieza muestra, con texto y con ícono, uno de tres estados:",
    correctionsTitle: "Cómo se muestran las correcciones",
    correctionsBody:
      "Una corrección aparece en la propia pieza con su fecha. Si cambia el contenido de una pieza verificada, la pieza pasa a «Modificada tras la verificación» y vuelve a la cola de revisión; el sello no se conserva sin una nueva revisión.",
    reportTitle: "Cómo señalar un error",
    reportBody:
      "Cada pieza tiene un botón «Señalar un error». Necesita una cuenta con sesión iniciada. El aviso llega al equipo editorial, que lo atiende y, si corresponde, corrige la pieza.",
    typesTitle: "Tipos de contenido",
    typesIntro: "Toda pieza dice qué es, para no confundir hechos con opinión:",
    separationTitle: "Separación de funciones",
    separationBody:
      "Quien escribe o edita una pieza no puede verificarla. La verificación la hace otra persona revisora, que además escribe qué revisó.",
  },
} as const;
