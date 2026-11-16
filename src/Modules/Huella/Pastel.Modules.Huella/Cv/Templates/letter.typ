// Plantilla fija de la carta de presentación de Huella (CCR-2). Los datos llegan SOLO por data.json: cada cadena se imprime
// como texto y nunca se evalúa como marcado ni código. Carta formal compacta que cabe en UNA página: arriba el nombre con la
// fecha a la derecha y el país o la ciudad; después destinatario, asunto y saludo (medio renglón entre bloques); un renglón
// en blanco antes del cuerpo (sangría de primera línea y texto justificado) y otro antes de la despedida; y al pie, bajo el
// nombre de la firma, el correo y el teléfono. Times New Roman o Arial (en el PDF, sus equivalentes libres con las mismas
// medidas: Liberation Serif y Liberation Sans). Las medidas son las que supone LetterLayout para garantizar una sola hoja.
#let d = json("data.json")

#set document(title: d.title, author: d.signature)
#set page(
  paper: if d.paper == "a4" { "a4" } else { "us-letter" },
  margin: (x: 2.5cm, y: 2cm),
)
#set text(font: d.font, size: d.size * 1pt, lang: d.lang, ligatures: false, hyphenate: false)
// Entre renglones y entre bloques hay la misma distancia, así un «renglón en blanco» mide exactamente un renglón.
#set par(leading: 0.65em, spacing: 0.65em, justify: false)

#let blank = par[~]
// Medio renglón entre los bloques del encabezado.
#let half = v(0.6em)

// Nombre a la izquierda y fecha a la derecha, en el mismo renglón; debajo, el país o la ciudad.
#grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  align: (left, right),
  text(weight: "bold", d.signature),
  if d.date != "" { d.date } else { [] },
)
#if d.location != "" { par(d.location) }

// Destinatario, asunto y saludo.
#if d.recipient.len() > 0 { half; for line in d.recipient { par(line) } }
#if d.subject != "" { half; par(text(weight: "bold", d.subjectLabel + " " + d.subject)) }
#half
#par(d.greeting)
#blank

// Cuerpo: sangría de primera línea en todos los párrafos y texto justificado.
#block[
  #set par(justify: true, first-line-indent: (amount: 1.25cm, all: true), spacing: 1.1em)
  #for p in d.paragraphs { par(p) }
]

// Despedida y firma, con un renglón en blanco antes de la despedida y espacio para firmar; el contacto, bajo el nombre.
#blank
#par(d.closing)
#blank
#blank
#par(text(weight: "bold", d.signature))
#if d.contact.len() > 0 { par(d.contact.join("  ·  ")) }
