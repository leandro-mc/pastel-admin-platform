import type { NavigateOptions } from "react-router";

// Permite que los enlaces de react-aria-components (menús, pestañas) naveguen con React Router sin recargar.
declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}
