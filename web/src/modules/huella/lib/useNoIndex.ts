import { useEffect } from "react";

/**
 * Pide a los buscadores que no indexen esta vista y evita que el navegador envíe la dirección (que lleva el token)
 * como referente. El servidor repite ambas cosas en cabeceras; esto cubre la navegación dentro de la SPA.
 */
export function useNoIndex(): void {
  useEffect(() => {
    const created: HTMLMetaElement[] = [];
    for (const [name, content] of [
      ["robots", "noindex, nofollow, noarchive"],
      ["referrer", "no-referrer"],
    ] as const) {
      const meta = document.createElement("meta");
      meta.name = name;
      meta.content = content;
      document.head.append(meta);
      created.push(meta);
    }
    return () => created.forEach((meta) => meta.remove());
  }, []);
}
