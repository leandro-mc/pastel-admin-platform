import { useEffect, useState } from "react";
import { StateView } from "@/core/ui";
import { usePreview, usePreviewCv } from "../api/hooks";
import { PublicCvScreen } from "../components/PublicCvScreen";
import { PublicProfileView } from "../components/PublicProfileView";
import { useLang } from "../lib/useLang";
import { useNoIndex } from "../lib/useNoIndex";
import { strings } from "../strings";
import "../components/public-profile.css";

const t = strings.publication.preview;

/**
 * Vista previa real del borrador (`/huella/vista-previa`, se abre en una pestaña nueva y exige sesión). Usa los mismos
 * componentes que el enlace público, incluido el botón del CV y la impresión; solo añade un aviso arriba que no se imprime.
 */
export function Component() {
  useNoIndex();
  const preview = usePreview();
  const [showCv, setShowCv] = useState(false);
  const [lang, setLang] = useLang();
  const cv = usePreviewCv(showCv);

  useEffect(() => {
    const previous = document.title;
    if (preview.data) document.title = `${preview.data.profile.name} · ${t.title}`;
    return () => {
      document.title = previous;
    };
  }, [preview.data]);

  if (preview.isPending) {
    return <StateView status="loading" title={strings.common.loading} />;
  }
  if (preview.isError || !preview.data) {
    return <StateView status="error" title={t.loadFailed} />;
  }

  return (
    <>
      <div
        role="note"
        className="border-b border-line bg-accent-soft px-4 py-2 text-center text-sm text-fg print:hidden"
      >
        {t.banner}
      </div>
      {showCv ? (
        <PublicCvScreen cv={cv} lang={lang} onBack={() => setShowCv(false)} />
      ) : (
        <PublicProfileView
          profile={preview.data.profile}
          seed={preview.data.seed}
          lang={lang}
          onLangChange={setLang}
          onViewCv={
            preview.data.profile.hasCv ? () => setShowCv(true) : undefined
          }
        />
      )}
    </>
  );
}
