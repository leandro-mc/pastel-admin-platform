/** Textos de Huella (español). Los textos de la página pública viven aquí también: no hay otros idiomas en el MVP. */
export const strings = {
  name: "Huella",
  tagline: "Su perfil profesional en un enlace",
  nav: {
    bank: "Banco",
    studio: "CV y carta",
    profile: "Perfil público",
    ai: "Configurar IA",
    history: "Historial",
    soon: "En preparación",
    interview: "Entrevistas",
  },
  common: {
    pager: {
      label: "Paginación",
      prev: "Anterior",
      next: "Siguiente",
      range: (from: number, to: number, total: number) =>
        `Mostrando ${from}–${to} de ${total}`,
      page: (page: number, pages: number) => `página ${page} de ${pages}`,
    },
    save: "Guardar",
    saving: "Guardando…",
    saved: "Cambios guardados.",
    add: "Agregar",
    remove: "Quitar",
    cancel: "Cancelar",
    delete: "Eliminar",
    copy: "Copiar",
    copied: "Copiado",
    loading: "Cargando…",
    loadFailed: "No pudimos cargar esta información.",
    retry: "Reintentar",
    visible: "Visible en el perfil",
    yes: "Sí",
    none: "Sin dato",
  },
  list: {
    search: "Buscar",
    noResults: "Nada coincide con su búsqueda.",
  },
  autosave: {
    saving: "Guardando…",
    saved: "Guardado",
    incomplete: (missing: string) =>
      `Se guardará solo cuando complete ${missing}.`,
  },
  confirm: {
    removeTitle: (what: string) => `¿Quitar ${what}?`,
    removeMessage: (name: string) =>
      `«${name}» se borra y no se puede deshacer.`,
    what: {
      experience: "esta experiencia",
      project: "este proyecto",
      skill: "esta habilidad",
      education: "este estudio",
      certification: "esta certificación",
      language: "este idioma",
      competency: "esta competencia",
      achievement: "este logro",
      link: "este enlace",
    },
  },
  bank: {
    title: "Banco de información",
    description:
      "Cuente todo lo que ha hecho, con sus palabras y sin cuidar el formato ni el largo: es material en bruto, no texto para publicar. La IA lo lee completo para redactar cada CV y su perfil público; nada se copia tal cual y nada se publica sin que usted lo elija.",
    tabs: {
      notes: "Mi historia",
      experiences: "Experiencia",
      projects: "Proyectos",
      skills: "Habilidades",
      competencies: "Competencias",
      education: "Educación",
      certifications: "Certificaciones",
      languages: "Idiomas",
    },
    notes: {
      title: "Notas privadas",
      description:
        "Solo usted las ve. Su historia y su voz se envían a la IA (con el resto del banco) para redactar con su estilo; no salen al perfil público tal cual.",
      story: "Su historia en sus palabras",
      voice: "Cómo escribe (voz)",
      residence: "Residencia",
      workMode: "Modalidad que busca",
      availability: "Disponibilidad",
      workAuthorization: "Permiso de trabajo o ciudadanía",
      salaryExpectation: "Expectativa salarial",
      avoid: "Qué prefiere evitar",
      language: "Idioma del CV",
      paper: "Papel del CV",
      banned: "Frases que no quiere en su CV (separadas por comas)",
    },
    experience: {
      title: "Experiencia laboral",
      empty: "Aún no agregó experiencias.",
      add: "Agregar experiencia",
      role: "Cargo",
      marketRole: "Cargo en el mercado (opcional)",
      marketRoleHint: "Cómo se llama ese cargo fuera de su empresa.",
      company: "Empresa",
      location: "Ciudad, país",
      employmentType: "Tipo de empleo",
      workMode: "Modalidad",
      start: "Inicio",
      end: "Fin (vacío si es su cargo actual)",
      narrative: "Cuente qué hizo, sin filtro",
      narrativeHint:
        "Escriba en prosa: qué hacía, con qué y qué cambió. De este relato salen los logros.",
      companyContext: "Contexto de la empresa (opcional)",
      teamSize: "Personas en el equipo",
      search: "Buscar en experiencia",
      readyHint: "el cargo, la empresa y el mes de inicio",
    },
    project: {
      title: "Proyectos",
      empty: "Aún no agregó proyectos.",
      add: "Agregar proyecto",
      name: "Nombre",
      url: "Enlace (https)",
      summary: "Qué es",
      approach: "Cómo lo resolvió",
      stack: "Tecnologías",
      startYear: "Año de inicio",
      endYear: "Año de fin",
      search: "Buscar en proyectos",
      readyHint: "el nombre",
    },
    skill: {
      title: "Habilidades",
      empty: "Aún no agregó habilidades.",
      add: "Agregar habilidad",
      name: "Habilidad",
      aliases: "También se escribe (separado por comas)",
      category: "Categoría",
      firstUsedYear: "Primer año de uso",
      lastUsedYear: "Último año de uso",
      why: "Dónde la usó",
      evidence: (n: number) =>
        n === 0
          ? "Sin logros que la respalden"
          : `${n} logro${n === 1 ? "" : "s"}`,
      noEvidence: "Sin respaldo",
      search: "Buscar en habilidades",
      readyHint: "el nombre",
    },
    competency: {
      title: "Competencias",
      description:
        "Catálogo de competencias personales y técnicas que de verdad tiene. El «CV competencias» (formato que piden las agencias de empleo) elige de aquí; la IA nunca inventa una que no esté en esta lista.",
      empty: "Aún no agregó competencias.",
      add: "Agregar competencia",
      name: "Competencia",
      kind: "Tipo",
      kinds: { personal: "Personal", technical: "Técnica" },
      description_: "Qué significa en el trabajo",
      evidence: "Cómo la demuestra (con hechos de su banco)",
      search: "Buscar en competencias",
      readyHint: "el nombre",
    },
    education: {
      title: "Educación",
      empty: "Aún no agregó estudios.",
      add: "Agregar estudio",
      degree: "Título",
      institution: "Institución",
      startYear: "Año de inicio",
      endYear: "Año de fin",
      note: "Nota (opcional)",
      search: "Buscar en educación",
      readyHint: "el título y la institución",
    },
    certification: {
      title: "Certificaciones",
      empty: "Aún no agregó certificaciones.",
      add: "Agregar certificación",
      name: "Nombre",
      issuer: "Emisor",
      issuedYear: "Año",
      expiresYear: "Vence",
      url: "Enlace de la credencial (https)",
      search: "Buscar en certificaciones",
      readyHint: "el nombre",
    },
    language: {
      title: "Idiomas",
      empty: "Aún no agregó idiomas.",
      add: "Agregar idioma",
      language: "Idioma",
      level: "Nivel",
      evidence: "Evidencia (certificado, años de uso…)",
      search: "Buscar en idiomas",
      readyHint: "el idioma",
    },
    achievements: {
      title: "Logros",
      count: (n: number) => `Logros (${n})`,
      newAchievement: "Logro nuevo",
      readyHint: "las dos versiones del texto",
      impactType: "Tipo de impacto",
      description:
        "Cada logro es una cosa que usted hizo, con su resultado. De aquí salen las viñetas del CV y las líneas del perfil.",
      empty: "Sin logros todavía. Derívelos del relato o escríbalos.",
      derive: "Derivar del relato",
      deriving: "Derivando…",
      addManual: "Escribir un logro",
      shortText: "Versión corta (una línea)",
      longText: "Versión completa (hasta dos líneas)",
      resultValue: "Cifra",
      resultUnit: "Unidad",
      strength: "Fuerza (1 a 5)",
      visibility: "Dónde se muestra",
      verified: "Verifiqué esta cifra",
      skills: "Habilidades que demuestra",
      skillSearch: "Buscar una habilidad para agregar",
      addSkill: (name: string) => `Agregar ${name}`,
      removeSkill: "Quitar habilidad",
      noSkills: "Ninguna agregada todavía.",
      noSkillMatches: "Ninguna habilidad de su banco coincide.",
      bankHasNoSkills:
        "Primero agregue habilidades en la pestaña Habilidades del banco.",
      proposals: "Propuestas",
      accept: "Agregar al banco",
      needsFigure: "Sin cifra: agréguela si la tiene.",
      rejected: "Rechazadas",
      noProposals:
        "No encontramos logros en el relato. Revise que tenga frases con verbo de acción.",
      ai: {
        title: "Proponer logros con IA",
        description:
          "Use su proveedor configurado o una IA externa. Las propuestas se validan antes de mostrarse (no pueden agregar cifras que no estén en su relato) y usted decide cuáles acepta.",
        invalid: "No pudimos leer esa respuesta como JSON.",
      },
      visibilityOptions: {
        both: "CV y perfil público",
        cv: "Solo CV",
        public: "Solo perfil público",
        never: "En ninguno",
      },
      impact: {
        performance: "Rendimiento",
        quality: "Calidad",
        revenue: "Ingresos",
        cost: "Costos",
        scale: "Escala",
        leadership: "Liderazgo",
        delivery: "Entrega",
        other: "Otro",
      },
    },
    employmentTypes: {
      full_time: "Tiempo completo",
      part_time: "Medio tiempo",
      contract: "Por contrato",
      freelance: "Independiente",
      internship: "Práctica",
      volunteer: "Voluntariado",
    },
    workModes: {
      remote: "Remoto",
      hybrid: "Híbrido",
      onsite: "Presencial",
    },
    languages: { es: "Español", en: "Inglés" },
    papers: { letter: "Carta (Letter)", a4: "A4" },
    levels: ["Nativo", "C2", "C1", "B2", "B1", "A2", "A1"],
  },
  studio: {
    status: {
      saved: "Sin postular",
      applied: "Postulada",
      interview: "En entrevistas",
      offer: "Oferta recibida",
      rejected: "Rechazada",
      no_response: "Sin respuesta",
      discarded: "Descartada",
    },
    tabs: {
      label: "Secciones de Crear CV y carta",
      offers: "Ofertas",
      generate: "Generar",
      documents: "Documentos",
    },
    context: {
      none: "Sin oferta seleccionada",
      noneHint:
        "Elija una oferta para generar a su medida o escriba un enfoque para un CV general.",
      working: "Trabajando con",
      change: "Cambiar oferta",
      clear: "Quitar selección",
      pick: "Elegir oferta",
      docs: (n: number, sent: number) =>
        n === 0
          ? "Sin documentos todavía"
          : `${n} documento${n === 1 ? "" : "s"}${sent > 0 ? ` · ${sent} enviado${sent === 1 ? "" : "s"}` : " · ninguno enviado"}`,
      history: "Ver en el historial",
    },
    offers: {
      new: "Nueva oferta",
      newDescription:
        "Pegue el texto completo de la oferta. Se analiza contra su banco y queda guardada en su historial.",
      searchLabel: "Buscar oferta",
      searchPlaceholder: "Buscar por puesto o empresa",
      sort: "Ordenar por",
      sorts: {
        recent: "Más recientes",
        old: "Más antiguas",
        name: "Nombre (A-Z)",
        match: "Mayor coincidencia",
      },
      statusFilter: "Estado",
      statusFilters: {
        all: "Todos los estados",
        saved: "Sin postular",
        applied: "Postuladas",
        interview: "En entrevistas",
        offer: "Con oferta",
        closed: "Cerradas",
      },
      use: "Usar para generar",
      selected: "Seleccionada",
      documents: "Ver documentos",
      savedOn: "Guardada el",
      coverage: (covered: number, total: number) =>
        `${covered} de ${total} requisitos`,
      coverageTitle:
        "Requisitos obligatorios de la oferta que su banco respalda hoy.",
      docCount: (n: number, sent: number) =>
        n === 0
          ? "Sin documentos"
          : `${n} documento${n === 1 ? "" : "s"}${sent > 0 ? ` · ${sent} enviado${sent === 1 ? "" : "s"}` : ""}`,
      none: "Aún no guardó ofertas. Use «Nueva oferta» para empezar.",
      noMatch: "Ninguna oferta coincide con la búsqueda o el filtro.",
      followUp: (label: string) => `Seguimiento ${label}`,
    },
    letter: {
      title: "Carta de presentación",
      description:
        "La IA lee la oferta y su banco, elige las evidencias que responden a lo que piden y escribe una carta de una página, sin repetir el CV. Se escribe siempre para una oferta.",
      tone: "Tono",
      tones: { formal: "Formal", cercano: "Cercano" },
      language: "Idioma de la carta",
      languageHint:
        "Se escribe completa en el idioma que elija, aunque su banco o la oferta estén en otro. Con «ambos» se crea una carta por idioma.",
      needOffer:
        "La carta se escribe para una oferta concreta: elíjala en la pestaña Ofertas.",
      aiTitle: (n: number) =>
        n === 1 ? "Redactando su carta" : "Redactando su carta en español e inglés",
      run: (label: string, model: string) =>
        `Redactar la carta con ${label} (${model})`,
      externalHint:
        "1. Descargue las instrucciones: llevan la oferta, su banco y las reglas de la carta. Péguelas completas en la IA que prefiera; con una sola respuesta tendrá la carta en el idioma o idiomas elegidos.",
      editor: {
        tabs: {
          label: "Secciones de la carta",
          content: "Contenido",
          send: "Enviar y descargar",
          redo: "Volver a redactar",
        },
        title: "Texto de la carta",
        description:
          "Carta formal compacta: arriba su nombre con la fecha a la derecha y su país; después destinatario, asunto, saludo, cuerpo con sangría y texto justificado y despedida; al pie, bajo su nombre, el correo y el teléfono, uno por renglón. Su nombre y datos salen del banco; lo que escriba no puede traer cifras que su banco o la oferta no tengan.",
        sender: "Remitente (del banco)",
        font: "Tipo de letra",
        fonts: { times: "Times New Roman", arial: "Arial" },
        date: "Fecha de la carta",
        today: "Usar la de hoy",
        recipient: "Destinatario",
        recipientHint:
          "Una línea por renglón (por ejemplo «Equipo de selección» y la empresa). Déjelo vacío para omitirlo.",
        subject: "Asunto del correo",
        greeting: "Saludo",
        paragraph: (n: number) => `Párrafo ${n}`,
        closing: "Despedida",
        addParagraph: "Agregar párrafo",
        counter: (n: number, max: number) => `${n} de ${max} caracteres`,
        total: (n: number, max: number) =>
          `${n} de unos ${max} caracteres entre todos los párrafos`,
        fits: (used: number, capacity: number) =>
          `Cabe en una página: ocupa ${used.toString().replace(".", ",")} de ${capacity} renglones.`,
        overflows: (used: number, capacity: number) =>
          `No cabe en una página: ocupa ${used.toString().replace(".", ",")} de ${capacity} renglones. Acorte el texto o quite un párrafo.`,
        onePageRule:
          "La carta siempre debe entrar en una sola página: no se encoge, se acorta.",
        save: "Guardar cambios",
        removeParagraph: "este párrafo",
        sendTitle: "Envío y descarga",
        sendHint:
          "Descargue la carta o copie el texto para pegarlo en el formulario de la oferta. Al marcarla como enviada, el historial queda al día.",
        copy: "Copiar texto",
        copied: "Carta copiada.",
        redoTitle: "Volver a redactar con IA",
        redoDescription:
          "Redacta de nuevo esta carta desde su banco y la oferta, con el mismo idioma y tono, y reemplaza su texto.",
        redoBusy: "Redactando de nuevo su carta",
        redoRun: (label: string, model: string) =>
          `Redactar de nuevo con ${label} (${model})`,
      },
    },
    docs: {
      title: "Documentos generados",
      typeFilter: "Tipo",
      types: { all: "CV y cartas", cv: "Solo CV", letter: "Solo cartas" },
      letterKind: "Carta",
      searchLabel: "Buscar documento",
      searchPlaceholder: "Buscar por nombre u oferta",
      sort: "Ordenar por",
      sorts: {
        recent: "Más recientes",
        old: "Más antiguos",
        name: "Nombre (A-Z)",
      },
      sentFilter: "Envío",
      sentFilters: {
        all: "Enviados y sin enviar",
        sent: "Enviados",
        unsent: "Sin enviar",
      },
      onlyOffer: (title: string) => `Solo de la oferta: ${title}`,
      showAll: "Ver todos",
      general: "General (sin oferta)",
      open: "Abrir",
      back: "Volver a los documentos",
      sentOn: "Enviado el",
      unsent: "Sin enviar",
      markSent: "Marcar como enviado",
      unmarkSent: "Quitar envío",
      markedSent: "Marcado como enviado. La oferta pasó a «Postulada» si estaba sin postular.",
      none: "Aún no generó documentos. Elija una oferta y use «Generar».",
      noMatch: "Ningún documento coincide con la búsqueda o el filtro.",
      forOffer: "Oferta",
      cvKind: "CV",
      pagesShort: (n: number) => `${n} pág.`,
    },
    title: "Crear CV y carta",
    description:
      "Elija una oferta, genere su CV y su carta de presentación a la medida y lleve el control de lo que ya envió. Todo sale de su banco: no se inventa nada.",
    offer: {
      title: "Oferta",
      description:
        "Pegue el texto de la oferta. Se trata solo como texto: no se ejecuta nada de lo que contenga.",
      text: "Texto de la oferta",
      company: "Empresa (opcional)",
      titleField: "Título (opcional)",
      createdAt: "Guardada el",
      url: "Enlace de la oferta (opcional)",
      analyze: "Analizar oferta",
      analyzing: "Analizando…",
      saved: "Ofertas guardadas",
      none: "Aún no guardó ofertas.",
      delete: "Eliminar oferta",
      deleteTitle: "Eliminar oferta",
      deleteMessage:
        "Los CV ya generados se conservan, solo pierden el vínculo con la oferta.",
      map: "Mapa de evidencia",
      mapDescription:
        "Qué pide la oferta y qué de su banco lo demuestra. Una brecha se dice como brecha.",
      filters: "Filtros duros",
      filtersDescription:
        "Requisitos que suelen descartar una candidatura sin leer el resto.",
      status: { ok: "Con evidencia", partial: "Parcial", gap: "Brecha" },
      mustHave: "Obligatorio",
      nice: "Deseable",
    },
    generate: {
      title: "Generar CV",
      description:
        "La IA lee su banco completo (tal como lo escribió) y la oferta, elige lo más relevante y redacta el CV dentro del límite de páginas del nivel. Nada se copia tal cual del banco.",
      languageChoices: {
        es: "Español",
        en: "Inglés",
        both: "Español e inglés (dos versiones)",
      },
      languageHint:
        "El CV se redacta completo en el idioma que elija, aunque su banco esté en otro. Con «ambos» se crea una versión por idioma.",
      fromOffer: "Se generará a partir de la oferta seleccionada.",
      kindLabel: "Qué generar",
      kinds: {
        cv: "CV",
        competencies: "CV competencias",
        letter: "Carta de presentación",
      },
      competencies: {
        title: "Generar CV competencias",
        description:
          "Formato para agencias de empleo y áreas de recursos humanos (por ejemplo ane.cr): encabezado centrado, competencias personales y técnicas por separado, experiencia explicada en lenguaje claro y aire entre secciones. La IA elige las competencias de su catálogo del banco. Para postular por su cuenta use el CV, que está pensado para los filtros ATS.",
        aiTitle: (n: number) =>
          n === 1
            ? "Redactando su CV de competencias"
            : "Redactando su CV de competencias en español e inglés",
        externalHint:
          "1. Descargue las instrucciones: llevan su oferta o enfoque, su banco con el catálogo de competencias y los límites del nivel. Péguelas completas en la IA que prefiera.",
        badge: "Competencias",
        needCatalog:
          "Su catálogo de competencias está vacío. Agregue competencias en el Banco para poder generar este CV.",
      },
      needTarget:
        "Para generar, elija una oferta en la pestaña Ofertas o escriba un enfoque (por ejemplo «automatización de pruebas») para un CV general.",
      goOffers: "Elegir una oferta",
      options: "Opciones",
      analysis: "Análisis de la oferta",
      analysisNone:
        "Con una oferta seleccionada aquí verá qué pide y qué de su banco lo respalda.",
      toDocs: "Ver documentos",
      aiTitle: (n: number) =>
        n === 1 ? "Redactando su CV" : "Redactando su CV en español e inglés",
      run: (label: string, model: string) =>
        `Generar con ${label} (${model})`,
      externalHint:
        "1. Descargue las instrucciones: llevan su oferta, su banco y los límites del nivel. Péguelas completas en la IA que prefiera; con una sola respuesta tendrá el CV en el idioma o idiomas elegidos.",
      draft: "Borrador rápido sin IA",
      draftHint:
        "Si no tiene IA a mano: arma un borrador con reglas a partir de los logros ya derivados de su banco (sin reescribirlos).",
      draftNeedsAchievements:
        "El borrador sin IA necesita al menos un logro derivado en el banco.",
      emptyBank:
        "Su banco aún no tiene experiencias ni proyectos. Cuéntelos en el Banco (sin cuidar el formato) para poder generar un CV.",
      focus: "Enfoque (si no usa una oferta)",
      focusHint: "Por ejemplo: «automatización de pruebas».",
      offerSelect: "Oferta",
      noOffer: "Sin oferta (CV general)",
      level: "Nivel",
      paper: "Papel",
      language: "Idioma del CV",
      name: "Nombre de la versión (opcional)",
      submit: "Generar CV",
      submitting: "Generando…",
      levels: { junior: "Junior", mid: "Mid", senior: "Senior" },
    },
    versions: {
      createdAt: "Creada el",
      title: "Versiones",
      empty: "Aún no generó CV.",
      open: "Abrir",
      pagesLines: (pages: number, used: number, budget: number) =>
        `${pages} pág. · ${used.toString().replace(".", ",")} de ${budget} líneas`,
      public: "CV público",
      source: { rules: "Reglas", manual: "Editado", ai: "Con IA" },
      delete: "Eliminar versión",
      deleteTitle: "Eliminar versión",
      deleteMessage: "Esta versión del CV se eliminará de forma permanente.",
      rename: "Nombre",
    },
    editor: {
      tabs: {
        label: "Secciones del CV",
        content: "Contenido",
        send: "Enviar y descargar",
        review: "Revisión ATS",
        redo: "Volver a redactar",
      },
      sendTitle: "Envío y descarga",
      sendHint:
        "Descargue el archivo para postular. Al marcarlo como enviado, el historial de la oferta queda al día.",
      title: "Vista previa y edición",
      summary: "Perfil profesional",
      edit: "Editar",
      saveLine: "Guardar línea",
      lineLength: (n: number, max: number) => `${n} de ${max} caracteres`,
      rejected: "No se guardó:",
      makePublic: "Usar como CV público",
      removePublic: "Quitar del perfil público",
      publicHint:
        "El CV público se publica junto con el perfil; sus datos de contacto siguen lo que usted activó en el perfil.",
      pdf: "Descargar PDF",
      docx: "Descargar Word (.docx)",
      docxHint:
        "El archivo Word se abre en Word, Google Docs y LibreOffice, y lo puede seguir editando.",
      pdfUnavailable:
        "La descarga de PDF aún no está disponible en este servidor. Puede descargar el Word o copiar el texto ATS.",
      ats: "Texto que lee un sistema ATS",
      atsDescription: "Es el CV en texto plano, en orden de lectura.",
      checks: "Comprobaciones",
      checksPassed: "Todas las comprobaciones pasan.",
      fit: "Ajuste a la página",
    },
    ai: {
      title: "Volver a redactar con IA",
      description:
        "Redacta de nuevo esta versión desde su banco, con la misma oferta, nivel, papel e idioma, y reemplaza su contenido. Lo que escriba la IA no puede traer cifras que su banco no tenga: lo que no cumpla se descarta.",
      busy: "Redactando de nuevo su CV",
      run: (label: string, model: string) => `Redactar de nuevo con ${label} (${model})`,
      savedPdf:
        "Si la versión se actualizó, ya puede descargar el PDF o el Word.",
    },
  },
  aiSettings: {
    title: "Configurar IA",
    description:
      "Elija un proveedor, pegue su clave y escoja el modelo. Huella usará esa cuenta cuando pida «Mejorar con IA». La clave se guarda cifrada y nunca se vuelve a mostrar.",
    privacy:
      "Al usar la IA automática (o al llevar el prompt a una IA externa) se envía su banco tal como lo escribió (relatos, su historia y su voz) y la oferta; nunca su nombre, correo, teléfono ni enlaces. El uso se cobra a su cuenta del proveedor.",
    provider: "Proveedor",
    getKey: "Obtener una clave",
    apiKey: "Clave de API",
    apiKeyNew: "Pegue la clave de su cuenta.",
    apiKeyKept: (hint: string) =>
      `Hay una clave guardada que termina en ${hint}. Déjelo vacío para conservarla.`,
    loadModels: "Cargar modelos",
    model: "Modelo",
    modelHint:
      "Cargue la lista para ver los modelos que su cuenta puede usar. Los modelos «flash» o «mini» son más rápidos y baratos.",
    makeActive: "Usar este proveedor en «Mejorar con IA»",
    save: "Guardar configuración",
    saved: "Configuración guardada.",
    remove: "Quitar clave",
    removeConfirm: "¿Quitar la clave de este proveedor?",
    removeDescription:
      "Se borra la clave guardada. Podrá ingresarla de nuevo cuando quiera.",
    removed: "Clave quitada.",
    active: "En uso",
    configured: "Configurado",
    notConfigured: "Sin configurar",
    unreadable:
      "La clave guardada ya no se puede leer (cambió el secreto del servidor). Ingrésela de nuevo.",
    modelsLoaded: (n: number) =>
      `${n} modelo${n === 1 ? "" : "s"} disponible${n === 1 ? "" : "s"}.`,
  },
  aiWork: {
    auto: "Con su proveedor",
    run: (label: string, model: string) => `Mejorar con ${label} (${model})`,
    running: "Esperando la respuesta del proveedor…",
    notConfigured:
      "Aún no ha configurado un proveedor. Puede hacerlo en «Configurar IA» o usar una IA externa.",
    unreadable:
      "La clave guardada ya no se puede leer. Ingrésela de nuevo en «Configurar IA».",
    configure: "Configurar IA",
    external: "Con una IA externa",
    step1:
      "1. Descargue las instrucciones y péguelas completas en el asistente que prefiera. Son las mismas que recibe el proveedor configurado.",
    downloadMd: "Descargar .md",
    downloadTxt: "Descargar .txt",
    step2:
      "2. El asistente debe responder solo con un bloque JSON. Cópielo o guárdelo en un archivo.",
    step3: "3. Importe la respuesta: cárguela desde un archivo o péguela.",
    file: "Archivo con la respuesta (.json, .txt o .md)",
    fileTooLarge:
      "El archivo es demasiado grande para ser una respuesta (máximo 60 000 caracteres).",
    paste: "O pegue aquí el JSON de la respuesta",
    import: "Importar y validar",
    rejected: "Se descartó:",
    busy: "La IA está trabajando",
  },
  aiJob: {
    working:
      "Espere a que responda. Puede cerrar esta ventana: el trabajo sigue y se le avisa al terminar.",
    doneTitle: "Listo",
    failedTitle: "No se pudo completar",
    close: "Cerrar",
    hide: "Seguir en segundo plano",
    retry: "Reintentar",
    nothingUsable:
      "La IA respondió, pero nada pasó la validación del servidor.",
    done: (n: number) =>
      n === 1 ? "La IA terminó." : `La IA terminó los ${n} pasos.`,
    failed: (label: string) => `La IA no pudo completar: ${label}.`,
    rejected: (n: number) =>
      `Se descartó ${n} línea${n === 1 ? "" : "s"} que no pasó la validación`,
    imported: (n: number) =>
      n === 1 ? "Se importó y validó la respuesta." : `Se importaron ${n} elementos.`,
    importedNothing: "La respuesta no trajo nada que se pudiera usar.",
  },
  history: {
    title: "Historial de postulaciones",
    description:
      "Cada oferta con su estado, los documentos que generó y cuáles envió. Actualice aquí cómo avanza cada proceso.",
    searchLabel: "Buscar en el historial",
    searchPlaceholder: "Buscar por puesto, empresa o nota",
    sort: "Ordenar por",
    sorts: {
      recent: "Más recientes",
      old: "Más antiguas",
      followUp: "Seguimiento más próximo",
      status: "Estado",
    },
    summary: {
      all: "Todas",
      saved: "Sin postular",
      applied: "Postuladas",
      interview: "En entrevistas",
      offer: "Con oferta",
      closed: "Cerradas",
      followUp: "Seguimiento pendiente",
    },
    empty: "Aún no hay ofertas. Guarde una en «Crear CV» y aparecerá aquí.",
    noMatch: "Ninguna oferta coincide con la búsqueda o el filtro.",
    goStudio: "Ir a Crear CV",
    savedOn: "Guardada el",
    appliedOn: "Postulada el",
    docsSent: (n: number) => `${n} documento${n === 1 ? "" : "s"} enviado${n === 1 ? "" : "s"}`,
    docsReady: (n: number) =>
      `${n} listo${n === 1 ? "" : "s"} sin enviar`,
    noDocs: "Sin documentos generados",
    followUp: {
      overdue: (days: number) =>
        `Seguimiento vencido hace ${days} día${days === 1 ? "" : "s"}`,
      today: "Seguimiento hoy",
      soon: (days: number) =>
        `Seguimiento en ${days} día${days === 1 ? "" : "s"}`,
    },
    details: "Actualizar seguimiento",
    hideDetails: "Ocultar",
    openDocs: "Abrir documentos",
    generate: "Generar documentos",
    viewOffer: "Ver oferta original",
    status: "Estado",
    appliedAt: "Fecha de postulación",
    followUpAt: "Seguimiento el",
    followUpHint:
      "Un recordatorio para escribir o llamar si no responden; el historial lo resalta cuando llega.",
    notes: "Notas",
    notesHint:
      "Contacto, salario, fechas de entrevista, lo que le dijeron…",
    save: "Guardar seguimiento",
    saved: "Seguimiento guardado.",
    sentDocs: "Documentos enviados",
    allDocs: "Todos los documentos de esta oferta",
  },
  content: {
    title: "Contenido del perfil",
    description:
      "Lo que verá quien abra su enlace, en español e inglés. Es texto corto y priorizado (con un máximo por sección), no una copia de su banco. Edite el español: al guardar, la IA reescribe esa sección en inglés para que las dos versiones queden iguales.",
    counter: (n: number, max: number) => `${n} de ${max} caracteres`,
    generateAll: "Redactar todo el perfil con IA",
    generateAllHint:
      "Con su proveedor se redacta una sección a la vez (trayectoria, proyectos, habilidades, formación y, al final, titular y resumen), esperando la respuesta de cada una. Con una IA externa se usa un solo prompt para todo.",
    generateAllTitle: "Redactando su perfil",
    run: (label: string, model: string) =>
      `Redactar el perfil con ${label} (${model})`,
    externalHint:
      "1. Descargue las instrucciones: llevan su banco completo y los máximos de cada sección. Péguelas completas en la IA que prefiera; con una sola respuesta tendrá todo el perfil en español e inglés.",
    sectionExternalHint:
      "1. Descargue las instrucciones de esta sección y péguelas completas en la IA que prefiera.",
    regenerate: "Volver a redactar esta sección con IA",
    regenerateHint:
      "Reemplaza esta sección (español e inglés) con una redacción nueva desde su banco. Lo que haya editado en ella se pierde.",
    stalePending: (n: number) =>
      `Inglés pendiente de actualizar (${n} sección${n === 1 ? "" : "es"})`,
    staleHint:
      "Editó el español y el inglés de estas secciones quedó atrasado. Reescríbalo para que las dos versiones queden iguales.",
    translateTitle: "Reescribiendo el inglés",
    translateRun: (label: string, model: string) =>
      `Reescribir el inglés con ${label} (${model})`,
    translateExternalHint:
      "1. Descargue las instrucciones: llevan el español de las secciones pendientes para pasarlo al inglés.",
    status: {
      ready: "Al día",
      stale: "Inglés desactualizado",
      empty: "Sin contenido",
    },
    save: "Guardar",
    saveHintAi: "Al guardar, la IA reescribe esta sección en inglés.",
    saveHintNoAi:
      "Sin un proveedor de IA configurado, el inglés queda pendiente: reescríbalo con una IA externa.",
    thisItem: "este elemento",
    present: "actual",
    emptySection:
      "Aún no hay contenido en esta sección. Redáctela con IA desde su banco.",
    sections: {
      overview: {
        title: "Titular, resumen y destacados",
        hint: "Lo primero que lee quien abre su perfil. Se redacta al final, a partir del resto.",
        generating: "Titular, resumen y destacados",
        translating: "Titular, resumen y destacados (inglés)",
      },
      experience: {
        title: "Trayectoria",
        hint: "Hasta 4 experiencias y 3 viñetas por cada una. Empresa y fechas salen de su banco y no se editan aquí.",
        generating: "Trayectoria",
        translating: "Trayectoria (inglés)",
      },
      projects: {
        title: "Proyectos",
        hint: "Hasta 3 proyectos, con un resumen corto cada uno.",
        generating: "Proyectos",
        translating: "Proyectos (inglés)",
      },
      skills: {
        title: "Habilidades",
        hint: "Hasta 5 grupos y 20 habilidades en total: las principales, no todas.",
        generating: "Habilidades",
        translating: "Habilidades (inglés)",
      },
      credentials: {
        title: "Formación, certificaciones e idiomas",
        hint: "Hasta 3 estudios, 4 certificaciones y 5 idiomas.",
        generating: "Formación, certificaciones e idiomas",
        translating: "Formación, certificaciones e idiomas (inglés)",
      },
    },
    overview: {
      headline: "Titular",
      summary: "Resumen",
      highlights: "Destacados",
      figure: "Cifra",
      highlightText: "Texto",
      highlight: "este destacado",
      addHighlight: "Agregar destacado",
    },
    experience: {
      role: "Cargo",
      bullet: (n: number) => `Viñeta ${n}`,
      addBullet: "Agregar viñeta",
    },
    projects: { summary: "Resumen del proyecto" },
    skills: {
      label: "Grupo",
      items: "Habilidades",
      itemsHint: (n: number) => `Separadas por comas; hasta ${n} por grupo.`,
    },
    credentials: {
      education: "Formación",
      degree: "Título",
      note: "Nota",
      certifications: "Certificaciones",
      name: "Nombre",
      languages: "Idiomas",
      language: "Idioma",
      level: "Nivel",
    },
    english: {
      title: "Versión en inglés",
      empty: "Aún no hay versión en inglés.",
      note: "Se actualiza sola cuando guarda el español; no se edita aquí.",
    },
  },
  publication: {
    title: "Perfil público",
    description:
      "Lo que verá quien reciba su enlace. Nada se publica hasta que usted lo decide; lo que edite después queda como borrador hasta publicar de nuevo.",
    profile: {
      title: "Datos del perfil",
      displayName: "Nombre",
      headlineMoved:
        "El titular y el resumen se redactan y editan en «Contenido del perfil» (español e inglés).",
      headline: "Titular",
      summary: "Resumen",
      location: "Ubicación",
      availability: "Disponibilidad",
      email: "Correo de contacto",
      phone: "Teléfono",
      showEmail: "Mostrar mi correo en el perfil público",
      showPhone: "Mostrar mi teléfono en el perfil público",
      showLocation: "Mostrar mi ubicación",
      showAvailability: "Mostrar mi disponibilidad",
      contactHint:
        "Por defecto no se muestran. Usted decide qué ve quien abre su enlace.",
      links: "Enlaces",
      addLink: "Agregar enlace",
      linkKind: "Tipo",
      linkLabel: "Texto",
      linkUrl: "Dirección (https)",
      linkPublic: "Público",
      linkIcon: "Icono",
      iconAuto: "Automático",
      iconAutoHint: "Según el tipo de enlace",
      iconChange: (current: string) => `Icono: ${current}. Cambiar`,
      iconPick: "Elija el icono del enlace",
      icons: {
        globe: "Sitio web",
        linkedin: "LinkedIn",
        github: "GitHub",
        gitlab: "GitLab",
        twitter: "X (Twitter)",
        youtube: "YouTube",
        instagram: "Instagram",
        facebook: "Facebook",
        figma: "Figma",
        dribbble: "Dribbble",
        briefcase: "Portafolio",
        code: "Código",
        file: "Documento",
        book: "Blog o artículos",
        mail: "Correo",
        link: "Enlace genérico",
      },
      kinds: {
        github: "GitHub",
        linkedin: "LinkedIn",
        website: "Sitio web",
        other: "Otro",
      },
    },
    status: {
      title: "Publicación",
      published: "Publicado",
      draft: "Sin publicar",
      version: (n: number) => `Versión publicada n.º ${n}`,
      changes:
        "Hay cambios sin publicar. Quien abra el enlace aún ve la versión anterior.",
      upToDate: "Lo publicado coincide con su borrador.",
      publish: "Publicar",
      republish: "Publicar cambios",
      publishing: "Publicando…",
      unpublish: "Despublicar",
      unpublishTitle: "Despublicar perfil",
      unpublishMessage:
        "El enlace dejará de mostrar contenido. Podrá publicar de nuevo cuando quiera.",
      cvIncluded: "Incluye su CV público.",
      cvMissing: "No incluye CV: elija uno en «Crear CV».",
    },
    link: {
      title: "Enlace",
      description:
        "Es largo y aleatorio: solo lo conoce quien usted se lo comparta. Puede copiarlo las veces que necesite.",
      current: "Su enlace",
      none: "Aún no tiene enlace. Se crea al publicar.",
      createdOn: (when: string) => `Creado el ${when}.`,
      notPublished: "Todavía no funciona: publique el perfil para activarlo.",
      lost: (when: string) =>
        `Este enlace se creó el ${when}, antes de que pudiera volver a mostrarse. Cree uno nuevo para verlo y copiarlo.`,
      open: "Abrir enlace en una pestaña nueva",
      regenerate: "Crear enlace nuevo",
      regenerateTitle: "Crear enlace nuevo",
      regenerateMessage:
        "El enlace anterior dejará de funcionar al instante. Quien lo tenga verá «no disponible».",
      copy: "Copiar enlace",
      copied: "Enlace copiado",
    },
    preview: {
      title: "Vista previa",
      description:
        "Ábrala en una pestaña nueva para ver su perfil como lo ve quien recibe el enlace. La vista previa muestra su borrador actual; el enlace público muestra lo ya publicado.",
      open: "Abrir vista previa del borrador",
      banner:
        "Vista previa de su borrador. Solo usted la ve; así se verá en el enlace cuando publique.",
      loadFailed: "No pudimos cargar la vista previa. Cierre esta pestaña e inténtelo de nuevo.",
    },
  },
  public: {
    skip: "Saltar al contenido",
    gone: {
      title: "Enlace no disponible",
      body: "Este enlace ya no muestra contenido o nunca existió.",
    },
    sections: {
      summary: "Resumen",
      path: "Trayectoria",
      projects: "Proyectos",
      tools: "Herramientas",
      education: "Formación",
      contact: "Contacto",
    },
    facts: {
      experience: "Experiencia",
      years: (n: number) => `${n} año${n === 1 ? "" : "s"}`,
      now: "Ahora",
      before: "Antes",
      location: "Ubicación",
      available: "Disponible",
      present: "Presente",
    },
    actions: {
      contact: "Contacto",
      cv: "Ver CV",
      print: "Imprimir",
      showEmail: "Mostrar correo",
    },
    highlighter: {
      title: "¿Qué busca usted?",
      description:
        "Escriba los términos de su búsqueda y el perfil marca dónde hay evidencia. Los que no figuran se dicen como no figuran.",
      label: "Términos separados por comas",
      example: "Probar con un ejemplo",
      clear: "Limpiar",
      exampleTerms: "Playwright, CI/CD, API, k6, Kubernetes",
      summary: (ok: number, total: number) =>
        `${ok} de ${total} términos con evidencia${ok < total ? "; los demás no figuran en este perfil." : "."}`,
      places: (n: number) => `${n} lugar${n === 1 ? "" : "es"}`,
      noEvidence: "sin evidencia",
    },
    fingerprint: (id: string) =>
      `Huella n.º ${id}. Cambia en cada publicación.`,
    fingerprintLabel: (id: string) => `Huella generativa ${id}`,
    recency: {
      current: "En uso",
      recent: "Reciente",
      earlier: "Anterior",
    },
    evidence: (n: number) => `${n} logro${n === 1 ? "" : "s"}`,
    noindex: "Perfil profesional",
    cv: {
      title: "CV",
      back: "Volver al perfil",
    },
  },
  soon: {
    title: "En preparación",
    description:
      "Esta función se suma al banco que ya tiene: reutilizará sus logros, sus ofertas y sus versiones de CV sin pedirle nada de nuevo.",
    items: {
      entrevistas: {
        title: "Preparación de entrevistas",
        text: "Practique con preguntas sobre sus propios logros y sobre la oferta a la que aplica.",
      },
    },
  },
} as const;
