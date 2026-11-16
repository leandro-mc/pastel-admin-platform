import { Moon, Sun } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePreferences } from "@/core/preferences";
import type { PublicLocalized, PublicProfile } from "../api/schemas";
import { countEvidence, parseTerms, segments } from "../lib/highlight";
import { LinkGlyph } from "../lib/linkIcons";
import { safeHref } from "../lib/safeHref";
import { formatMonth, publicText, type Lang } from "../lib/publicText";
import { Fingerprint } from "./Fingerprint";
import "./public-profile.css";

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

export { safeHref };

function ExternalLink({ url, children }: { url: string; children: string }) {
  const href = safeHref(url);
  if (href === null) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function texts(loc: PublicLocalized): string[] {
  return [
    loc.headline,
    loc.summary,
    ...loc.highlights.map((h) => h.text),
    ...loc.experience.flatMap((e) => [
      e.role,
      e.company,
      ...e.achievements.map((a) => a.text),
    ]),
    ...loc.projects.flatMap((x) => [x.name, x.summary, x.stack ?? ""]),
    ...loc.skills.flatMap((g) => [g.label, ...g.items]),
    ...loc.education.map((e) => `${e.degree} ${e.institution}`),
    ...loc.certifications.map((c) => c.name),
    ...loc.languages.map((l) => l.language),
  ];
}

function Ledger({ items }: { items: PublicLocalized["highlights"] }) {
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
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  /** Abre el CV público; solo se ofrece si el perfil lo incluye. */
  onViewCv?: () => void;
  /** En la vista previa del Owner no se ofrece imprimir ni abrir el CV. */
  preview?: boolean;
};

/** Perfil público: el mismo componente para la vista previa de la persona dueña y para quien abre el enlace. */
export function PublicProfileView({
  profile,
  seed,
  lang,
  onLangChange,
  onViewCv,
  preview = false,
}: Props) {
  const p = publicText[lang];
  const loc = profile[lang];
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const terms = useMemo(() => parseTerms(raw), [raw]);
  const counts = useMemo(() => countEvidence(texts(loc), terms), [loc, terms]);
  const withEvidence = counts.filter((n) => n > 0).length;
  const f = loc.facts;
  const hasContact = profile.contact.email || profile.contact.phone;

  const sections = [
    { id: "resumen-texto", label: p.sections.summary, show: true },
    { id: "trayectoria", label: p.sections.path, show: loc.experience.length > 0 },
    { id: "proyectos", label: p.sections.projects, show: loc.projects.length > 0 },
    { id: "herramientas", label: p.sections.tools, show: loc.skills.length > 0 },
    {
      id: "formacion",
      label: p.sections.education,
      show: loc.education.length + loc.certifications.length + loc.languages.length > 0,
    },
    {
      id: "contacto",
      label: p.sections.contact,
      show: Boolean(hasContact) || profile.links.length > 0,
    },
  ].filter((s) => s.show);

  const { condensed, heroRef, active } = useScrollState(sections.map((s) => s.id));

  const jump = (term: number) => {
    document
      .querySelector(`.hp mark[data-term="${term}"]`)
      ?.scrollIntoView({ block: "center" });
  };

  const range = (start: string, end: string | null) =>
    `${formatMonth(start, lang)} – ${end ? formatMonth(end, lang) : p.facts.present}`;

  return (
    <TermsContext.Provider value={terms}>
      <div className="hp" data-module="huella" lang={lang}>
        <a className="hp-skip" href="#resumen">
          {p.skip}
        </a>

        <header className="hp-bar hp-noprint" data-condensed={condensed || undefined}>
          <div className="hp-bar-in">
            <div className="hp-bar-id" aria-hidden={!condensed}>
              <strong>{profile.name}</strong>
              <span className="hp-bar-headline">{loc.headline}</span>
              {profile.contact.email ? (
                <a
                  href={`mailto:${profile.contact.email}`}
                  tabIndex={condensed ? 0 : -1}
                >
                  {profile.contact.email}
                </a>
              ) : null}
            </div>
            <div className="hp-bar-tools">
              <LanguageToggle lang={lang} onChange={onLangChange} />
              <ThemeToggle lang={lang} />
            </div>
          </div>
        </header>

        <div className="hp-wrap">
          <aside className="hp-rail">
            <nav aria-label={`${p.menu} · ${profile.name}`}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "location" : undefined}
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="hp-fps hp-noprint">
              <p className="hp-note">{p.noindex}</p>
            </div>
          </aside>

          <main id="resumen">
            <div className="hp-top" ref={heroRef}>
              <div>
                <h1 className="hp-name">{profile.name}</h1>
                <p className="hp-lead">
                  <Hl text={loc.headline} />
                </p>
              </div>
              <Fingerprint
                seed={seed}
                caption={p.fingerprint}
                label={p.fingerprintLabel}
              />
            </div>

            <dl className="hp-fact">
              <dt>{p.facts.experience}</dt>
              <dd>{p.facts.years(f.yearsOfExperience)}</dd>
              {f.currentRole ? (
                <>
                  <dt>{p.facts.now}</dt>
                  <dd>
                    {[f.currentRole, f.currentCompany, f.currentSince ? formatMonth(f.currentSince, lang) : null]
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
              {profile.hasCv && onViewCv ? (
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
                    <li key={`${term}-${i}`} className={n > 0 ? "is-ok" : "is-no"}>
                      <button type="button" disabled={n === 0} onClick={() => jump(i)}>
                        {n > 0 ? "✓" : "✕"} {term} ·{" "}
                        {n > 0 ? p.highlighter.places(n) : p.highlighter.noEvidence}
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
                <button type="button" className="hp-link" onClick={() => setRaw("")}>
                  {p.highlighter.clear}
                </button>
              </div>
            </section>

            <section id="resumen-texto" aria-labelledby="t-resumen">
              <h2 id="t-resumen">{p.sections.summary}</h2>
              <p>
                <Hl text={loc.summary} />
              </p>
              {loc.highlights.length > 0 ? <Ledger items={loc.highlights} /> : null}
            </section>

            {loc.experience.length > 0 ? (
              <section id="trayectoria" aria-labelledby="t-trayectoria">
                <h2 id="t-trayectoria">{p.sections.path}</h2>
                <div className="hp-tl">
                  {loc.experience.map((job, i) => (
                    <article key={i} className="hp-job">
                      <span className="hp-yr">{range(job.start, job.end)}</span>
                      <h3>
                        <Hl text={job.role} /> · <Hl text={job.company} />
                      </h3>
                      <Ledger items={job.achievements} />
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {loc.projects.length > 0 ? (
              <section id="proyectos" aria-labelledby="t-proyectos">
                <h2 id="t-proyectos">{p.sections.projects}</h2>
                {loc.projects.map((project, i) => (
                  <article key={i} className="hp-proj">
                    <h3>
                      {project.url ? (
                        <ExternalLink url={project.url}>{project.name}</ExternalLink>
                      ) : (
                        <Hl text={project.name} />
                      )}
                    </h3>
                    {project.stack ? (
                      <p className="hp-meta">
                        <Hl text={project.stack} />
                      </p>
                    ) : null}
                    {project.summary ? (
                      <p>
                        <Hl text={project.summary} />
                      </p>
                    ) : null}
                  </article>
                ))}
              </section>
            ) : null}

            {loc.skills.length > 0 ? (
              <section id="herramientas" aria-labelledby="t-herramientas">
                <h2 id="t-herramientas">{p.sections.tools}</h2>
                <dl className="hp-tools">
                  {loc.skills.map((group, i) => (
                    <div key={i} style={{ display: "contents" }}>
                      <dt>{group.label}</dt>
                      <dd>
                        {group.items.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="hp-chip"
                            onClick={() => setRaw(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {loc.education.length + loc.certifications.length + loc.languages.length > 0 ? (
              <section id="formacion" aria-labelledby="t-formacion">
                <h2 id="t-formacion">{p.sections.education}</h2>
                <ul className="hp-ledger">
                  {loc.education.map((e, i) => (
                    <li key={`e${i}`}>
                      <span className="hp-yr">{e.endYear ?? e.startYear ?? ""}</span>
                      <span>
                        <Hl text={`${e.degree}, ${e.institution}`} />
                        {e.note ? <span className="hp-meta"> · {e.note}</span> : null}
                      </span>
                    </li>
                  ))}
                  {loc.certifications.map((c, i) => (
                    <li key={`c${i}`}>
                      <span className="hp-yr">{c.year ?? ""}</span>
                      <span>
                        {c.url ? (
                          <ExternalLink url={c.url}>{c.name}</ExternalLink>
                        ) : (
                          <Hl text={c.name} />
                        )}
                        {c.issuer ? <span className="hp-meta"> · {c.issuer}</span> : null}
                      </span>
                    </li>
                  ))}
                  {loc.languages.map((l, i) => (
                    <li key={`l${i}`}>
                      <span className="hp-yr">{l.level}</span>
                      <span>
                        <Hl text={l.language} />
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
                      <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
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
                      <span className="hp-yr hp-linklabel">
                        <LinkGlyph kind={l.kind} icon={l.icon} />
                        {l.label}
                      </span>
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

/**
 * Estado de desplazamiento: `condensed` se activa cuando el encabezado grande (nombre y titular) sale de la pantalla, y
 * entonces la barra fija muestra el nombre, el titular y el correo; `active` es la sección que se está leyendo.
 */
function useScrollState(ids: string[]) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!(entry?.isIntersecting ?? true)),
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        const first = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (first) setActive(first.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [key]);

  return { condensed, heroRef, active };
}

function LanguageToggle({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const p = publicText[lang];
  return (
    <div className="hp-toggle" role="group" aria-label={p.language.label}>
      {(["en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => onChange(code)}
        >
          {p.language[code]}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ lang }: { lang: Lang }) {
  const { theme, setTheme } = usePreferences();
  const p = publicText[lang].theme;
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="hp-theme"
      onClick={() => setTheme(next)}
      aria-label={`${p.label}: ${next === "dark" ? p.dark : p.light}`}
      title={`${p.label}: ${next === "dark" ? p.dark : p.light}`}
    >
      {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      <span>{theme === "dark" ? p.light : p.dark}</span>
    </button>
  );
}
