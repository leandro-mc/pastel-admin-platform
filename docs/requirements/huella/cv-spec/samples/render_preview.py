#!/usr/bin/env python3
"""Genera PDF + PNG por página de una muestra, para revisar el diseño a ojo. Uso: python3 render_preview.py [muestra.json] [ppi]"""
import pathlib, shutil, sys, tempfile
import typst
root = pathlib.Path(__file__).resolve().parent.parent
sample = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "samples/mid-qa-fullstack.json"
ppi = float(sys.argv[2]) if len(sys.argv) > 2 else 110
out = root / "samples" / "preview"; out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as td:
    td = pathlib.Path(td); shutil.copy(root / "template/cv-ats.typ", td / "cv.typ"); shutil.copy(sample, td / "cv.json")
    typst.compile(str(td / "cv.typ"), output=str(out / f"{sample.stem}-{{p}}.png"), format="png", ppi=ppi, font_paths=[str(root / "fonts")])
print(sorted(p.name for p in out.glob(sample.stem + "-*.png")))
