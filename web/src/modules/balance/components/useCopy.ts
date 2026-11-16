import { useState } from "react";

/** Copia texto al portapapeles y recuerda cuál fue el último copiado (para mostrar «Copiado»). */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  }
  return { copied, copy };
}
