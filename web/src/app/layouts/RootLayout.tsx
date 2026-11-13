import { DevModeProvider, appCodeForPath } from "@/core/devmode";
import Shell from "../shell/Shell";
import { allModules } from "../modules";

const resolveApp = (pathname: string) => appCodeForPath(pathname, allModules);

/**
 * Ruta raíz. La vista previa por rol (modo desarrollador) envuelve al shell y a todas las rutas, de modo que las guardas
 * y los módulos reciben los permisos con los que se dibuja la interfaz sin conocer el modo.
 */
export default function RootLayout() {
  return (
    <DevModeProvider resolveApp={resolveApp}>
      <Shell />
    </DevModeProvider>
  );
}
