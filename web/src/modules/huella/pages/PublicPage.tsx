import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { isApiError } from "@/core/api";
import { StateView } from "@/core/ui";
import { usePublicCv, usePublicProfile } from "../api/hooks";
import { PublicCvScreen } from "../components/PublicCvScreen";
import { PublicProfileView } from "../components/PublicProfileView";
import { publicText } from "../lib/publicText";
import { useLang } from "../lib/useLang";
import { useNoIndex } from "../lib/useNoIndex";
import "../components/public-profile.css";

/**
 * Vista pública por enlace (`/huella/p/:token`). Sin sesión y sin el marco de Pastel: quien llega solo lee lo que la
 * persona publicó, en inglés por defecto y con selector de idioma y de tema.
 */
export function Component() {
  useNoIndex();
  const { token = "" } = useParams();
  const profile = usePublicProfile(token);
  const [showCv, setShowCv] = useState(false);
  const [lang, setLang] = useLang();
  const t = publicText[lang];

  useEffect(() => {
    const previous = document.title;
    if (profile.data)
      document.title = `${profile.data.profile.name} · ${t.noindex}`;
    return () => {
      document.title = previous;
    };
  }, [profile.data, t.noindex]);

  if (profile.isPending) {
    return (
      <div className="hp">
        <StateView status="loading" title={t.loading} />
      </div>
    );
  }
  if (profile.isError || !profile.data) {
    // Ausente, despublicado, mal formado o regenerado: el servidor responde igual (404) y aquí también se ve igual.
    const notFound = isApiError(profile.error) && profile.error.isNotFound;
    return (
      <div className="hp" lang={lang}>
        <main className="hp-gone">
          <h1>{notFound ? t.gone.title : t.loadFailed}</h1>
          <p>{notFound ? t.gone.body : ""}</p>
        </main>
      </div>
    );
  }

  const { profile: doc, seed } = profile.data;
  if (showCv)
    return <PublicCv token={token} lang={lang} onBack={() => setShowCv(false)} />;
  return (
    <PublicProfileView
      profile={doc}
      seed={seed}
      lang={lang}
      onLangChange={setLang}
      onViewCv={doc.hasCv ? () => setShowCv(true) : undefined}
    />
  );
}

function PublicCv({
  token,
  lang,
  onBack,
}: {
  token: string;
  lang: "en" | "es";
  onBack: () => void;
}) {
  const cv = usePublicCv(token, true);
  return <PublicCvScreen cv={cv} lang={lang} onBack={onBack} />;
}
