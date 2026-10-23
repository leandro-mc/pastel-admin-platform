// Huella · plantilla CV ATS-estricta (Typst).
// Una columna, texto real, sin tablas / iconos / imágenes / cajas de texto.
// El contenido llega SIEMPRE como JSON validado (la IA nunca escribe código de plantilla).
#let data = json("cv.json")
#let L = data.at("layout", default: (:))
#let fs = L.at("fontSize", default: 10.5) * 1pt
#set page(paper: L.at("paper", default: "us-letter"), margin: (x: 0.7in, y: 0.6in))
#set text(font: ("Source Sans 3", "Liberation Sans", "DejaVu Sans"), size: fs, lang: data.lang,
          ligatures: false, discretionary-ligatures: false, fill: black)
#set par(leading: 0.55em, spacing: 0.5em, justify: false)
#set document(title: data.name + " - " + data.headline, author: data.name)
#set list(marker: [•], indent: 4pt, body-indent: 6pt, spacing: 0.45em)

#let section(title, body) = {
  v(0.7em, weak: true)
  block(sticky: true)[#text(weight: "bold", size: fs * 1.1)[#title] #v(-0.3em) #line(length: 100%, stroke: 0.5pt)]
  v(0.2em)
  body
}
// Fechas en la misma línea (h(1fr)): el orden de lectura se conserva al extraer el texto.
#let row(left, right) = [#left #h(1fr) #right]

// Cabecera dentro del cuerpo de la página (nunca en header/footer del documento)
#align(left)[
  #text(size: fs * 2.1, weight: "bold")[#data.name] \
  #text(size: fs * 1.15)[#data.headline] \
  #data.contact.join("  |  ")
]

#if data.summary != "" { section(data.labels.summary)[#data.summary] }

#section(data.labels.skills)[
  #for g in data.skills [#text(weight: "bold")[#g.group:] #g.items.join(", ") \ ]
]

#section(data.labels.experience)[
  #for e in data.experience [
    #row[#text(weight: "bold")[#e.role], #e.company#if e.location != "" [, #e.location]][#e.dates]
    #if e.bullets.len() > 0 { list(..e.bullets) }
    #v(0.35em)
  ]
]

#if data.projects.len() > 0 { section(data.labels.projects)[
  #for p in data.projects [
    #row[#text(weight: "bold")[#p.name] | #p.stack][#p.at("link", default: "")]
    #list(..p.bullets)
    #v(0.3em)
  ]
]}

#section(data.labels.education)[
  #for ed in data.education [
    #row[#text(weight: "bold")[#ed.degree], #ed.school][#ed.dates]
    #if ed.at("detail", default: "") != "" [#ed.detail \ ]
  ]
]

#if data.extras.len() > 0 { section(data.labels.extras)[
  #for x in data.extras [#x \ ]
]}
