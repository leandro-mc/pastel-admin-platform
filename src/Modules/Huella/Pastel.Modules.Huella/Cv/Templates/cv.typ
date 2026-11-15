// Plantilla fija del CV de Huella (CCR-2). Los datos llegan SOLO por data.json: cada cadena se imprime como texto y
// nunca se evalúa como marcado ni código. Reglas ATS: una columna, texto real, sin iconos, ligaduras desactivadas,
// contacto en el cuerpo de la primera página (nunca en cabecera o pie).
#let d = json("data.json")
#let muted = luma(80)

#set document(title: d.title, author: d.name)
#set page(
  paper: if d.paper == "a4" { "a4" } else { "us-letter" },
  margin: (x: 1.8cm, top: 1.5cm, bottom: 1.6cm),
)
#set text(font: "Source Sans 3", size: 10.5pt, lang: d.lang, ligatures: false, hyphenate: false)
#set par(justify: false, leading: 0.5em, spacing: 0.65em)
#set list(indent: 0.2em, body-indent: 0.5em, spacing: 0.45em, marker: [•])

#show heading.where(level: 1): set text(size: 20pt, weight: "bold")
#show heading.where(level: 1): set block(below: 0.35em)
#show heading.where(level: 2): it => block(above: 1.1em, below: 0.55em, width: 100%, {
  set text(size: 10.5pt, weight: "bold", tracking: 0.04em)
  upper(it.body)
  v(-0.55em)
  line(length: 100%, stroke: 0.6pt + luma(150))
})

#let joined(items) = items.filter(x => x != "").join("  ·  ")

#let entry(e) = {
  block(breakable: false, below: 0.4em, {
    grid(
      columns: (1fr, auto),
      column-gutter: 1em,
      {
        text(weight: "semibold", e.title)
        if e.subtitle != "" { [ — ] + e.subtitle }
      },
      align(right, text(fill: muted, e.dates)),
    )
    if e.at("location", default: none) not in (none, "") {
      v(-0.2em)
      text(fill: muted, size: 9.5pt, e.location)
    }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
  v(0.25em)
}

// ───────── Encabezado ─────────
#heading(level: 1, d.name)
#if d.headline != "" { text(size: 12pt, d.headline) }
#if d.contact1.len() > 0 { block(above: 0.5em, below: 0em, text(fill: muted, joined(d.contact1))) }
#if d.contact2.len() > 0 { block(above: 0.4em, below: 0em, text(fill: muted, joined(d.contact2))) }

// ───────── Perfil ─────────
#if d.summary != "" {
  heading(level: 2, d.labels.summary)
  par(d.summary)
}

// ───────── Habilidades ─────────
#if d.skills.len() > 0 {
  heading(level: 2, d.labels.skills)
  for g in d.skills {
    block(below: 0.4em, { text(weight: "semibold", g.label + ": "); g.items.join(", ") })
  }
}

// ───────── Experiencia ─────────
#if d.experience.len() > 0 {
  heading(level: 2, d.labels.experience)
  for e in d.experience { entry(e) }
}

// ───────── Proyectos ─────────
#if d.projects.len() > 0 {
  heading(level: 2, d.labels.projects)
  for e in d.projects { entry(e) }
}

// ───────── Educación ─────────
#if d.education.len() > 0 {
  heading(level: 2, d.labels.education)
  for ed in d.education {
    block(breakable: false, below: 0.45em, {
      grid(
        columns: (1fr, auto),
        column-gutter: 1em,
        { text(weight: "semibold", ed.degree); [, ] + ed.institution },
        align(right, text(fill: muted, ed.dates)),
      )
      if ed.at("detail", default: none) not in (none, "") {
        v(-0.2em)
        text(fill: muted, size: 9.5pt, ed.detail)
      }
    })
  }
}

// ───────── Certificaciones e idiomas ─────────
#if d.extras.len() > 0 {
  heading(level: 2, d.labels.extras)
  list(..d.extras)
}
