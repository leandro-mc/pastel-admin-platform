// Plantilla fija del CV de Huella (CCR-2). Los datos llegan SOLO por data.json: cada cadena se imprime como texto y
// nunca se evalúa como marcado ni código. Reglas ATS: una columna, texto real, sin iconos, ligaduras desactivadas,
// contacto en el cuerpo de la primera página (nunca en cabecera o pie). Un solo diseño para los dos formatos
// (d.format = "standard" | "competencies"); cambian las secciones y su orden, no el aspecto.
#let d = json("data.json")
#let muted = luma(85)
#let competencies = d.at("format", default: "standard") == "competencies"

#set document(title: d.title, author: d.name)
#set page(
  paper: if d.paper == "a4" { "a4" } else { "us-letter" },
  margin: (x: 1.9cm, top: 1.6cm, bottom: 1.7cm),
)
#set text(font: "Liberation Sans", size: 10pt, lang: d.lang, ligatures: false, hyphenate: false)
#set par(justify: false, leading: 0.55em, spacing: 0.7em)
#set list(indent: 0.35em, body-indent: 0.55em, spacing: 0.5em, marker: [•])

// Título de sección: negrita, sin mayúsculas forzadas, con una línea fina que abarca todo el ancho.
#show heading.where(level: 2): it => block(above: 1.35em, below: 0.65em, width: 100%, sticky: true, stack(
  dir: ttb,
  spacing: 0.4em,
  text(size: 11pt, weight: "bold", it.body),
  line(length: 100%, stroke: 0.7pt + luma(70)),
))

#let joined(items, sep: "  |  ") = items.filter(x => x != "").join(sep)

// Una línea «título … fechas»: el título a la izquierda y las fechas a la derecha.
#let titled(left, dates) = grid(columns: (1fr, auto), column-gutter: 1em, left, align(top + right, text(fill: muted, dates)))

// Segunda línea de una experiencia: empresa en negrita y, junto a ella, qué fue (cursiva). Si no caben en un renglón, el
// contexto pasa completo al siguiente: nunca queda una palabra suelta.
#let company-line(company, descriptor) = layout(size => {
  let lead = text(weight: "bold", company)
  if descriptor == "" {
    lead
  } else {
    let ctx = text(style: "italic", fill: muted, descriptor)
    if measure(lead).width + measure(ctx).width + (1.2em).to-absolute() <= size.width {
      lead; h(1.2em); ctx
    } else {
      lead; linebreak(); v(0.1em); ctx
    }
  }
})

// Cabecera de una formación: «Título, Institución» y las fechas a la derecha; si no cabe, la institución pasa completa abajo.
#let head(title, subtitle, dates, extra) = layout(size => {
  let lead = { text(weight: "bold", title); if subtitle != "" { [, ]; subtitle } }
  let when = text(fill: muted, dates)
  let fits = measure(lead).width + measure(when).width + (1em).to-absolute() <= size.width
  if fits {
    titled(lead, dates)
    if extra != "" { v(-0.2em); text(fill: muted, size: 9.5pt, extra) }
  } else {
    titled(text(weight: "bold", title), dates)
    if subtitle != "" or extra != "" {
      v(-0.15em)
      if subtitle != "" { subtitle }
      if subtitle != "" and extra != "" { text(fill: muted, size: 9.5pt)[ · ] }
      if extra != "" { text(fill: muted, size: 9.5pt, extra) }
    }
  }
})

#let experience-entry(e) = {
  block(breakable: false, below: 0.6em, {
    titled(text(weight: "bold", e.title), e.dates)
    v(-0.15em)
    company-line(e.subtitle, if e.at("descriptor", default: none) not in (none, "") { e.descriptor } else { "" })
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
  v(0.55em)
}

// Proyecto: el nombre y, debajo, las tecnologías (solo las relevantes).
#let project-entry(e) = {
  block(breakable: false, below: 0.45em, {
    text(weight: "bold", e.title)
    if e.subtitle != "" { v(-0.15em); text(fill: muted, size: 9.5pt, e.subtitle) }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
  v(0.55em)
}

// ───────── Encabezado (centrado) ─────────
#align(center, {
  text(size: 21pt, weight: "bold", d.name)
  if d.headline != "" { v(0.1em); text(size: 11.5pt, d.headline) }
  if d.contact1.len() > 0 { v(0.35em); text(fill: muted, joined(d.contact1)) }
  if d.contact2.len() > 0 { v(0.2em); text(fill: muted, joined(d.contact2)) }
})

#let summary-section() = if d.summary != "" {
  heading(level: 2, d.labels.summary)
  par(d.summary)
}

#let skills-section() = if d.skills.len() > 0 {
  heading(level: 2, d.labels.skills)
  for g in d.skills {
    block(below: 0.5em, { text(weight: "bold", g.label + ": "); g.items.join(", ") })
  }
}

#let experience-section() = if d.experience.len() > 0 {
  heading(level: 2, d.labels.experience)
  for e in d.experience { experience-entry(e) }
}

#let projects-section() = if d.projects.len() > 0 {
  heading(level: 2, d.labels.projects)
  for e in d.projects { project-entry(e) }
}

// Competencias: una lista por tipo, con el nombre en negrita y, si la hay, la frase de evidencia.
#let competencies-sections() = for g in d.competencies {
  heading(level: 2, g.label)
  list(..g.items.map(c => {
    text(weight: "bold", c.name)
    if c.at("note", default: none) not in (none, "") { [: ]; c.note }
  }))
}

#let education-section() = if d.education.len() > 0 {
  heading(level: 2, d.labels.education)
  for ed in d.education {
    block(breakable: false, below: 0.8em, {
      head(ed.degree, ed.institution, ed.dates, if ed.at("detail", default: none) not in (none, "") { ed.detail } else { "" })
    })
  }
}

#let extras-section() = if d.extras.len() > 0 {
  heading(level: 2, d.labels.extras)
  list(..d.extras)
}

#if competencies {
  summary-section()
  competencies-sections()
  experience-section()
  education-section()
  extras-section()
} else {
  summary-section()
  experience-section()
  projects-section()
  skills-section()
  education-section()
  extras-section()
}
