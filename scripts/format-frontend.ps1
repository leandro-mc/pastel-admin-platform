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

# Copy back only extensions and paths included by the repository's Prettier script.
find /tmp/work/web/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -exec sh -c '
  for source do
    relative=${source#/tmp/work/web/src/}
    destination="/repo/web/src/$relative"
    mkdir -p "$(dirname "$destination")"
    cp -p "$source" "$destination"
  done
' sh {} +

find /tmp/work/web/vite -type f -name '*.ts' -exec sh -c '
  for source do
    relative=${source#/tmp/work/web/vite/}
    destination="/repo/web/vite/$relative"
    mkdir -p "$(dirname "$destination")"
    cp -p "$source" "$destination"
  done
' sh {} +

for file in vite.config.ts eslint.config.js package.json package-lock.json .prettierrc.json; do
  if [ -f "/tmp/work/web/$file" ]; then
    cp -p "/tmp/work/web/$file" /repo/web/
  fi
done
for source in /tmp/work/web/tsconfig*.json; do
  if [ -f "$source" ]; then
    cp -p "$source" /repo/web/
  fi
done

echo "Formato aplicado a los archivos administrados por Prettier."
echo "Revise git diff antes de crear un commit."
'@

Write-Host "Aplicando Prettier en Docker. Este comando modifica el working tree, pero no crea commits." -ForegroundColor Yellow
$dockerArguments = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/repo" -f $repoRoot),
    "--entrypoint", "sh",
    "node:24-alpine",
    "-lc", $containerScript
)

& docker @dockerArguments
if ($LASTEXITCODE -ne 0) {
    throw "Prettier no se pudo aplicar. No se copian resultados si npm ci o npm run format falla."
}

Write-Host "Formato aplicado. Ahora ejecute .\scripts\test-frontend.ps1 para verificarlo." -ForegroundColor Green
