[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "No se encontro Docker en PATH."
}
if (-not (Test-Path (Join-Path $repoRoot "web/package-lock.json"))) {
    throw "No se encontro web/package-lock.json."
}

$containerScript = @'
set -e
mkdir -p /tmp/work
cp -a /repo/. /tmp/work/
find /tmp/work -type d \( -name .git -o -name node_modules -o -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -f /tmp/work/.env

cd /tmp/work/web
npm ci --no-audit --no-fund
npm run format

# Copia de vuelta solo los archivos administrados por Prettier cuyo contenido realmente cambio.
copied=0
copy_if_changed() {
  source_file="$1"
  destination_file="$2"
  if [ -f "$destination_file" ] && cmp -s "$source_file" "$destination_file"; then
    return 0
  fi
  mkdir -p "$(dirname "$destination_file")"
  cat "$source_file" > "$destination_file"
  copied=$((copied + 1))
  echo "  actualizado: ${destination_file#/repo/}"
}

: > /tmp/web-files.txt
find /tmp/work/web/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) >> /tmp/web-files.txt
find /tmp/work/web/vite -type f -name '*.ts' >> /tmp/web-files.txt
find /tmp/work/web/tests -type f \( -name '*.ts' -o -name '*.tsx' \) >> /tmp/web-files.txt
for file in vite.config.ts vitest.config.ts playwright.config.ts eslint.config.js package.json package-lock.json .prettierrc.json tsconfig*.json; do
  if [ -f "/tmp/work/web/$file" ]; then
    echo "/tmp/work/web/$file" >> /tmp/web-files.txt
  fi
done

while IFS= read -r source_path; do
  copy_if_changed "$source_path" "/repo/${source_path#/tmp/work/}"
done < /tmp/web-files.txt

echo ""
echo "Archivos actualizados en el repositorio: $copied (los demas ya estaban formateados)."
echo "Revise git diff antes de crear un commit."
'@

$normalizedContainerScript = [regex]::Replace($containerScript, "`r`n?", "`n")
$containerScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($normalizedContainerScript))
$dockerCommand = ("echo {0} | base64 -d | sh" -f $containerScriptBase64)

Write-Host "Aplicando Prettier en Docker. Este comando modifica el working tree, pero no crea commits." -ForegroundColor Yellow
$dockerArguments = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/repo" -f $repoRoot),
    "--entrypoint", "sh",
    "node:24-alpine",
    "-c", $dockerCommand
)

& docker @dockerArguments
if ($LASTEXITCODE -ne 0) {
    throw "Prettier no se pudo aplicar. No se copian resultados si npm ci o npm run format falla."
}

Write-Host "Formato aplicado. Ahora ejecute .\scripts\test-frontend.ps1 para verificarlo." -ForegroundColor Green
