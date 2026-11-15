import { createContext, useContext, useId, useMemo, useState } from "react";
import type { PublicProfile } from "../api/schemas";
import { countEvidence, parseTerms, segments } from "../lib/highlight";
import { strings } from "../strings";
import { Fingerprint } from "./Fingerprint";
import "./public-profile.css";

const p = strings.public;

const TermsContext = createContext<readonly string[]>([]);

/** Texto con los términos buscados marcados. Sin términos, es texto simple. */
function Hl({ text }: { text: string }) {
  const terms = useContext(TermsContext);
  return (
    <>
      {segments(text, terms).map((s, i) =>
        s.term === null ? (
          s.text
        ) : (
          <mark key={i} data-term={s.term}>
            {s.text}
          </mark>
        ),
      )}
    </>
  );
}

/** Solo se enlazan direcciones http(s); cualquier otra cosa se muestra como texto. */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function ExternalLink({ url, children }: { url: string; children: string }) {
  const href = safeHref(url);
  if (href === null) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const year = (month: string) => month.slice(0, 4);

function texts(profile: PublicProfile): string[] {
  return [
    profile.headline,
    profile.summary,
    ...profile.highlights.map((h) => h.text),
    ...profile.experience.flatMap((e) => [
      e.role,
      e.company,
      ...e.achievements.map((a) => a.text),
    ]),
    ...profile.projects.flatMap((x) => [
      x.name,
      x.summary,
      x.stack ?? "",
      ...x.achievements.map((a) => a.text),
    ]),
    ...profile.skills.map((s) => s.name),
    ...profile.education.map((e) => `${e.degree} ${e.institution}`),
    ...profile.certifications.map((c) => c.name),
    ...profile.languages.map((l) => l.language),
  ];
}

function Ledger({ items }: { items: PublicProfile["highlights"] }) {
  return (
    <ul className="hp-ledger">
      {items.map((item, i) => (
        <li key={i}>
          <span className="hp-fig">{item.figure ?? ""}</span>
          <span>
            <Hl text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  profile: PublicProfile;
  seed: string;
  /** Abre el CV público; solo se ofrece si el perfil lo incluye. */
  onViewCv?: () => void;
  /** En la vista previa del Owner no se ofrece imprimir ni abrir el CV. */
  preview?: boolean;
};

/** Perfil público: el mismo componente para la vista previa del Owner y para quien abre el enlace. */
export function PublicProfileView({
  profile,
  seed,
  onViewCv,
  preview = false,
}: Props) {
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const terms = useMemo(() => parseTerms(raw), [raw]);
  const counts = useMemo(
    () => countEvidence(texts(profile), terms),
    [profile, terms],
  );
  const withEvidence = counts.filter((n) => n > 0).length;
  const f = profile.facts;

  const skillGroups = useMemo(() => {
    const map = new Map<string, PublicProfile["skills"]>();
    for (const s of profile.skills) {
      map.set(s.category, [...(map.get(s.category) ?? []), s]);
    }
    return [...map.entries()];
  }, [profile.skills]);

  const hasContact = profile.contact.email || profile.contact.phone;
  const sections = [
    { id: "resumen", label: p.sections.summary, show: true },
    {
      id: "trayectoria",
      label: p.sections.path,
      show: profile.experience.length > 0,
    },
    {
      id: "proyectos",
      label: p.sections.projects,
      show: profile.projects.length > 0,
    },
    {
      id: "herramientas",
      label: p.sections.tools,
      show: profile.skills.length > 0,
    },
    {
      id: "formacion",
      label: p.sections.education,
      show:
        profile.education.length +
          profile.certifications.length +
          profile.languages.length >
        0,
    },
    {
      id: "contacto",
      label: p.sections.contact,
      show: Boolean(hasContact) || profile.links.length > 0,
    },
  ].filter((s) => s.show);

  const jump = (term: number) => {
    document
      .querySelector(`.hp mark[data-term="${term}"]`)
      ?.scrollIntoView({ block: "center" });
  };

  return (
    <TermsContext.Provider value={terms}>
      <div className="hp" data-module="huella">
        <a className="hp-skip" href="#resumen">
          {p.skip}
        </a>
        <div className="hp-wrap">
          <aside className="hp-rail">
            <nav aria-label={profile.name}>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="hp-fps hp-noprint">
              <p className="hp-note">{p.noindex}</p>
            </div>
          </aside>

          <main id="resumen">
            <div className="hp-top">
              <div>
                <h1 className="hp-name">{profile.name}</h1>
                <p className="hp-lead">
                  <Hl text={profile.headline} />
                </p>
              </div>
              <Fingerprint seed={seed} />
            </div>

            <dl className="hp-fact">
              <dt>{p.facts.experience}</dt>
              <dd>{p.facts.years(f.yearsOfExperience)}</dd>
              {f.currentRole ? (
                <>
                  <dt>{p.facts.now}</dt>
                  <dd>
                    {[f.currentRole, f.currentCompany, f.currentSince]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </>
              ) : null}
              {f.previousRole ? (
                <>
                  <dt>{p.facts.before}</dt>
                  <dd>
                    {[f.previousRole, f.previousCompany, f.previousYears]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </>
              ) : null}
              {profile.location ? (
                <>
                  <dt>{p.facts.location}</dt>
                  <dd>{profile.location}</dd>
                </>
              ) : null}
              {profile.availability ? (
                <>
                  <dt>{p.facts.available}</dt>
                  <dd>{profile.availability}</dd>
                </>
              ) : null}
            </dl>

            <div className="hp-actions">
              {hasContact ? (
                <a className="hp-btn" href="#contacto">
                  {p.actions.contact}
                </a>
              ) : null}
              {profile.hasCv && onViewCv && !preview ? (
                <button type="button" className="hp-btn" onClick={onViewCv}>
                  {p.actions.cv}
                </button>
              ) : null}
              {!preview ? (
                <button
                  type="button"
                  className="hp-btn"
                  onClick={() => window.print()}
                >
                  {p.actions.print}
                </button>
              ) : null}
            </div>

            <section className="hp-finder" aria-labelledby={`${inputId}-t`}>
              <h2 id={`${inputId}-t`}>{p.highlighter.title}</h2>
              <p className="hp-note">{p.highlighter.description}</p>
              <label htmlFor={inputId} className="hp-note">
                {p.highlighter.label}
              </label>
              <input
                id={inputId}
                type="text"
                autoComplete="off"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
              <p className="hp-sum" role="status" aria-live="polite">
                {terms.length > 0
                  ? p.highlighter.summary(withEvidence, terms.length)
                  : ""}
              </p>
              <ul className="hp-results">
                {terms.map((term, i) => {
                  const n = counts[i] ?? 0;
                  return (
                    <li
                      key={`${term}-${i}`}
                      className={n > 0 ? "is-ok" : "is-no"}
                    >
                      <button
                        type="button"
                        disabled={n === 0}
                        onClick={() => jump(i)}
                      >
                        {n > 0 ? "✓" : "✕"} {term} ·{" "}
                        {n > 0
                          ? p.highlighter.places(n)
                          : p.highlighter.noEvidence}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div>
                <button
                  type="button"
                  className="hp-link"
                  onClick={() => setRaw(p.highlighter.exampleTerms)}
                >
                  {p.highlighter.example}
                </button>
                <button
                  type="button"
                  className="hp-link"
                  onClick={() => setRaw("")}
                >
                  {p.highlighter.clear}
                </button>
              </div>
            </section>

            <section aria-labelledby="t-resumen">
              <h2 id="t-resumen">{p.sections.summary}</h2>
              <p>
                <Hl text={profile.summary} />
              </p>
              {profile.highlights.length > 0 ? (
                <Ledger items={profile.highlights} />
              ) : null}
            </section>

            {profile.experience.length > 0 ? (
              <section id="trayectoria" aria-labelledby="t-trayectoria">
                <h2 id="t-trayectoria">{p.sections.path}</h2>
                <div className="hp-tl">
                  {profile.experience.map((job, i) => (
                    <article key={i} className="hp-job">
                      <span className="hp-yr">
                        {year(job.start)} –{" "}
                        {job.end ? year(job.end) : p.facts.present}
                      </span>
                      <h3>
                        <Hl text={job.role} /> · <Hl text={job.company} />
                      </h3>
                      <Ledger items={job.achievements} />
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {profile.projects.length > 0 ? (
              <section id="proyectos" aria-labelledby="t-proyectos">
                <h2 id="t-proyectos">{p.sections.projects}</h2>
                {profile.projects.map((project, i) => (
                  <article key={i} className="hp-proj">
                    <h3>
                      {project.url ? (
                        <ExternalLink url={project.url}>
                          {project.name}
                        </ExternalLink>
                      ) : (
                        <Hl text={project.name} />
                      )}
                    </h3>
                    {project.stack ? (
                      <p className="hp-meta">
                        <Hl text={project.stack} />
                      </p>
                    ) : null}
                    <p>
                      <Hl text={project.summary} />
                    </p>
                    <Ledger items={project.achievements} />
                  </article>
                ))}
              </section>
            ) : null}

            {skillGroups.length > 0 ? (
              <section id="herramientas" aria-labelledby="t-herramientas">
                <h2 id="t-herramientas">{p.sections.tools}</h2>
                <dl className="hp-tools">
                  {skillGroups.map(([category, skills]) => (
                    <div key={category} style={{ display: "contents" }}>
                      <dt>{category}</dt>
                      <dd>
                        {skills.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            className="hp-chip"
                            data-recency={s.recency}
                            title={`${p.recency[s.recency]} · ${p.evidence(s.evidence)}`}
                            onClick={() => setRaw(s.name)}
                          >
                            {s.name}
                          </button>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {profile.education.length +
              profile.certifications.length +
              profile.languages.length >
            0 ? (
              <section id="formacion" aria-labelledby="t-formacion">
                <h2 id="t-formacion">{p.sections.education}</h2>
                <ul className="hp-ledger">
                  {profile.education.map((e, i) => (
                    <li key={`e${i}`}>
                      <span className="hp-yr">
                        {e.endYear ?? e.startYear ?? ""}
                      </span>
                      <span>
                        <Hl text={`${e.degree}, ${e.institution}`} />
                        {e.note ? (
                          <span className="hp-meta"> · {e.note}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {profile.certifications.map((c, i) => (
                    <li key={`c${i}`}>
                      <span className="hp-yr">{c.year ?? ""}</span>
                      <span>
                        {c.url ? (
                          <ExternalLink url={c.url}>{c.name}</ExternalLink>
                        ) : (
                          <Hl text={c.name} />
                        )}
                        {c.issuer ? (
                          <span className="hp-meta"> · {c.issuer}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {profile.languages.map((l, i) => (
                    <li key={`l${i}`}>
                      <span className="hp-yr">{l.level}</span>
                      <span>
                        <Hl text={l.language} />
                        {l.evidence ? (
                          <span className="hp-meta"> · {l.evidence}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasContact || profile.links.length > 0 ? (
              <section id="contacto" aria-labelledby="t-contacto">
                <h2 id="t-contacto">{p.sections.contact}</h2>
                <ul className="hp-ledger">
                  {profile.contact.email ? (
                    <li>
                      <span className="hp-yr">@</span>
                      <a href={`mailto:${profile.contact.email}`}>
                        {profile.contact.email}
                      </a>
                    </li>
                  ) : null}
                  {profile.contact.phone ? (
                    <li>
                      <span className="hp-yr">Tel.</span>
                      <span>{profile.contact.phone}</span>
                    </li>
                  ) : null}
                  {profile.links.map((l, i) => (
                    <li key={i}>
                      <span className="hp-yr">{l.label}</span>
                      <ExternalLink url={l.url}>{l.url}</ExternalLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <footer className="hp-foot">
              <p>{profile.name}</p>
            </footer>
          </main>
        </div>
      </div>
    </TermsContext.Provider>
  );
}
