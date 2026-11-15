// Huella · plantilla CV v2 (Typst). ATS-estricta Y bien diseñada.
// Una columna · texto real · sin tablas/iconos/imágenes/cajas · ligaduras desactivadas · contacto en el cuerpo.
// Diseño: una familia (Source Sans 3, 4 pesos) · UN acento sobrio (verde azulado) solo en nombre, títulos y viñetas · cuerpo casi negro.
// El contenido llega SIEMPRE como JSON validado (la IA nunca escribe código de plantilla).
#let data = json("cv.json")
#let L = data.at("layout", default: (:))
#let fs = L.at("fontSize", default: 10.5) * 1pt
#let accent = rgb("#0F4C5C")
#let ink = rgb("#1B1F23")
#let muted = rgb("#4A5560")
#set page(paper: L.at("paper", default: "us-letter"), margin: (x: 0.7in, y: 0.6in))
#set text(font: ("Source Sans 3", "Liberation Sans", "DejaVu Sans"), size: fs, lang: data.lang,
          ligatures: false, discretionary-ligatures: false, fill: ink)
#set par(leading: 0.52em, spacing: 0.5em, justify: false)
#set document(title: data.name + " - " + data.headline, author: data.name)
#set list(marker: text(fill: accent)[•], indent: 3pt, body-indent: 6pt, spacing: 0.42em)

// Enlaces: el texto visible es SIEMPRE la URL/correo completo (lo que lee el ATS); además es clicable.
#let lnk(s) = {
  if s.contains("@") { link("mailto:" + s)[#s] }
  else if (s.contains("/") and s.contains(".")) or s.starts-with("www") { link("https://" + s)[#s] }
  else [#s]
}
#let section(title, body) = {
  v(0.95em, weak: true)
  block(sticky: true, below: 0.6em)[
    #smallcaps(text(weight: "semibold", size: fs * 1.02, fill: accent, tracking: 0.07em)[#title])
    #v(-0.45em)
    #line(length: 100%, stroke: 0.6pt + accent)
  ]
  body
}
// Fecha a la derecha en la MISMA línea (espacio flexible): el orden de lectura se conserva al extraer el texto.
#let row(left, right) = [#left #h(1fr) #text(fill: muted)[#right]]

// ── Cabecera (en el cuerpo de la página, nunca en header/footer del documento) ──
#align(left)[
  #text(size: fs * 2.1, weight: "bold", fill: accent, tracking: -0.01em)[#data.name] \
  #v(-0.1em)
  #text(size: fs * 1.12, weight: "semibold", fill: muted)[#data.headline] \
  #v(0.15em)
  #text(size: fs * 0.97)[#data.contact_l1.map(lnk).join([ · ])]
  #if data.contact_l2.len() > 0 [ \ #text(size: fs * 0.97)[#data.contact_l2.map(lnk).join([ · ])] ]
]
#v(0.35em)

#if data.summary != "" { section(data.labels.summary)[#data.summary] }

#section(data.labels.skills)[
  #for g in data.skills [#text(weight: "semibold")[#g.group:] #g.items.join(", ") \ ]
]

#section(data.labels.experience)[
  #for e in data.experience [
    #block(sticky: true, below: 0.35em)[#row[#text(weight: "semibold")[#e.role], #e.company#if e.location != "" [, #e.location]][#e.dates]]
    #if e.bullets.len() > 0 { list(..e.bullets) }
    #v(0.5em)
  ]
]

#if data.projects.len() > 0 { section(data.labels.projects)[
  #for p in data.projects [
    #block(sticky: true, below: 0.35em)[#row[#text(weight: "semibold")[#p.name] | #p.stack][#{ let k = p.at("link", default: ""); if k != "" { lnk(k) } }]]
    #list(..p.bullets)
    #v(0.45em)
  ]
]}

#section(data.labels.education)[
  #for ed in data.education [
    #row[#text(weight: "semibold")[#ed.degree], #ed.school][#ed.dates] \
    #if ed.at("detail", default: "") != "" [#text(fill: muted)[#ed.detail] \ ]
    #v(0.25em)
  ]
]

#if data.extras.len() > 0 { section(data.labels.extras)[
  #for x in data.extras [#x \ ]
]}
