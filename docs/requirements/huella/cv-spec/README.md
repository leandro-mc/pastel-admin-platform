# cv-spec · límites, plantilla y auditoría ATS del CV

Todo esto es **ejecutable**: las cifras del documento de requerimientos salen de aquí, no de la intuición.

| Archivo | Para qué |
|---|---|
| `build_limits.py` | Modelo de **presupuesto de líneas (LU)** por nivel y papel. Falla (código ≠ 0) si algún nivel puede desbordar su página en el peor caso. Escribe `limits.json` |
| `limits.json` | Salida del anterior: topes por elemento, presupuesto por sección, cupo por nivel/papel. Lo consumen el prototipo del Estudio y, en producción, el validador |
| `template/cv-ats.typ` | Plantilla **Typst** ATS-estricta (una columna, sin tablas/iconos, ligaduras desactivadas, contacto en el cuerpo). El contenido entra solo como JSON |
| `samples/mid-qa-fullstack.json` | CV de ejemplo (**persona ficticia**) |
| `samples/mid-qa-fullstack.pdf` | PDF compilado con la plantilla (lo descarga el perfil público del prototipo) |
| `samples/run_ats_check.py` | Compila la muestra y la **audita como un parser**: texto extraíble, orden de lectura, fechas en la misma línea, viñetas íntegras, sin ligaduras Unicode, fuentes con ToUnicode |
| `samples/stress_test.py` | Rellena **cada nivel al máximo de todos sus límites a la vez** y mide las páginas reales del compilador |

## Cómo ejecutar
```bash
pip install typst                  # compilador Typst (paquete de Python)
sudo apt-get install poppler-utils # pdftotext, pdfinfo, pdffonts
cd docs/requirements/huella/cv-spec
python3 build_limits.py            # 6 combinaciones (3 niveles × Carta/A4): todas OK
python3 samples/run_ats_check.py   # 11 comprobaciones ATS: todas OK
python3 samples/stress_test.py     # 6 combinaciones al máximo: todas caben en su cupo
```

## Resultados del levantamiento (2026-10-23)
- `build_limits.py`: Junior 49/50 LU (Carta) · Mid 85/97 · Senior 91/101; en A4 53/103/109 de cupo. Dos errores de la primera versión se encontraron con este verificador (Junior desbordaba; un bullet de Senior no cabía en 2 líneas en A4).
- `run_ats_check.py`: 11/11. Un hallazgo real: con 5 elementos de contacto la línea se parte en dos → la cabecera se presupuesta en 2 líneas (5,5 LU).
- `stress_test.py`: los 6 casos caben (1/2/2 páginas) — con *Liberation Sans*, más ancha que la fuente final, así que es una prueba conservadora.

## Limitaciones honestas
No se probó contra ATS comerciales (Workday, Greenhouse, etc.), solo contra la capa de texto del PDF. El relleno sintético del estrés no siempre llena cada viñeta con exactamente 2 líneas. El garante final en producción es el conteo de páginas del compilador (escalera de ajuste, `REQUERIMIENTOS-HUELLA.md` §7.6).
