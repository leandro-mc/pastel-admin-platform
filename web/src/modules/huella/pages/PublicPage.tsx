import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { isApiError } from "@/core/api";
import { StateView } from "@/core/ui";
import { usePublicCv, usePublicProfile } from "../api/hooks";
import type { CvDocument } from "../api/schemas";
import { PublicProfileView } from "../components/PublicProfileView";
import { useNoIndex } from "../lib/useNoIndex";
import { strings } from "../strings";
import "../components/public-profile.css";

const t = strings.public;

/** Vista pública por enlace (`/huella/p/:token`). Sin sesión: quien llega solo lee lo que la persona publicó. */
export function Component() {
  useNoIndex();
  const { token = "" } = useParams();
  const profile = usePublicProfile(token);
  const [showCv, setShowCv] = useState(false);

  useEffect(() => {
    const previous = document.title;
    if (profile.data)
      document.title = `${profile.data.profile.name} · ${t.noindex}`;
    return () => {
      document.title = previous;
    };
  }, [profile.data]);

  if (profile.isPending) {
    return (
      <div className="hp">
        <StateView status="loading" title={strings.common.loading} />
      </div>
    );
  }
  if (profile.isError || !profile.data) {
    // Ausente, despublicado, mal formado o regenerado: el servidor responde igual (404) y aquí también se ve igual.
    const notFound = isApiError(profile.error) && profile.error.isNotFound;
    return (
      <div className="hp">
        <main className="hp-gone">
          <h1>{notFound ? t.gone.title : strings.common.loadFailed}</h1>
          <p>{notFound ? t.gone.body : ""}</p>
        </main>
      </div>
    );
  }

  const { profile: doc, seed } = profile.data;
  if (showCv) return <PublicCv token={token} onBack={() => setShowCv(false)} />;
  return (
    <PublicProfileView
      profile={doc}
      seed={seed}
      onViewCv={doc.hasCv ? () => setShowCv(true) : undefined}
    />
  );
}

function PublicCv({ token, onBack }: { token: string; onBack: () => void }) {
  const cv = usePublicCv(token, true);
  return (
    <div className="hp">
      <main className="hp-cv">
        <p className="hp-noprint">
          <button type="button" className="hp-link" onClick={onBack}>
            {t.cv.back}
          </button>
          <button
            type="button"
            className="hp-link"
            onClick={() => window.print()}
          >
            {t.actions.print}
          </button>
        </p>
        {cv.isPending ? <p>{strings.common.loading}</p> : null}
        {cv.isError ? <p>{strings.common.loadFailed}</p> : null}
        {cv.data ? <CvReadOnly doc={cv.data} /> : null}
      </main>
    </div>
  );
}

function CvReadOnly({ doc }: { doc: CvDocument }) {
  const section = (title: string, entries: CvDocument["experience"]) =>
    entries.length > 0 ? (
      <section aria-label={title}>
        <h2>{title}</h2>
        {entries.map((entry, i) => (
          <article key={i} className="hp-proj">
            <h3>
              {entry.title}
              {entry.subtitle ? ` · ${entry.subtitle}` : ""}
            </h3>
            <p className="hp-meta">
              {[entry.dates, entry.location].filter(Boolean).join(" · ")}
            </p>
            <ul>
              {entry.bullets.map((b, j) => (
                <li key={j}>{b.text}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    ) : null;
  return (
    <article>
      <header>
        <h1 className="hp-name">{doc.header.name}</h1>
        <p className="hp-lead">{doc.header.headline}</p>
        {doc.header.contactLine1.length > 0 ? (
          <p className="hp-meta">{doc.header.contactLine1.join(" · ")}</p>
        ) : null}
        {doc.header.contactLine2.length > 0 ? (
          <p className="hp-meta">{doc.header.contactLine2.join(" · ")}</p>
        ) : null}
      </header>
      <section>
        <h2>{t.sections.summary}</h2>
        <p>{doc.summary}</p>
      </section>
      {doc.skills.length > 0 ? (
        <section>
          <h2>{t.sections.tools}</h2>
          <ul>
            {doc.skills.map((g) => (
              <li key={g.label}>
                <strong>{g.label}: </strong>
                {g.items.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {section(t.sections.path, doc.experience)}
      {section(t.sections.projects, doc.projects)}
      {doc.education.length > 0 ? (
        <section>
          <h2>{t.sections.education}</h2>
          <ul>
            {doc.education.map((e, i) => (
              <li key={i}>
                {e.degree}, {e.institution} · {e.dates}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
