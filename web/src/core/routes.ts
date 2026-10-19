/** Rutas de plataforma. Son palabras reservadas: ningún módulo puede usarlas como `basePath` (`ARCHITECTURE.md` §9.2). */
export const routes = {
  home: "/",
  login: "/ingresar",
  account: "/cuenta",
  /** Ruta obligatoria mientras la contraseña sea temporal. */
  password: "/cuenta/contrasena",
  settings: "/configuracion",
} as const;

/** Ruta de inicio de sesión con retorno a la ruta pedida. */
export function loginPath(returnUrl: string): string {
  return returnUrl === routes.home
    ? routes.login
    : `${routes.login}?returnUrl=${encodeURIComponent(returnUrl)}`;
}
