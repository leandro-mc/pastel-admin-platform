/** Idiomas del perfil público. El perfil siempre existe en los dos; quien lo abre empieza en inglés y puede cambiar. */
export type Lang = "en" | "es";

export const defaultLang: Lang = "en";

type PublicText = {
  skip: string;
  loading: string;
  loadFailed: string;
  gone: { title: string; body: string };
  noindex: string;
  language: { label: string; en: string; es: string };
  theme: { label: string; light: string; dark: string };
  menu: string;
  sections: {
    summary: string;
    path: string;
    projects: string;
    tools: string;
    /** Título del apartado de habilidades de un CV combinado (competencias personales y técnicas juntas). */
    skills: string;
    education: string;
    contact: string;
  };
  facts: {
    experience: string;
    years: (n: number) => string;
    now: string;
    before: string;
    location: string;
    available: string;
    present: string;
  };
  actions: { contact: string; cv: string; print: string };
  highlighter: {
    title: string;
    description: string;
    label: string;
    example: string;
    clear: string;
    exampleTerms: string;
    summary: (ok: number, total: number) => string;
    places: (n: number) => string;
    noEvidence: string;
  };
  fingerprint: (id: string) => string;
  fingerprintLabel: (id: string) => string;
  cv: { back: string; loading: string; failed: string };
};

export const publicText: Record<Lang, PublicText> = {
  en: {
    skip: "Skip to content",
    loading: "Loading…",
    loadFailed: "We could not load this page.",
    gone: {
      title: "Link not available",
      body: "This link no longer shows content or never existed.",
    },
    noindex: "Professional profile",
    language: { label: "Language", en: "English", es: "Español" },
    theme: { label: "Theme", light: "Light", dark: "Dark" },
    menu: "Sections",
    sections: {
      summary: "Summary",
      path: "Experience",
      projects: "Projects",
      tools: "Skills",
      skills: "Skills",
      education: "Education",
      contact: "Contact",
    },
    facts: {
      experience: "Experience",
      years: (n) => `${n} year${n === 1 ? "" : "s"}`,
      now: "Now",
      before: "Before",
      location: "Location",
      available: "Available",
      present: "Present",
    },
    actions: { contact: "Contact", cv: "View résumé", print: "Print" },
    highlighter: {
      title: "What are you looking for?",
      description:
        "Type the terms of your search and the profile marks where there is evidence. Terms that do not appear are reported as missing.",
      label: "Terms separated by commas",
      example: "Try an example",
      clear: "Clear",
      exampleTerms: "Playwright, CI/CD, API, k6, Kubernetes",
      summary: (ok, total) =>
        `${ok} of ${total} terms with evidence${ok < total ? "; the rest do not appear in this profile." : "."}`,
      places: (n) => `${n} place${n === 1 ? "" : "s"}`,
      noEvidence: "no evidence",
    },
    fingerprint: (id) => `Fingerprint no. ${id}. It changes with every publication.`,
    fingerprintLabel: (id) => `Generative fingerprint ${id}`,
    cv: { back: "Back to profile", loading: "Loading…", failed: "We could not load the résumé." },
  },
  es: {
    skip: "Saltar al contenido",
    loading: "Cargando…",
    loadFailed: "No pudimos cargar esta página.",
    gone: {
      title: "Enlace no disponible",
      body: "Este enlace ya no muestra contenido o nunca existió.",
    },
    noindex: "Perfil profesional",
    language: { label: "Idioma", en: "English", es: "Español" },
    theme: { label: "Tema", light: "Claro", dark: "Oscuro" },
    menu: "Secciones",
    sections: {
      summary: "Resumen",
      path: "Trayectoria",
      projects: "Proyectos",
      tools: "Herramientas",
      skills: "Habilidades",
      education: "Formación",
      contact: "Contacto",
    },
    facts: {
      experience: "Experiencia",
      years: (n) => `${n} año${n === 1 ? "" : "s"}`,
      now: "Ahora",
      before: "Antes",
      location: "Ubicación",
      available: "Disponible",
      present: "Presente",
    },
    actions: { contact: "Contacto", cv: "Ver CV", print: "Imprimir" },
    highlighter: {
      title: "¿Qué busca usted?",
      description:
        "Escriba los términos de su búsqueda y el perfil marca dónde hay evidencia. Los que no figuran se dicen como no figuran.",
      label: "Términos separados por comas",
      example: "Probar con un ejemplo",
      clear: "Limpiar",
      exampleTerms: "Playwright, CI/CD, API, k6, Kubernetes",
      summary: (ok, total) =>
        `${ok} de ${total} términos con evidencia${ok < total ? "; los demás no figuran en este perfil." : "."}`,
      places: (n) => `${n} lugar${n === 1 ? "" : "es"}`,
      noEvidence: "sin evidencia",
    },
    fingerprint: (id) => `Huella n.º ${id}. Cambia en cada publicación.`,
    fingerprintLabel: (id) => `Huella generativa ${id}`,
    cv: { back: "Volver al perfil", loading: "Cargando…", failed: "No pudimos cargar el CV." },
  },
};

const KEY = "huella-public-lang";

/** Idioma recordado en este navegador; sin elección previa, inglés. */
export function readLang(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === "es" || saved === "en" ? saved : defaultLang;
  } catch {
    return defaultLang;
  }
}

export function saveLang(lang: Lang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Sin almacenamiento, el idioma vale solo para esta visita.
  }
}

/** `AAAA-MM` → «Mar 2022» / «mar 2022» según el idioma. */
export function formatMonth(month: string, lang: Lang): string {
  const [y, m] = month.split("-");
  const index = Number(m) - 1;
  if (!y || index < 0 || index > 11) return month;
  const name = new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(y), index, 1)),
  );
  return `${name.replace(".", "")} ${y}`;
}
