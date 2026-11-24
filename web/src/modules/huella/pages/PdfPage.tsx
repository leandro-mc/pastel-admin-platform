import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { StateView } from "@/core/ui";
import { fetchCvPdf, fetchLetterPdf } from "../api/hooks";
import { useNoIndex } from "../lib/useNoIndex";
import { strings } from "../strings";

const t = strings.studio.preview;

/**
 * El PDF de un CV o de una carta a pantalla completa (`/huella/pdf/:tipo/:id`, pestaña nueva, exige sesión). Se pide con la
 * sesión y se muestra con el visor del navegador desde una URL `blob:` (CSP `frame-src 'self' blob:`); al recargar la
 * pestaña se vuelve a pedir, así que el enlace sigue sirviendo mientras la sesión esté abierta.
 */
export function Component() {
  useNoIndex();
  const { tipo = "", id = "" } = useParams();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const known = tipo === "cv" || tipo === "carta";

  useEffect(() => {
    if (!known || id === "") return;
    let active = true;
    let created: string | null = null;
    (tipo === "cv" ? fetchCvPdf(id) : fetchLetterPdf(id))
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(
          blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }),
        );
        setUrl(created);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [known, tipo, id]);

  useEffect(() => {
    const previous = document.title;
    document.title = tipo === "carta" ? t.letterFrame : t.cvFrame;
    return () => {
      document.title = previous;
    };
  }, [tipo]);

  if (!known || failed) {
    return <StateView status="error" title={t.loadFailed} />;
  }
  if (!url) {
    return <StateView status="loading" title={t.loading} />;
  }
  return (
    <iframe
      title={tipo === "carta" ? t.letterFrame : t.cvFrame}
      src={url}
      className="block h-dvh w-full border-0"
    />
  );
}
