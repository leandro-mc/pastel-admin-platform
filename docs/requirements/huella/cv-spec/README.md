# cv-spec · límites, plantilla v2, Word y auditoría ATS

Todo es **ejecutable**: las cifras de los documentos salen de aquí.

| Archivo | Para qué |
|---|---|
| `build_limits.py` | Modelo de **presupuesto de líneas (LU)** por nivel y papel; falla (≠ 0) si algún nivel puede desbordar. Escribe `limits.json` |
| `limits.json` | Topes por elemento, presupuesto por sección y cupo (lo usa el prototipo del Estudio) |
| `template/cv-ats.typ` | Plantilla **Typst v2**: una columna, texto real, sin tablas/iconos, ligaduras desactivadas, **un acento sobrio** (verde azulado) solo en nombre, títulos y viñetas, títulos en versalitas con filete, fechas apagadas a la derecha en la misma línea, contacto en dos líneas |
| `fonts/` | **Source Sans 3** (Regular, Italic, Semibold, Bold) con su licencia **SIL OFL 1.1** |
| `samples/mid-qa-fullstack.json` | CV de ejemplo (**persona ficticia**) |
| `samples/*.pdf`, `samples/*.docx`, `samples/preview/*.png` | Salidas de ejemplo (PDF, Word y vista PNG para revisar el diseño) |
| `samples/run_ats_check.py` | Compila y **audita como un parser**: texto, orden, fuente real embebida con ToUnicode, sin ligaduras, cabecera ≤ 2 líneas de contacto, **detalle de Educación en su propia línea (regresión de la v1)** |
| `samples/export_docx.py` | Exporta el **mismo JSON a Word** ATS-estricto (Calibri, títulos reales, viñetas reales, sin tablas) y lo **lee de vuelta** para verificar |
| `samples/stress_test.py` | Rellena cada nivel al **máximo de todos sus límites** y mide las páginas reales con la fuente final |
| `samples/render_preview.py` | Genera PNG del PDF para **revisar el diseño a ojo** |

```bash
pip install typst python-docx          # y poppler-utils (pdftotext, pdfinfo, pdffonts)
cd docs/requirements/huella/cv-spec
python3 build_limits.py && python3 samples/run_ats_check.py && python3 samples/export_docx.py && python3 samples/stress_test.py
```

## Resultados (2026-10-24)
- Límites: Junior **50/50 LU** (Carta; holgura 0 a propósito, perfil de **3 líneas**) · Mid 85/97 · Senior 91/101; A4 cupos 53/103/109.
- Auditoría ATS **14/14**; Word **9/9**; estrés **6/6** (1 · 2 · 2 páginas) con la fuente real.
- **Diseño:** la v1 parecía plantilla de Word por defecto (fuente tipo Arial, un solo peso, sin acento, espaciado apretado) y tenía un defecto en Educación; la v2 se revisó **renderizada** (`samples/preview/`).

## Limitaciones
No probado en ATS comerciales (solo capa de texto del PDF y lectura del Word). El garante final en producción es el conteo de páginas del compilador (escalera de ajuste, `REQUERIMIENTOS-HUELLA.md` §7.6).
