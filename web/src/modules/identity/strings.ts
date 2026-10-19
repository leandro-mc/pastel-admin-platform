/** Textos de Identity (español de Costa Rica, trato de usted, sin voseo). */
export const identityStrings = {
  module: {
    name: "Configuración",
    tagline: "Usuarios, roles, módulos y auditoría",
    noSections:
      "Su cuenta no tiene permisos para ver ninguna sección de Configuración. Si lo necesita, solicítelo a administración.",
  },
  validation: {
    emailRequired: "Escriba su correo electrónico.",
    emailInvalid: "Escriba un correo válido, por ejemplo nombre@correo.com.",
    passwordRequired: "Escriba su contraseña.",
    nameRequired: "Escriba su nombre.",
    nameLength: "El nombre debe tener entre 2 y 100 caracteres.",
    passwordLength: (min: number, max: number) =>
      `La contraseña debe tener entre ${min} y ${max} caracteres.`,
  },
  login: {
    title: "Iniciar sesión",
    subtitle: "Ingrese sus datos para continuar.",
    google: "Continuar con Google",
    or: "o",
    email: "Correo electrónico",
    emailPlaceholder: "nombre@correo.com",
    password: "Contraseña",
    submit: "Ingresar",
    submitting: "Ingresando…",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    withPassword: "Ingresar con correo y contraseña",
    expired: "Su sesión venció. Ingrese de nuevo para continuar.",
    loadingOptions: "Cargando las opciones de ingreso…",
    retry: "Reintentar",
    noMethods:
      "Por ahora no hay un método de ingreso disponible. Comuníquese con administración.",
    toRegister: "¿No tiene cuenta? Crear una cuenta",
    optionsError: "No se pudieron cargar las opciones de ingreso.",
    unexpected:
      "No se pudo iniciar sesión. Intente de nuevo; si continúa, comparta el código de soporte.",
  },
  register: {
    title: "Crear una cuenta",
    subtitle: "Complete sus datos para comenzar.",
    name: "Nombre completo",
    namePlaceholder: "Su nombre",
    submit: "Crear cuenta",
    submitting: "Creando cuenta…",
    toLogin: "¿Ya tiene cuenta? Iniciar sesión",
    unexpected:
      "No se pudo crear la cuenta. Intente de nuevo; si continúa, comparta el código de soporte.",
  },
  account: {
    title: "Mi cuenta",
    subtitle: "Revise su perfil y mantenga su acceso bajo control.",
    active: "Cuenta activa",
    name: "Nombre",
    email: "Correo electrónico",
    createdAt: "Fecha de alta",
    roles: "Roles asignados",
    noRoles: "Sin roles",
    editTitle: "¿Necesita actualizar sus datos?",
    editHint:
      "Por ahora la edición del perfil está deshabilitada para mantener la información consistente.",
    editRequest: "Solicitar cambio",
    editNotice: "Solicite a administración que actualice su nombre de perfil.",
    securityTitle: "Seguridad",
    securityHint: "Su acceso se revisa en cada solicitud.",
    password: "Contraseña",
    passwordHint: "Actualícela periódicamente y no la comparta.",
    changePassword: "Cambiar contraseña",
    permissions: (count: number) =>
      count === 1
        ? "Tiene 1 permiso efectivo."
        : `Tiene ${count} permisos efectivos.`,
    authorization: "Autorización",
    session: "Sesión",
    sessionHint: "Tokens de corta duración y renovación rotativa.",
  },
  changePassword: {
    title: "Cambiar contraseña",
    forcedTitle: "Cree su contraseña nueva",
    subtitle:
      "Al guardar, su sesión actual se cerrará y deberá ingresar de nuevo.",
    forcedSubtitle:
      "Su contraseña es temporal. Debe cambiarla para continuar usando Pastel.",
    current: "Contraseña actual",
    next: "Contraseña nueva",
    confirmation: "Confirmar contraseña nueva",
    mismatch: "Las contraseñas no coinciden.",
    currentRequired: "Escriba su contraseña actual.",
    submit: "Guardar y cerrar sesión",
    submitting: "Guardando…",
    cancel: "Cancelar",
    done: "Contraseña actualizada. Ingrese con la nueva.",
    unexpected:
      "No se pudo cambiar la contraseña. Intente de nuevo; si continúa, comparta el código de soporte.",
  },
  /** Códigos de `?error=` que devuelve el flujo de Google. */
  googleErrors: {
    google_denied:
      "No se autorizó el ingreso con Google. Si fue un error, intente de nuevo.",
    email_unverified:
      "Google no ha verificado ese correo, así que no se puede usar para ingresar.",
    account_disabled:
      "Su cuenta está desactivada. Comuníquese con administración.",
    signup_closed:
      "No hay una cuenta con ese correo y el registro no está abierto. Solicite acceso a administración.",
    failed: "No se pudo completar el ingreso con Google. Intente de nuevo.",
  },
  supportCode: "Código de soporte",
} as const;

export type GoogleErrorCode = keyof typeof identityStrings.googleErrors;

export function googleErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return code in identityStrings.googleErrors
    ? identityStrings.googleErrors[code as GoogleErrorCode]
    : identityStrings.googleErrors.failed;
}
