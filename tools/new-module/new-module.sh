#!/usr/bin/env bash
# Genera el esqueleto de un módulo de Pastel (backend, pruebas vacías, frontend y fichas MODULE.md).
# Uso: tools/new-module/new-module.sh <codigo> "<Nombre>" [--icon <IconoLucide>] [--order <n>] [--tagline "<frase>"]
#                                      [--access permission|authenticated|public] [--no-slnx]
# Ejemplo: tools/new-module/new-module.sh cosecha "Cosecha" --icon Sprout --order 40 --tagline "De la finca al comprador"
set -euo pipefail

usage() { sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-1}"; }

[ $# -ge 2 ] || usage 1
CODE="$1"; NAME="$2"; shift 2
ICON="LayoutGrid"; ORDER="100"; TAGLINE="Próximamente"; ACCESS="permission"; REGISTER_SLNX=1
while [ $# -gt 0 ]; do
  case "$1" in
    --icon) ICON="${2:?falta el icono}"; shift 2 ;;
    --order) ORDER="${2:?falta el orden}"; shift 2 ;;
    --tagline) TAGLINE="${2:?falta la frase}"; shift 2 ;;
    --access) ACCESS="${2:?falta el acceso}"; shift 2 ;;
    --no-slnx) REGISTER_SLNX=0; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage 1 ;;
  esac
done

[[ "$CODE" =~ ^[a-z][a-z0-9]{1,31}$ ]] || { echo "El código debe ir en minúsculas y números (2 a 32 caracteres, empieza con letra)." >&2; exit 1; }
case "$CODE" in identity|auth|admin|api|health|platform|cuenta|configuracion|ingresar) echo "El código '$CODE' es una palabra reservada." >&2; exit 1 ;; esac
[[ "$ORDER" =~ ^[0-9]+$ ]] || { echo "--order debe ser un número entero." >&2; exit 1; }
case "$ACCESS" in permission|authenticated|public) ;; *) echo "--access debe ser permission, authenticated o public." >&2; exit 1 ;; esac
[[ "$ICON" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || { echo "El icono debe ser un identificador de Lucide (p. ej. Sprout)." >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PASCAL="$(printf '%s' "${CODE:0:1}" | tr '[:lower:]' '[:upper:]')${CODE:1}"
UPPER="$(printf '%s' "$CODE" | tr '[:lower:]' '[:upper:]')"
SORT=$((200 + ORDER))
BACKEND_DIR="$ROOT/src/Modules/$PASCAL"
WEB_DIR="$ROOT/web/src/modules/$CODE"

[ ! -e "$BACKEND_DIR" ] || { echo "Ya existe $BACKEND_DIR. No se sobrescribe." >&2; exit 1; }
[ ! -e "$WEB_DIR" ] || { echo "Ya existe $WEB_DIR. No se sobrescribe." >&2; exit 1; }

# Escapa un texto para usarlo como reemplazo de sed (delimitador |).
esc() { printf '%s' "$1" | sed -e 's/[\\|&]/\\&/g'; }

render() { # <carpeta de plantillas> <destino>
  local src="$1" dst="$2" file rel out
  while IFS= read -r -d '' file; do
    rel="${file#"$src"/}"; rel="${rel//__PASCAL__/$PASCAL}"; rel="${rel//__CODE__/$CODE}"; rel="${rel%.tmpl}"
    out="$dst/$rel"; mkdir -p "$(dirname "$out")"
    sed -e "s|__PASCAL__|$(esc "$PASCAL")|g" -e "s|__CODE__|$(esc "$CODE")|g" -e "s|__NAME__|$(esc "$NAME")|g" \
        -e "s|__UPPER__|$(esc "$UPPER")|g" -e "s|__ICON__|$(esc "$ICON")|g" -e "s|__ORDER__|$ORDER|g" -e "s|__SORT__|$SORT|g" \
        -e "s|__TAGLINE__|$(esc "$TAGLINE")|g" -e "s|__ACCESS__|$ACCESS|g" "$file" > "$out"
  done < <(find "$src" -type f -print0 | sort -z)
}

render "$HERE/templates/backend" "$BACKEND_DIR"
render "$HERE/templates/web" "$WEB_DIR"
# MODULE.md de backend va en la raíz del módulo; el de frontend ya quedó en su carpeta.

if [ "$REGISTER_SLNX" -eq 1 ]; then
  SLNX="$ROOT/Pastel.slnx"
  if grep -q "/Modules/$PASCAL/" "$SLNX"; then
    echo "Pastel.slnx ya contiene /Modules/$PASCAL/; no se modifica."
  else
    block="  <Folder Name=\"/Modules/$PASCAL/\">\n    <Project Path=\"src/Modules/$PASCAL/Pastel.Modules.$PASCAL/Pastel.Modules.$PASCAL.csproj\" />\n    <Project Path=\"src/Modules/$PASCAL/Pastel.Modules.$PASCAL.Tests/Pastel.Modules.$PASCAL.Tests.csproj\" />\n  </Folder>"
    awk -v block="$block" '/<Folder Name="\/Tests\/">/ && !done { gsub(/\\n/, "\n", block); print block; done=1 } { print }' "$SLNX" > "$SLNX.tmp" && mv "$SLNX.tmp" "$SLNX"
  fi
fi

cat <<MSG
Módulo '$NAME' ($CODE) generado:
  backend:  src/Modules/$PASCAL
  frontend: web/src/modules/$CODE
Pasos siguientes:
  1. Completar permisos y roles sugeridos desde docs/modules/$UPPER.md en ${PASCAL}Permissions.cs y ${PASCAL}Module.cs.
  2. Agregar el color y el icono en web/src/core/design/module-themes.css (CCR si el módulo es nuevo).
  3. Build genera la migración inicial con 'dotnet ef' (ver ${PASCAL}DbContextFactory.cs): sin migración, el host no arranca con este módulo.
MSG
