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
// Compacto: renglones con espacio fijo (stack), sin el espaciado de párrafo. El correo y los enlaces son vínculos reales;
// el texto visible no cambia (los ATS leen lo mismo). Un enlace se guarda sin «https://»: se le antepone al vincularlo.
#let contact-item(x) = if x.contains("@") and not x.contains(" ") {
  link("mailto:" + x, x)
} else { x }
#let link-item(x) = if x.contains(" ") { x } else {
  link(if x.starts-with("http") { x } else { "https://" + x }, x)
}
#let sep = [#h(0.55em)|#h(0.55em)]
#let header-lines = (pad(bottom: 0.25em, text(size: 20pt, weight: "bold", d.name)),)
#if d.headline != "" { header-lines.push(text(size: 11pt, d.headline)) }
#if d.contact1.len() > 0 { header-lines.push(text(fill: muted, d.contact1.filter(x => x != "").map(contact-item).join(sep))) }
#if d.contact2.len() > 0 { header-lines.push(text(fill: muted, d.contact2.filter(x => x != "").map(link-item).join(sep))) }
#align(center, stack(dir: ttb, spacing: 0.8em, ..header-lines))

#let summary-section() = if d.summary != "" {
  heading(level: 2, d.labels.summary)
  par(d.summary)
}

#let skills-section() = if d.skills.len() > 0 {
  heading(level: 2, d.labels.skills)
  for g in d.skills {
    block(below: 0.5em, { if g.label != "" { text(weight: "bold", g.label + ": ") }; g.items.join(", ") })
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

// Competencias: una sola sección con un renglón por tipo («Personales: a, b, c»), como las habilidades del CV propio.
#let competencies-sections() = if d.competencies.len() > 0 {
  heading(level: 2, d.labels.at("competencies", default: "Competencias"))
  for g in d.competencies {
    block(below: 0.5em, { if g.label != "" { text(weight: "bold", g.label + ": ") }; g.items.map(c => c.name).join(", ") })
  }
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
  // Las competencias van tras la experiencia, en el mismo lugar que las habilidades del CV propio.
  summary-section()
  experience-section()
  competencies-sections()
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
