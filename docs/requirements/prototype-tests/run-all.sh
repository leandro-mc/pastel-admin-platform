#!/usr/bin/env bash
# Ejecuta todas las comprobaciones de los prototipos. Requisitos: Node 20+ y `npm install` en esta carpeta.
# Las pruebas de Python (límites de CV, auditoría ATS, estrés) están en ../huella/cv-spec/README.md
set -u
cd "$(dirname "$0")"
R=..
fail=0
run() { echo; echo "── $1"; shift; "$@" || fail=1; }
run "Cosecha · algoritmo de reparto (casos 1–5 del plan de pruebas del MVP + propiedades)" node $R/cosecha/prototype/allocation.test.js
run "Cosecha · app por roles" node smoke.js $R/cosecha/prototype t-cosecha.js
run "Cosecha · módulo Mercado" node smoke.js $R/cosecha/prototype t-mercado.js
run "Huella · perfil público" node smoke.js $R/huella/prototype-perfil     t-perfil.js
run "Huella · estudio de CV"  node smoke.js $R/huella/prototype-estudio    t-estudio.js
run "Ágora"                   node smoke.js $R/agora/prototype             t-agora.js
run "Contraste WCAG de las paletas" python3 contrast.py
run "Guías de Cosecha: cada captura abre en su rol y estado" node check-manuals.js
run "CV: auditoría ATS del PDF (11+ comprobaciones)" python3 ../huella/cv-spec/samples/run_ats_check.py
run "CV: Word verificado al leerlo de vuelta" python3 ../huella/cv-spec/samples/export_docx.py
run "CV: límites verificados (modelo de líneas)" bash -c "cd ../huella/cv-spec && python3 build_limits.py >/dev/null"
run "CV: estrés al máximo en el compilador real" python3 ../huella/cv-spec/samples/stress_test.py
echo; [ $fail -eq 0 ] && echo "TODO EN VERDE" || echo "HAY FALLOS"
exit $fail
