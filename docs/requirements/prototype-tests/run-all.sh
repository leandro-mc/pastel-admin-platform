#!/usr/bin/env bash
# Ejecuta todas las comprobaciones de los prototipos. Requisitos: Node 20+ y `npm install` en esta carpeta.
# Las pruebas de Python (límites de CV, auditoría ATS, estrés) están en ../huella/cv-spec/README.md
set -u
cd "$(dirname "$0")"
R=..
fail=0
run() { echo; echo "── $1"; shift; "$@" || fail=1; }
run "Cosecha · algoritmo de reparto (casos 1–5 del plan de pruebas del MVP + propiedades)" node $R/cosecha/prototype-operacion/allocation.test.js
run "Cosecha · operación"     node smoke.js $R/cosecha/prototype-operacion t-operacion.js
run "Cosecha · mercado"       node smoke.js $R/cosecha/prototype-mercado   t-mercado.js
run "Huella · perfil público" node smoke.js $R/huella/prototype-perfil     t-perfil.js
run "Huella · estudio de CV"  node smoke.js $R/huella/prototype-estudio    t-estudio.js
run "Ágora"                   node smoke.js $R/agora/prototype             t-agora.js
echo; [ $fail -eq 0 ] && echo "TODO EN VERDE" || echo "HAY FALLOS"
exit $fail
