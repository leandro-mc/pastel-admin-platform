import { createContext, useContext } from "react";

type ShellValue = {
  /** App activa (`data-module`). Los menús se dibujan en un portal fuera del shell y necesitan repetirla para heredar su tema. */
  moduleCode: string | undefined;
};

export const ShellContext = createContext<ShellValue>({
  moduleCode: undefined,
});
export const useShell = (): ShellValue => useContext(ShellContext);
