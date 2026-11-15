[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "No se encontro Docker en PATH."
}
if (-not (Test-Path (Join-Path $script:RepoRoot "web/package-lock.json"))) {
    throw "No se encontro web/package-lock.json; se requiere npm ci para pruebas reproducibles."
}

$containerScript = @'
set +e
mkdir -p /tmp/work
copy_started=$(date +%s)
tar -C /repo --exclude=.git --exclude=node_modules --exclude=bin --exclude=obj -cf - . | tar -C /tmp/work -xf -
if [ "$?" -ne 0 ]; then
  echo "No se pudo copiar el repositorio a la copia temporal del contenedor."
  exit 90
fi
echo "Copia del repositorio (sin .git, node_modules, bin ni obj): $(( $(date +%s) - copy_started )) s"
find /tmp/work -type d \( -name .git -o -name node_modules -o -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -f /tmp/work/.env
cd /tmp/work || exit 91

failures=0
run_check() {
  label="$1"
  shift
  echo ""
  echo "=== $label ==="
  "$@"
  status=$?
  if [ "$status" -eq 0 ]; then
    echo "Correcto: $label"
  else
    echo "FALLO: $label (codigo $status)"
    failures=$((failures + 1))
  fi
}

echo "=== Instalar dependencias web con npm ci ==="
cd /tmp/work/web || exit 92
npm ci --no-audit --no-fund
install_status=$?
if [ "$install_status" -eq 0 ]; then
  run_check "Auditoría de dependencias (npm audit)" npm audit --audit-level=high
  run_check "Prettier" npm run format:check
  run_check "ESLint" npm run lint
  run_check "TypeScript + Vite build" npm run build
  run_check "Pruebas de componentes React (Vitest + axe)" npm run test
else
  echo "FALLO: npm ci (codigo $install_status); no se ejecutan Prettier, ESLint ni build."
  failures=$((failures + 1))
fi

cd /tmp/work || exit 93
run_check "Fronteras modulares (frontend/backend)" node scripts/check-module-boundaries.mjs
run_check "Pruebas unitarias de las guardas de diseño" node --test scripts/tests/check-design.test.mjs
run_check "check-design" node scripts/check-design.mjs
run_check "Auditoria Tailwind (metas de migracion)" node scripts/tailwind-audit.mjs --check

printf '\nResumen frontend: %s comprobacion(es) fallida(s).\n' "$failures"
if [ "$failures" -ne 0 ]; then
  exit 1
fi
exit 0
'@

$normalizedContainerScript = [regex]::Replace($containerScript, "`r`n?", "`n")
$containerScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($normalizedContainerScript))
$dockerCommand = ("echo {0} | base64 -d | sh" -f $containerScriptBase64)

Write-Host "Validacion frontend en Docker (copia temporal; el repositorio se monta en solo lectura)." -ForegroundColor Cyan
$dockerArguments = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/repo,readonly" -f $script:RepoRoot),
    "--mount", "type=volume,source=pastel-npm-cache,target=/root/.npm",
    "--entrypoint", "sh",
    "node:24-alpine",
    "-c", $dockerCommand
)

& docker @dockerArguments
if ($LASTEXITCODE -ne 0) {
    throw "La validacion frontend fallo. El contenedor ejecuta todos los controles disponibles y devuelve el resumen al final."
}

Write-Host "FRONTEND: APROBADO." -ForegroundColor Green
