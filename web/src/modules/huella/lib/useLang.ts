import { useCallback, useState } from "react";
import { readLang, saveLang, type Lang } from "./publicText";

/** Idioma del perfil público: empieza en inglés (o el último que eligió en este navegador) y se puede cambiar. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>(readLang);
  const change = useCallback((next: Lang) => {
    setLang(next);
    saveLang(next);
  }, []);
  return [lang, change];
}
