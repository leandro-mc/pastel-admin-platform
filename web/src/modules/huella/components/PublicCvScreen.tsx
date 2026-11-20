import type { CvDocument } from "../api/schemas";
import { publicText, type Lang } from "../lib/publicText";
import "./public-profile.css";

type CvQuery = { isPending: boolean; isError: boolean; data?: CvDocument };

/** Pantalla del CV público (la misma para quien abre el enlace y para la vista previa de la persona dueña). */
export function PublicCvScreen({
  cv,
  onBack,
  lang,
}: {
  cv: CvQuery;
  onBack: () => void;
  lang: Lang;
}) {
  const t = publicText[lang];
  return (
    <div className="hp" lang={lang}>
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
        {cv.isPending ? <p>{t.cv.loading}</p> : null}
        {cv.isError ? <p>{t.cv.failed}</p> : null}
        {cv.data ? <CvReadOnly doc={cv.data} lang={lang} /> : null}
      </main>
    </div>
  );
}

/** Los títulos siguen el idioma en que está redactado el CV (si lo trae); si no, el idioma elegido en la página. */
function CvReadOnly({ doc, lang }: { doc: CvDocument; lang: Lang }) {
  const t = publicText[doc.language === "es" || doc.language === "en" ? doc.language : lang];
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
