[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "Test-Helpers.ps1")

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "No se encontro Docker en PATH."
}
if (-not (Test-Path (Join-Path $script:RepoRoot "Pastel.slnx"))) {
    throw "No se encontro Pastel.slnx en la raiz del repositorio."
}

$resultsDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("pastel-backend-tests-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $resultsDirectory -Force | Out-Null

$containerScript = @'
set +e
mkdir -p /tmp/work /test-results
cp -a /repo/. /tmp/work/
if [ "$?" -ne 0 ]; then
  echo "No se pudo copiar el repositorio a la copia temporal del contenedor."
  exit 90
fi
find /tmp/work -type d \( -name .git -o -name node_modules -o -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -f /tmp/work/.env
cd /tmp/work || exit 91

echo ""
echo "=== Restaurar solucion .NET ==="
dotnet restore Pastel.slnx
restore_status=$?
if [ "$restore_status" -ne 0 ]; then
  echo "Fallo la restauracion; no se pueden ejecutar las demas comprobaciones."
  exit "$restore_status"
fi

echo ""
echo "=== Verificar formato .NET ==="
format_output=$(dotnet format Pastel.slnx --verify-no-changes --no-restore 2>&1)
format_status=$?
printf '%s\n' "$format_output"
if printf '%s' "$format_output" | grep -Fq 'error WHITESPACE:'; then
  format_status=1
fi

echo ""
echo "=== Compilar solucion en Release ==="
dotnet build Pastel.slnx --configuration Release --no-restore
build_status=$?

test_status=125
if [ "$build_status" -eq 0 ]; then
  echo ""
  echo "=== Ejecutar pruebas unitarias .NET (sin pruebas de integracion PostgreSQL) ==="
  dotnet test Pastel.slnx --configuration Release --no-build --no-restore \
    --filter 'FullyQualifiedName!~Pastel.IntegrationTests' \
    --logger 'trx;LogFilePrefix=backend' \
    --results-directory /test-results
  test_status=$?
else
  echo "Se omiten las pruebas unitarias porque fallo la compilacion."
fi

printf '\nResumen de fases: formato=%s; build=%s; pruebas=%s\n' "$format_status" "$build_status" "$test_status"
if [ "$format_status" -ne 0 ] || [ "$build_status" -ne 0 ] || [ "$test_status" -ne 0 ]; then
  exit 1
fi
exit 0
'@

$containerScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($containerScript))
$dockerCommand = ("echo {0} | base64 -d | sh" -f $containerScriptBase64)

Write-Host "Validacion backend en Docker (copia temporal; el repositorio se monta en solo lectura)." -ForegroundColor Cyan
Write-Host ("Resultados TRX: {0}" -f $resultsDirectory)

$dockerArguments = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/repo,readonly" -f $script:RepoRoot),
    "--mount", ("type=bind,source={0},target=/test-results" -f $resultsDirectory),
    "--entrypoint", "sh",
    "mcr.microsoft.com/dotnet/sdk:10.0",
    "-c", $dockerCommand
)

& docker @dockerArguments
$dockerExitCode = $LASTEXITCODE
$resultsInvalid = $false
$summary = Get-TestResultSummary -ResultsDirectory $resultsDirectory
try {
    Assert-TestResultSummary -Label "backend" -Summary $summary
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    $resultsInvalid = $true
}

if ($dockerExitCode -ne 0 -or $resultsInvalid) {
    throw ("La validacion backend fallo (Docker exit code: {0}). Revise el formato/build y los resultados TRX." -f $dockerExitCode)
}

Write-Host "BACKEND: APROBADO." -ForegroundColor Green
