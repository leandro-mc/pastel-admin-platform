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

// Cabecera de una entrada: «Título — Subtítulo» a la izquierda y las fechas a la derecha, todo en un renglón si cabe. Si no
// cabe, el subtítulo pasa completo al renglón siguiente (con el lugar): nunca queda una palabra suelta del subtítulo.
#let head(title, sep, subtitle, dates, extra) = layout(size => {
  let lead = { text(weight: "semibold", title); if subtitle != "" { sep; subtitle } }
  let when = text(fill: muted, dates)
  let fits = measure(lead).width + measure(when).width + (1em).to-absolute() <= size.width
  if fits {
    grid(columns: (1fr, auto), column-gutter: 1em, lead, align(top + right, when))
    if extra != "" { v(-0.2em); text(fill: muted, size: 9.5pt, extra) }
  } else {
    grid(columns: (1fr, auto), column-gutter: 1em, text(weight: "semibold", title), align(top + right, when))
    if subtitle != "" or extra != "" {
      v(-0.2em)
      if subtitle != "" { subtitle }
      if subtitle != "" and extra != "" { text(fill: muted, size: 9.5pt)[ · ] }
      if extra != "" { text(fill: muted, size: 9.5pt, extra) }
    }
  }
})

#let entry(e) = {
  block(breakable: false, below: 0.55em, {
    if e.dates == "" {
      // Proyecto: el nombre y, debajo, las tecnologías (solo las relevantes).
      text(weight: "semibold", e.title)
      if e.subtitle != "" { v(-0.2em); text(fill: muted, size: 9.5pt, e.subtitle) }
    } else {
      head(e.title, [ — ], e.subtitle, e.dates, if e.at("location", default: none) not in (none, "") { e.location } else { "" })
    }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
  v(0.3em)
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
    block(breakable: false, below: 0.8em, {
      head(ed.degree, [, ], ed.institution, ed.dates, if ed.at("detail", default: none) not in (none, "") { ed.detail } else { "" })
    })
  }
}

// ───────── Certificaciones e idiomas ─────────
#if d.extras.len() > 0 {
  heading(level: 2, d.labels.extras)
  list(..d.extras)
}
