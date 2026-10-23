#!/usr/bin/env python3
"""Prueba de estrés de límites: rellena CADA nivel con contenido en su máximo duro
(todas las secciones al tope a la vez, texto realista) y mide las páginas reales
que produce el compilador. Si algún nivel excede su cupo, el límite es inválido."""
import json, pathlib, random, re, shutil, subprocess, sys, tempfile
import typst

root = pathlib.Path(__file__).resolve().parent.parent
limits = json.loads((root / "limits.json").read_text(encoding="utf-8"))
F = limits["_meta"]["fixed"]
WORDS = ("implementé automaticé diseñé integré reduje lideré migré optimicé coordiné documenté "
         "servicio pruebas despliegue módulo cliente rendimiento arquitectura incidentes equipo "
         "API base de datos pipeline monitoreo usuarios reportes seguridad facturación inventario "
         "con para sobre en el la los del una 35% 12 140 3x").split()
rnd = random.Random(7)


def text_of(n, minimum=None):
    """Texto realista de EXACTAMENTE <= n caracteres (el mayor posible), sin cortar palabras."""
    out = ""
    while True:
        w = rnd.choice(WORDS)
        nxt = (out + " " + w).strip()
        if len(nxt) > n:
            break
        out = nxt
    return out[0].upper() + out[1:] + ("." if len(out) < n else "")


def build(level, p):
    n_entries = p["entries"]
    exp = []
    for i in range(n_entries):
        lines = p["entry_bullet_lines"][i]
        bullets = []
        left = lines
        while left > 0:
            bullets.append(text_of(p["bullet_max"]))
            left -= 2  # cada viñeta al máximo ocupa 2 líneas
        exp.append(dict(role=text_of(34)[:34].rstrip(" ."), company=text_of(F["role_company_max"] - 36)[:30].rstrip(" ."),
                        location="San José, CR", dates="Mar 2022 - Presente", bullets=bullets[: max(0, (lines + 1) // 2)]))
    projects = [dict(name=text_of(24)[:24].rstrip(" ."), stack=text_of(p["project_title_chars"] - 30)[:40],
                     link="github.com/ejemplo/proyecto", bullets=[text_of(p["bullet_max"]) for _ in range(max(1, p["project_bullet_lines"][i] // 2))])
                for i in range(p["projects"])]
    skills = [dict(group=text_of(F["group_label_max"])[:20].rstrip(" ."), items=[text_of(14)[:14] for _ in range(max(1, p["skills_group_chars"] // 16))])
              for _ in range(p["skills_groups"])]
    # recortar cada grupo a skills_group_chars
    for g in skills:
        while len(g["group"]) + 2 + len(", ".join(g["items"])) > p["skills_group_chars"]:
            g["items"].pop()
    education = [dict(degree=text_of(50)[:50].rstrip(" ."), school=text_of(16)[:16].rstrip(" ."), dates="2016 - 2020",
                      detail=text_of(p["education_detail_chars"]) if p["education_detail_lines"][i] else "")
                 for i in range(p["education"])]
    extras = [text_of(88) for _ in range(p["extras_lines"])]
    return {
        "lang": "es", "layout": {"fontSize": p["font"], "paper": "us-letter" if PAPER == "letter" else "a4"},
        "name": text_of(F["name_max"])[:F["name_max"]].rstrip(" ."), "headline": text_of(F["headline_max"])[:F["headline_max"]].rstrip(" ."),
        "contact": [text_of(34)[:34], text_of(34)[:34], text_of(34)[:34], text_of(34)[:34], text_of(34)[:34]],
        "labels": {"summary": "Perfil profesional", "skills": "Habilidades técnicas", "experience": "Experiencia laboral",
                   "projects": "Proyectos", "education": "Educación", "extras": "Certificaciones e idiomas"},
        "summary": text_of(p["summary_chars"]), "skills": skills, "experience": exp, "projects": projects,
        "education": education, "extras": extras,
    }


def pages_of(data):
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        shutil.copy(root / "template/cv-ats.typ", td / "cv.typ")
        (td / "cv.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        typst.compile(str(td / "cv.typ"), output=str(td / "cv.pdf"))
        info = subprocess.run(["pdfinfo", str(td / "cv.pdf")], capture_output=True, text=True).stdout
        return int(re.search(r"Pages:\s+(\d+)", info).group(1))


ok = True
print(f"{'nivel':8}{'papel':8}{'cupo':>5}{'real':>6}  resultado")
for PAPER in ("letter", "a4"):
    for level, p in limits[PAPER].items():
        real = pages_of(build(level, p))
        good = real <= p["pages"]
        ok &= good
        print(f"{level:8}{PAPER:8}{p['pages']:>5}{real:>6}  {'OK  cabe en el cupo' if good else 'FALLA  excede el cupo'}")
sys.exit(0 if ok else 1)
