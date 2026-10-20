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

# Copy back only paths included by the repository's Prettier script.
cp -a /tmp/work/web/src/. /repo/web/src/
cp -a /tmp/work/web/vite.config.ts /repo/web/vite.config.ts
if [ -d /tmp/work/web/vite ]; then
  mkdir -p /repo/web/vite
  cp -a /tmp/work/web/vite/. /repo/web/vite/
fi
for file in eslint.config.js package.json package-lock.json .prettierrc.json tsconfig*.json; do
  if [ -f "/tmp/work/web/$file" ]; then
    cp -a "/tmp/work/web/$file" /repo/web/
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
