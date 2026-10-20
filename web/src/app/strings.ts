/** Textos de la plataforma (español de Costa Rica, trato de usted, sin voseo). Los módulos usan su propio `strings.ts`. */
export const strings = {
  skipToContent: "Saltar al contenido",
  loading: "Cargando…",
  backHome: "Volver al inicio",
  retry: "Reintentar",
  supportCode: "Código de soporte",
  forbidden: {
    title: "No tiene acceso a esta sección",
    message:
      "Su cuenta no tiene el permiso necesario. Si cree que se trata de un error, solicite el acceso a administración.",
  },
  notFound: {
    title: "No encontramos lo que busca",
    message: "La dirección no existe o cambió de lugar.",
  },
  error: {
    title: "Algo salió mal",
    message:
      "Ocurrió un error inesperado. Intente de nuevo; si continúa, comuníquese con administración e indique el código de soporte.",
  },
  sessionError: {
    title: "No pudimos verificar su sesión",
    message:
      "Hubo un problema al consultar su cuenta. Revise su conexión e intente de nuevo.",
  },
} as const;

export const shellStrings = {
  brand: "Pastel",
  home: "Inicio",
  modules: "Aplicaciones",
  help: {
    button: "Ayuda",
    title: "¿Necesita ayuda?",
    body: "Si algo no funciona o necesita acceso a una aplicación, comuníquese con administración. Si ve un código de soporte, indíquelo al escribir.",
  },
  account: {
    menu: "Cuenta",
    mine: "Mi cuenta",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    textSize: "Tamaño de texto",
    normal: "Normal",
    large: "Grande",
    xlarge: "Muy grande",
    signOut: "Cerrar sesión",
    signIn: "Ingresar",
  },
  breadcrumbs: "Migas de pan",
  moduleNav: (name: string) => `Navegación de ${name}`,
  hub: {
    title: "Inicio",
    anonymous: "Inicie sesión para ver sus aplicaciones.",
    empty:
      "Todavía no tiene aplicaciones asignadas. Solicite acceso a administración.",
    open: "Abrir",
  },
} as const;
