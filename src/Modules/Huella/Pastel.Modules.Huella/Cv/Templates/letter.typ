// Plantilla fija de la carta de presentación de Huella (CCR-2). Los datos llegan SOLO por data.json: cada cadena se imprime
// como texto y nunca se evalúa como marcado ni código. Forma de carta formal: remitente, fecha, destinatario, asunto,
// saludo, cuerpo con sangría y texto justificado, despedida y firma, con un renglón en blanco entre bloques. Times New Roman
// o Arial (en el PDF, sus equivalentes libres con las mismas medidas: Liberation Serif y Liberation Sans).
#let d = json("data.json")

#set document(title: d.title, author: d.signature)
#set page(
  paper: if d.paper == "a4" { "a4" } else { "us-letter" },
  margin: (x: 2.5cm, y: 2.5cm),
)
#set text(font: d.font, size: d.size * 1pt, lang: d.lang, ligatures: false, hyphenate: false)
// Entre renglones y entre bloques hay la misma distancia, así un «renglón en blanco» mide exactamente un renglón.
#set par(leading: 0.65em, spacing: 0.65em, justify: false)

#let blank = par[~]

// Remitente: nombre y datos de contacto, una línea cada uno.
#par(text(weight: "bold", d.signature))
#for line in d.contact { par(line) }

// Fecha y destinatario.
#if d.date != "" { blank; par(d.date) }
#if d.recipient.len() > 0 { blank; for line in d.recipient { par(line) } }

// Asunto y saludo.
#if d.subject != "" { blank; par(text(weight: "bold", d.subjectLabel + " " + d.subject)) }
#blank
#par(d.greeting)
#blank

// Cuerpo: sangría de primera línea en todos los párrafos y texto justificado.
#block[
  #set par(justify: true, first-line-indent: (amount: 1.25cm, all: true), spacing: 1.1em)
  #for p in d.paragraphs { par(p) }
]

// Despedida y firma, con un renglón en blanco antes de la despedida y espacio para firmar.
#blank
#par(d.closing)
#blank
#blank
#blank
#par(text(weight: "bold", d.signature))
