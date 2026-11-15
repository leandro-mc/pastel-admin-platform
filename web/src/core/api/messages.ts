/** Textos transversales del cliente API (español de Costa Rica, trato de usted). Los módulos usan sus propios `strings.ts`. */
export const apiMessages = {
  network: "No hay conexión con el servidor. Revise su red e intente de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Intente de nuevo.",
  invalidResponse:
    "La respuesta del servidor no tiene el formato esperado. Intente de nuevo; si continúa, comuníquese con administración.",
  csrf: "No se pudo iniciar una sesión segura. Recargue la página e intente de nuevo.",
  unauthorized: "Debe iniciar sesión para continuar.",
  forbidden: "No tiene acceso a esta acción.",
  notFound: "No encontramos lo que busca.",
  conflict: "No se pudo completar la operación. Recargue e intente de nuevo.",
  rateLimited:
    "Hubo demasiados intentos. Espere un momento e intente de nuevo.",
  unavailable:
    "El servicio no está disponible por el momento. Intente de nuevo en unos segundos.",
  unexpected:
    "Ocurrió un error inesperado. Intente de nuevo; si continúa, comuníquese con administración e indique el código de soporte.",
} as const;

export function messageForStatus(status: number): string {
  switch (status) {
    case 401:
      return apiMessages.unauthorized;
    case 403:
      return apiMessages.forbidden;
    case 404:
      return apiMessages.notFound;
    case 409:
      return apiMessages.conflict;
    case 429:
      return apiMessages.rateLimited;
    case 502:
    case 503:
    case 504:
      return apiMessages.unavailable;
    default:
      return apiMessages.unexpected;
  }
}
