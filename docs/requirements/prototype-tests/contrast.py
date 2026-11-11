#!/usr/bin/env python3
"""Verifica el contraste WCAG 2.x de los pares texto/fondo de las paletas de los prototipos (v2: incluye Estudio, CV, Cosecha unificado y barra de desarrollo).
Texto normal >= 4.5:1 (AA). Componentes de interfaz y texto grande >= 3:1.
Uso: python3 contrast.py   (código de salida != 0 si algún par falla)"""
import sys

def lum(h):
    h = h.lstrip("#"); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

# (app/tema, descripción, primer plano, fondo, mínimo)
T, UI = 4.5, 3.0
PAIRS = [
    # Ágora
    ("Ágora claro", "texto sobre fondo", "#18202b", "#edf0f4", T), ("Ágora claro", "texto sobre tarjeta", "#18202b", "#ffffff", T),
    ("Ágora claro", "texto secundario sobre tarjeta", "#586374", "#ffffff", T), ("Ágora claro", "texto secundario sobre fondo", "#586374", "#edf0f4", T),
    ("Ágora claro", "enlace/marca sobre tarjeta", "#1a5fb4", "#ffffff", T), ("Ágora claro", "botón (texto sobre marca)", "#ffffff", "#1a5fb4", T),
    ("Ágora claro", "marca sobre bloque suave", "#1a5fb4", "#e3edf9", T),
    ("Ágora claro", "sello verificado", "#0b6b52", "#dcf1ea", T), ("Ágora claro", "sello pendiente", "#7d4a00", "#fdf0d6", T), ("Ágora claro", "sello modificada", "#005f73", "#d9eef2", T),
    ("Ágora claro", "chip hechos sobre tarjeta", "#0b6b52", "#ffffff", T), ("Ágora claro", "chip análisis sobre tarjeta", "#005f73", "#ffffff", T), ("Ágora claro", "chip opinión sobre tarjeta", "#7d4a00", "#ffffff", T),
    ("Ágora oscuro", "texto sobre fondo", "#e8edf3", "#0f141b", T), ("Ágora oscuro", "texto sobre tarjeta", "#e8edf3", "#19202a", T), ("Ágora oscuro", "texto secundario sobre tarjeta", "#9aa7b8", "#19202a", T),
    ("Ágora oscuro", "enlace/marca sobre tarjeta", "#78b0f5", "#19202a", T), ("Ágora oscuro", "botón (texto sobre marca)", "#08131f", "#78b0f5", T),
    ("Ágora oscuro", "sello verificado", "#6fd1b2", "#12372f", T), ("Ágora oscuro", "sello pendiente", "#f0c070", "#3a2d12", T), ("Ágora oscuro", "sello modificada", "#6fd0e3", "#10333b", T),
    # Cosecha
    ("Cosecha claro", "texto sobre fondo", "#17201b", "#f3f5f1", T), ("Cosecha claro", "texto secundario sobre tarjeta", "#55625a", "#ffffff", T), ("Cosecha claro", "botón (texto sobre verde)", "#ffffff", "#1d6a43", T),
    ("Cosecha claro", "chip ok", "#1d6a43", "#dff0e6", T), ("Cosecha claro", "chip atención", "#8a5200", "#fdf0d6", T), ("Cosecha claro", "chip error", "#9b1c1c", "#fbe3e1", T), ("Cosecha claro", "acción sobre tarjeta", "#1d6a43", "#ffffff", T),
    ("Cosecha claro", "punto de marca (componente)", "#d1304a", "#f3f5f1", UI),
    ("Cosecha oscuro", "texto sobre tarjeta", "#eaf0ec", "#1b231e", T), ("Cosecha oscuro", "texto secundario", "#a9b6ae", "#1b231e", T), ("Cosecha oscuro", "botón (texto sobre verde)", "#0c1a12", "#5fc08a", T),
    ("Cosecha oscuro", "chip ok", "#5fc08a", "#183a28", T), ("Cosecha oscuro", "chip atención", "#f1bf6a", "#3a2e13", T), ("Cosecha oscuro", "chip error", "#ff9a94", "#3d1c1b", T),
    ("Cosecha campo", "texto en modo campo (negro sobre blanco)", "#000000", "#ffffff", T),
    # Huella
    ("Huella claro", "texto sobre papel", "#0d1117", "#f1f2f4", T), ("Huella claro", "texto secundario sobre papel", "#475060", "#f1f2f4", T), ("Huella claro", "marca sobre marcador", "#111111", "#ffe14d", T),
    ("Huella claro", "texto secundario sobre superficie (estudio)", "#4b5563", "#ffffff", T), ("Huella claro", "error (estudio)", "#a4161a", "#fde7e7", T), ("Huella claro", "ok (estudio)", "#0b6b3a", "#ffffff", T),
    ("Huella oscuro", "texto sobre papel", "#eceff4", "#0e1116", T), ("Huella oscuro", "texto secundario", "#a3adbb", "#0e1116", T), ("Huella oscuro", "texto secundario sobre superficie", "#a3adbb", "#161b22", T),
    ("Huella oscuro", "error (estudio)", "#ff9b9b", "#3a1a1c", T), ("Huella oscuro", "ok (estudio)", "#6fd49c", "#161b22", T),
    # Pares añadidos tras revisar el CSS (tres defectos reales corregidos: medidor del Estudio, aviso de Cosecha y error de Ágora en oscuro)
    ("Ágora claro", "error (contador, lista)", "#b3261e", "#ffffff", T), ("Ágora oscuro", "error (contador, lista)", "#ff9a94", "#19202a", T),
    ("Ágora oscuro", "marca sobre bloque suave", "#78b0f5", "#1b2a3f", T), ("Ágora oscuro", "texto secundario sobre fondo", "#9aa7b8", "#0f141b", T),
    ("Ágora", "vista previa de WhatsApp (nota)", "#406050", "#e7f6ec", T), ("Ágora", "vista previa de WhatsApp (texto)", "#12351f", "#e7f6ec", T),
    ("Estudio claro", "medidor tramo 1", "#ffffff", "#0d1117", T), ("Estudio claro", "medidor tramo 2", "#ffffff", "#2b3340", T), ("Estudio claro", "medidor tramo 3", "#ffffff", "#465062", T),
    ("Estudio claro", "medidor tramo 4", "#ffffff", "#5f6a7d", T), ("Estudio claro", "medidor tramo 5", "#111111", "#b9c0cc", T), ("Estudio claro", "medidor tramo 6", "#111111", "#d3d8e0", T),
    ("Estudio oscuro", "medidor tramo 1", "#111111", "#eceff4", T), ("Estudio oscuro", "medidor tramo 2", "#111111", "#c5cbd6", T), ("Estudio oscuro", "medidor tramo 3", "#111111", "#9aa3b2", T),
    ("Estudio oscuro", "medidor tramo 4", "#ffffff", "#3c4452", T), ("Estudio oscuro", "medidor tramo 5", "#ffffff", "#2b3340", T), ("Estudio oscuro", "medidor tramo 6", "#ffffff", "#1d242e", T),
    ("Estudio", "medidor tramo 7 (marcador)", "#111111", "#ffe14d", T),
    # ── v2: paletas nuevas ──
    ("Estudio claro", "etiqueta de respaldo (ok sobre ok-bg)", "#0b6b3a", "#dff3e6", T), ("Estudio oscuro", "etiqueta de respaldo (ok sobre ok-bg)", "#6fd49c", "#12301f", T),
    ("Estudio claro", "etiqueta de aviso (warn sobre warn-bg)", "#7d4a00", "#fdf0d6", T), ("Estudio oscuro", "etiqueta de aviso (warn sobre warn-bg)", "#f0c070", "#3a2d12", T),
    ("Estudio claro", "texto secundario sobre papel", "#4b5563", "#f1f2f4", T), ("Estudio claro", "error sobre papel", "#a4161a", "#f1f2f4", T), ("Estudio oscuro", "error sobre papel", "#ff9b9b", "#0e1116", T),
    ("CV (PDF/vista previa)", "acento sobre blanco (nombre y títulos)", "#0f4c5c", "#ffffff", T), ("CV (PDF/vista previa)", "texto principal sobre blanco", "#1b1f23", "#ffffff", T), ("CV (PDF/vista previa)", "texto apagado (fechas) sobre blanco", "#4a5560", "#ffffff", T),
    ("Cosecha claro", "texto sobre superficie suave", "#17201b", "#e8efe9", T), ("Cosecha claro", "encabezado de tabla (mut sobre soft)", "#55625a", "#e8efe9", T), ("Cosecha oscuro", "texto sobre superficie suave", "#eaf0ec", "#222d26", T), ("Cosecha oscuro", "encabezado de tabla (mut sobre soft)", "#a9b6ae", "#222d26", T),
    ("Cosecha claro", "texto secundario sobre fondo", "#55625a", "#f3f5f1", T), ("Cosecha oscuro", "texto secundario sobre fondo", "#a9b6ae", "#121714", T),
    ("Cosecha claro", "burbuja propia (ink sobre ok-bg)", "#17201b", "#dff0e6", T), ("Cosecha oscuro", "burbuja propia (ink sobre ok-bg)", "#eaf0ec", "#183a28", T),
    ("Cosecha claro", "interruptor activo (texto sobre ink)", "#f3f5f1", "#17201b", T), ("Cosecha oscuro", "interruptor activo (texto sobre ink)", "#121714", "#eaf0ec", T),
    ("Cosecha claro", "enlace sobre fondo", "#1d6a43", "#f3f5f1", T), ("Cosecha oscuro", "enlace sobre fondo", "#5fc08a", "#121714", T),
    ("Cosecha oscuro", "aviso (pill) sobre warn-bg", "#f1bf6a", "#3a2e13", T),
    ("Barra de desarrollo", "claro: texto sobre franja 1", "#4a3b00", "#fff3bf", T), ("Barra de desarrollo", "claro: texto sobre franja 2", "#4a3b00", "#fff9db", T), ("Barra de desarrollo", "oscuro: texto sobre franja 1", "#f6e7a0", "#3b3410", T), ("Barra de desarrollo", "oscuro: texto sobre franja 2", "#f6e7a0", "#2f2a0d", T),
    ("Huella perfil", "barra de propietaria (tinta sobre amarillo)", "#111111", "#ffe14d", T),

    # ── Brisa y Balance (v3). Las pares se generan abajo a partir de los tokens de cada paleta. ──
]
def mix(fg, bg, p):
    f = fg.lstrip("#"); b = bg.lstrip("#")
    return "#" + "".join("%02x" % round(int(f[i:i+2], 16) * p + int(b[i:i+2], 16) * (1 - p)) for i in (0, 2, 4))

def brisa_balance_pairs():
    out = []
    CARDS = ["#DDE8D5", "#DCEAF4", "#F5E9B9", "#F6DDCE", "#D4E9E1", "#E9E2D2", "#D1E7E5", "#F3D5C8", "#E5EDC8", "#D7E4F0"]
    # Brisa claro (tokens de prototype/styles.css)
    L = dict(bg="#f7f6f0", s="#fffefa", ink="#26313a", ink2="#445059", mut="#5b6670", acc="#416b52", on_acc="#ffffff", danger="#904b3c", danger_soft="#f8e8e3", warn="#7a5200", warn_soft="#f7efd9", ok="#2f6b3f", ok_soft="#e5f1e7", info="#2f5f86", info_soft="#e5eff7", soft="#e3f0e7", subtle="#eef4ee")
    D = dict(bg="#191b20", s="#22262d", raised="#2b313a", ink="#e9eae7", ink2="#c0c6cc", mut="#a2a9b1", acc="#8daa98", on_acc="#14181c", danger="#e8a08f", danger_soft="#422c2a", warn="#e3c47d", warn_soft="#3b3427", ok="#91c99a", ok_soft="#283b2d", info="#9ac2e0", info_soft="#293744", soft="#2a3636", subtle="#2b3632")
    for nm, k, v, bgs in (("Brisa claro", L, L, ("bg", "s", "soft", "subtle")), ("Brisa oscuro", D, D, ("bg", "s", "raised", "soft", "subtle"))):
        for b in bgs:
            out.append((nm, "texto sobre " + b, k["ink"], k[b], T)); out.append((nm, "texto secundario sobre " + b, k["ink2"], k[b], T)); out.append((nm, "texto tenue sobre " + b, k["mut"], k[b], T))
        out += [(nm, "acento sobre superficie", k["acc"], k["s"], T), (nm, "botón principal (texto sobre acento)", k["on_acc"], k["acc"], T),
                (nm, "error sobre superficie", k["danger"], k["s"], T), (nm, "error sobre fondo suave", k["danger"], k["danger_soft"], T), (nm, "aviso sobre fondo suave", k["warn"], k["warn_soft"], T),
                (nm, "éxito sobre fondo suave", k["ok"], k["ok_soft"], T), (nm, "información sobre fondo suave", k["info"], k["info_soft"], T)]
    for c in CARDS:
        out.append(("Brisa claro", "texto sobre tarjeta " + c, "#26342e", c, T))
        # Hallazgo de la v3: con el texto general (#e9eae7) 7 de 10 tarjetas oscuras quedaban entre 4,34 y 4,49:1 y el secundario (#c0c6cc) bajaba de 4,5:1.
        # Corrección: dentro de la tarjeta oscura el texto es #f7f8f5 y el secundario #eceff1 (la mezcla al 36 % de Android se conserva).
        out.append(("Brisa oscuro", "texto sobre tarjeta " + c + " (mezcla 36 %)", "#f7f8f5", mix(c, D["s"], .36), T))
        out.append(("Brisa oscuro", "texto secundario («Límite…») sobre tarjeta " + c, "#eceff1", mix(c, D["s"], .36), T))
    # Balance (tokens de prototype/styles.css)
    BL = dict(bg="#eef1f3", s="#ffffff", s2="#f4f6f7", ink="#14212b", mut="#4a5b69", brand="#0b6a6f", bink="#ffffff", bsoft="#dcf0ef", owe="#8a4a00", osoft="#fdebd0", bad="#a32d1f", bsoftbad="#fbe3df", warn="#7a5200", wsoft="#fbf0d4")
    BD = dict(bg="#0e151a", s="#16202a", s2="#1c2933", ink="#e7eef3", mut="#a9b8c4", brand="#5cc3c6", bink="#05191b", bsoft="#12383b", owe="#f2b866", osoft="#3a2a11", bad="#ff9d90", bsoftbad="#43201b", warn="#f0c070", wsoft="#3a2d12")
    for nm, k in (("Balance claro", BL), ("Balance oscuro", BD)):
        for b in ("bg", "s", "s2", "bsoft"):
            out.append((nm, "texto sobre " + b, k["ink"], k[b], T))
        for b in ("bg", "s", "s2"):
            out.append((nm, "texto secundario sobre " + b, k["mut"], k[b], T)); out.append((nm, "marca/«le deben» sobre " + b, k["brand"], k[b], T)); out.append((nm, "«debe» (ámbar) sobre " + b, k["owe"], k[b], T))
        out += [(nm, "marca sobre fondo de marca suave", k["brand"], k["bsoft"], T), (nm, "botón principal (texto sobre marca)", k["bink"], k["brand"], T), (nm, "«debe» sobre fondo ámbar suave", k["owe"], k["osoft"], T),
                (nm, "error sobre superficie", k["bad"], k["s"], T), (nm, "error sobre fondo suave", k["bad"], k["bsoftbad"], T), (nm, "grupo cerrado (aviso) sobre fondo suave", k["warn"], k["wsoft"], T),
                (nm, "texto en celda inválida de la hoja (tinta sobre fondo de error suave)", k["ink"], k["bsoftbad"], T), (nm, "borde de campo (componente) sobre superficie", k["mut"], k["s"], UI), (nm, "barra «a favor» sobre pista (componente)", k["brand"], k["s2"], UI), (nm, "barra «debe» sobre pista (componente)", k["owe"], k["s2"], UI),
                (nm, "foco (marca) sobre superficie (componente)", k["brand"], k["s"], UI), (nm, "aviso emergente (fondo sobre tinta)", k["bg"], k["ink"], T)]
    return out

PAIRS += brisa_balance_pairs()

def main():
    bad = 0
    for app, d, fg, bg, mn in PAIRS:
        r = ratio(fg, bg); ok = r >= mn; bad += not ok
        print(f"{'OK  ' if ok else 'FALLA'} {r:5.2f}:1 (mín {mn})  {app:15} {d:45} {fg} sobre {bg}")
    print(f"\n{len(PAIRS) - bad}/{len(PAIRS)} pares cumplen")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
