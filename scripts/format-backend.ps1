[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "No se encontro Docker en PATH."
}
if (-not (Test-Path (Join-Path $repoRoot "Pastel.slnx"))) {
    throw "No se encontro Pastel.slnx en la raiz del repositorio."
}

# Trabaja en una copia temporal para que el SDK no modifique archivos mientras restaura/formatea.
# Al terminar, solo copia archivos .cs; el usuario debe revisar el diff antes de confirmar cambios.
$containerScript = @'
set -e
mkdir -p /tmp/work
cp -a /repo/. /tmp/work/
find /tmp/work -type d \( -name .git -o -name node_modules -o -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -f /tmp/work/.env
cd /tmp/work

echo "=== Restaurar solucion .NET ==="
dotnet restore Pastel.slnx

echo ""
echo "=== Aplicar formato .NET ==="
dotnet format Pastel.slnx --no-restore

# Alinea todos los archivos C# con .editorconfig (LF y UTF-8 sin BOM).
find /tmp/work/src /tmp/work/tests -type f -name '*.cs' -exec sh -c '
  for source do
    sed -i "s/\r$//" "$source"
    sed -i "1s/^\xEF\xBB\xBF//" "$source"
    relative=$(printf '%s\n' "$source" | sed 's#^/tmp/work/##')
    destination="/repo/$relative"
    mkdir -p "$(dirname "$destination")"
    cp -p "$source" "$destination"
  done
' sh {} +

echo ""
echo "Formato aplicado y archivos .cs copiados de vuelta."
echo "Revise git status y git diff antes de crear un commit."
'@

$normalizedContainerScript = [regex]::Replace($containerScript, "`r`n?", "`n")
$containerScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($normalizedContainerScript))
$dockerCommand = ("echo {0} | base64 -d | sh" -f $containerScriptBase64)

Write-Host "Aplicando dotnet format en Docker sobre una copia temporal." -ForegroundColor Cyan
Write-Host "El script modifica el working tree al copiar de vuelta archivos C# formateados; no crea commits."
$dockerArguments = @(
    "run", "--rm",
    "--mount", ("type=bind,source={0},target=/repo" -f $repoRoot),
    "--entrypoint", "sh",
    "mcr.microsoft.com/dotnet/sdk:10.0",
    "-c", $dockerCommand
)

& docker @dockerArguments
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo aplicar dotnet format. No copie resultados manualmente desde la imagen."
}

Write-Host "Listo. Ejecute .\scripts\test-backend.ps1 para verificar el formato, build y pruebas." -ForegroundColor Green
