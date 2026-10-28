#!/usr/bin/env python3
"""Genera manuales HTML a partir de Markdown. Las «capturas» son el PROPIO prototipo incrustado en un marco, abierto ya en el rol y estado indicados,
así nunca quedan desactualizadas respecto al prototipo. Directiva:
  :::shot role=acopio view=recepcion mode=mobile|desktop theme=light sub=caja offline=1 script="click:[data-a='ops:queue']" caption="Texto"
Uso: python3 build_manuals.py   ->  html/*.html"""
import html, pathlib, re, shlex, urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "html"; OUT.mkdir(exist_ok=True)
PROTO = "../../prototype/index.html"
CSS = """:root{color-scheme:light dark;--bg:light-dark(#f6f7f4,#141916);--s:light-dark(#fff,#1d2520);--ink:light-dark(#17201b,#eaf0ec);--mut:light-dark(#55625a,#a9b6ae);--line:light-dark(#d5dcd3,#34423a);--go:light-dark(#1d6a43,#5fc08a);--soft:light-dark(#e8efe9,#222d26)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 1.08rem/1.6 "Public Sans",system-ui,sans-serif}a{color:var(--go)}
.wrap{max-width:62rem;margin:0 auto;padding:1.5rem 1.2rem 4rem;display:grid;grid-template-columns:14rem minmax(0,1fr);gap:2rem}nav.toc{position:sticky;top:1rem;align-self:start;font-size:.92rem}nav.toc a{display:block;padding:.25rem 0;text-decoration:none}nav.toc b{display:block;margin-bottom:.4rem}
h1{font-size:2rem;line-height:1.15;margin:.2rem 0 .4rem}h2{font-size:1.4rem;margin:2.2rem 0 .4rem;border-top:2px solid var(--ink);padding-top:.6rem}h3{font-size:1.1rem;margin:1.4rem 0 .2rem}p,li{max-width:46rem}.lead{font-size:1.2rem;color:var(--mut)}
li{margin:.25rem 0}code{background:var(--soft);padding:0 .3rem;border-radius:4px;font-size:.92em}.note{border-left:5px solid var(--go);background:var(--soft);padding:.6rem 1rem;margin:1rem 0}.warn{border-left-color:#b8860b}
figure{margin:1.2rem 0;padding:0}.frame{display:inline-block;border:3px solid var(--ink);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 6px 22px #0003;vertical-align:top}.frame.mobile{border-radius:26px}.frame iframe{border:0;transform-origin:0 0;display:block}
figcaption{font-size:.92rem;color:var(--mut);margin-top:.5rem;max-width:46rem}.hint{font-size:.85rem;color:var(--mut)}
@media (max-width:820px){.wrap{grid-template-columns:1fr}nav.toc{position:static}}@media print{nav.toc,.hint{display:none}.frame{break-inside:avoid}.wrap{display:block}}"""
def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t); t = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*", r"<i>\1</i>", t)
    return re.sub(r"`(.+?)`", r"<code>\1</code>", t)
def shot(line):
    a = dict(tok.split("=", 1) for tok in shlex.split(line[len(":::shot"):]) if "=" in tok)
    mob = a.get("mode", "desktop") == "mobile"; w, h, sc = (390, 780, 0.78) if mob else (1180, 700, 0.62)
    q = {"role": a.get("role", "owner"), "dev": "0", "theme": a.get("theme", "light")}
    for k in ("view", "sub", "offline", "field", "script"):
        if k in a: q[k] = a[k]
    src = PROTO + "?" + urllib.parse.urlencode(q, quote_via=urllib.parse.quote)
    cap = f"<figcaption>{inline(a['caption'])}</figcaption>" if "caption" in a else ""
    return (f'<figure><div class="frame {"mobile" if mob else ""}" style="width:{int(w*sc)}px;height:{int(h*sc)}px"><iframe src="{html.escape(src)}" title="{html.escape(a.get("caption", "Pantalla"))}" width="{w}" height="{h}" loading="lazy" '
            f'style="width:{w}px;height:{h}px;transform:scale({sc})"></iframe></div>{cap}</figure>')
def render(md):
    out, toc, i, L = [], [], 0, md.split("\n")
    while i < len(L):
        ln = L[i].rstrip()
        if not ln: i += 1; continue
        if ln.startswith(":::shot"): out.append(shot(ln)); i += 1; continue
        m = re.match(r"^(#{1,3})\s+(.*)", ln)
        if m:
            n = len(m.group(1)); t = m.group(2); slug = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
            if n == 2: toc.append((slug, t))
            out.append(f'<h{n} id="{slug}">{inline(t)}</h{n}>'); i += 1; continue
        if ln.startswith(">"):
            warn = ln[1:].strip().startswith("⚠"); out.append(f'<div class="note {"warn" if warn else ""}">{inline(ln[1:].strip())}</div>'); i += 1; continue
        if re.match(r"^(-|\d+\.)\s", ln):
            ordered = ln[0].isdigit(); items = []
            while i < len(L) and re.match(r"^(-|\d+\.)\s", L[i]): items.append(re.sub(r"^(-|\d+\.)\s+", "", L[i].rstrip())); i += 1
            tag = "ol" if ordered else "ul"; out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>"); continue
        para = [ln]; i += 1
        while i < len(L) and L[i].strip() and not re.match(r"^(#|:::|>|-\s|\d+\.\s)", L[i]): para.append(L[i].rstrip()); i += 1
        out.append(f"<p>{inline(' '.join(para))}</p>")
    return "\n".join(out), toc
def page(title, body, toc, others):
    nav = "".join(f'<a href="#{s}">{html.escape(t)}</a>' for s, t in toc)
    more = "".join(f'<a href="{f}">{html.escape(n)}</a>' for f, n in others)
    return f'<!doctype html><html lang="es-CR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{html.escape(title)}</title><link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"><style>{CSS}</style></head><body><div class="wrap"><nav class="toc" aria-label="Contenido"><b>En esta guía</b>{nav}<hr><b>Otras guías</b>{more}</nav><main>{body}<p class="hint">Las pantallas de esta guía son el propio prototipo (datos ficticios), abierto en el rol que corresponde. Haga clic dentro de ellas para probarlas.</p></main></div></body></html>'
def main():
    files = sorted(p for p in HERE.glob("[0-9]*.md")); meta = []
    for p in files:
        md = p.read_text(encoding="utf-8"); title = re.search(r"^#\s+(.*)", md, re.M).group(1); meta.append((p.stem + ".html", title))
    for p in files:
        body, toc = render(p.read_text(encoding="utf-8")); title = [t for f, t in meta if f == p.stem + ".html"][0]
        (OUT / (p.stem + ".html")).write_text(page(title, body, toc, [m for m in meta if m[0] != p.stem + ".html"] + [("index.html", "Índice de guías")]), encoding="utf-8")
    idx = "<h1>Guías de uso de Cosecha</h1><p class=lead>Una guía por rol, con las pantallas reales del prototipo. Empiece por la suya.</p><ul>" + "".join(f'<li><a href="{f}">{html.escape(t)}</a></li>' for f, t in meta) + "</ul>"
    (OUT / "index.html").write_text(page("Guías de uso de Cosecha", idx, [], []), encoding="utf-8")
    print(f"{len(files)} guías + índice en {OUT}")
if __name__ == "__main__": main()
