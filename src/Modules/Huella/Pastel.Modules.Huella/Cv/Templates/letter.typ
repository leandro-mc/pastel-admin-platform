// Plantilla fija de la carta de presentación de Huella (CCR-2). Los datos llegan SOLO por data.json: cada cadena se imprime
// como texto y nunca se evalúa como marcado ni código. Una página, texto real y el contacto en el cuerpo.
#let d = json("data.json")
#let muted = luma(80)

#set document(title: d.title, author: d.signature)
#set page(
  paper: if d.paper == "a4" { "a4" } else { "us-letter" },
  margin: (x: 2.2cm, top: 2cm, bottom: 2cm),
)
#set text(font: "Source Sans 3", size: 11pt, lang: d.lang, ligatures: false, hyphenate: false)
#set par(justify: false, leading: 0.72em, spacing: 1.3em)

#block(below: 1.8em)[
  #text(size: 17pt, weight: "bold", d.signature)
  #if d.contact.len() > 0 [ \ #text(fill: muted, d.contact.join("  ·  ")) ]
]
#if d.subject != "" { block(below: 1.3em, text(weight: "semibold", d.subject)) }
#par(d.greeting)
#for p in d.paragraphs { par(p) }
#par(d.closing)
#v(0.4em)
#text(weight: "semibold", d.signature)
