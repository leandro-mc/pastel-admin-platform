#!/usr/bin/env python3
"""Verifica el contraste WCAG 2.x de los pares texto/fondo de las paletas de los prototipos.
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
]

def main():
    bad = 0
    for app, d, fg, bg, mn in PAIRS:
        r = ratio(fg, bg); ok = r >= mn; bad += not ok
        print(f"{'OK  ' if ok else 'FALLA'} {r:5.2f}:1 (mín {mn})  {app:15} {d:45} {fg} sobre {bg}")
    print(f"\n{len(PAIRS) - bad}/{len(PAIRS)} pares cumplen")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
