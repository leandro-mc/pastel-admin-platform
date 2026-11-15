#!/usr/bin/env python3
"""Compila una muestra con Typst y la audita como un parser ATS:
texto extraíble, orden de lectura, contacto, viñetas completas, fuentes con ToUnicode, páginas.
Requiere: pip install typst  ·  poppler-utils (pdftotext, pdfinfo, pdffonts)."""
import json, re, shutil, subprocess, sys, tempfile, pathlib
import typst

root = pathlib.Path(__file__).resolve().parent.parent
sample = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / "samples/mid-qa-fullstack.json")

with tempfile.TemporaryDirectory() as td:
    td = pathlib.Path(td)
    shutil.copy(root / "template/cv-ats.typ", td / "cv.typ")
    shutil.copy(sample, td / "cv.json")
    typst.compile(str(td / "cv.typ"), output=str(td / "cv.pdf"), font_paths=[str(root / "fonts")])
    pdf = td / "cv.pdf"
    shutil.copy(pdf, root / "samples" / (sample.stem + ".pdf"))
    run = lambda *a: subprocess.run(list(a), capture_output=True, text=True).stdout
    txt = run("pdftotext", "-layout", str(pdf), "-")
    pages = int(re.search(r"Pages:\s+(\d+)", run("pdfinfo", str(pdf))).group(1))
    fonts = run("pdffonts", str(pdf))

d = json.loads(sample.read_text(encoding="utf-8"))
flat = lambda s: re.sub(r"\s+", " ", s)
t = flat(txt)
font_rows = [ln for ln in fonts.splitlines()[2:] if ln.strip()]
checks = {
    "páginas (esperado 1 para esta muestra)": pages == 1,
    "nombre extraíble": flat(d["name"]) in t,
    "correo extraíble": d["contact_l1"][1] in t,
    "teléfono extraíble": d["contact_l1"][2] in t,
    "encabezados estándar presentes": all(d["labels"][k] in t for k in ("skills", "experience", "education")),
    "viñetas '•' presentes": txt.count("•") >= 5,
    "sin ligaduras Unicode (ﬁ ﬂ ﬀ)": not re.search("[\ufb00-\ufb06]", txt),
    "todas las viñetas completas y sin cortes": all(flat(b) in t for e in d["experience"] for b in e["bullets"]),
    "fuentes embebidas con ToUnicode (emb=yes uni=yes)": bool(font_rows) and all(
        (m := re.search(r"\s(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$", ln)) and m.group(1) == "yes" and m.group(3) == "yes"
        for ln in font_rows),
    "usa la fuente prevista (Source Sans 3), no una sustituta": "SourceSans3" in fonts and "Liberation" not in fonts,
    "cabecera = nombre + titular + contacto en ≤ 2 líneas": (lambda ls: ls.index(next(l for l in ls if d["labels"]["summary"].lower() in l.lower())) <= 4)([l for l in txt.splitlines() if l.strip()]),
    "Educación: el detalle va en su propia línea (regresión v1)": any("Énfasis" in l and "2016" not in l for l in txt.splitlines()),
    "orden: Habilidades < Experiencia < Educación": t.index(d["labels"]["skills"]) < t.index(d["labels"]["experience"]) < t.index(d["labels"]["education"]),
    "fecha en la misma línea que el cargo": bool(re.search(r"QA Automation Engineer.*Mar 2022 - Presente", txt)),
}
for k, v in checks.items():
    print(("OK   " if v else "FAIL ") + k)
print(f"\npáginas reales: {pages}\n--- fuentes ---\n{fonts}\n--- extracción (primeras 16 líneas) ---")
print("\n".join(txt.splitlines()[:16]))
sys.exit(0 if all(checks.values()) else 1)
