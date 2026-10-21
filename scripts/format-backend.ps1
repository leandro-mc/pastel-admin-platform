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

# Formatea una copia temporal; despues copia de vuelta SOLO los archivos C# cuyo contenido cambio
# (comparacion byte a byte), para no generar modificaciones espurias en el working tree.
# La normalizacion de fin de linea se realiza en el host para que sea consistente
# independientemente de los finales de linea del sistema operativo anfitrion.
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

echo ""
echo "=== Aplicar formato de espacios explicito ==="
dotnet format whitespace Pastel.slnx --no-restore

echo ""
echo "=== Formatear espacios del proyecto Identity directamente ==="
dotnet format whitespace src/Modules/Identity/Pastel.Modules.Identity/Pastel.Modules.Identity.csproj --no-restore --verbosity normal

echo ""
echo "=== Diagnosticos de formato restantes (no se ocultan) ==="
set +e
dotnet format Pastel.slnx --verify-no-changes --no-restore --verbosity normal > /tmp/format-verify.log 2>&1
verify_status=$?
set -e
cat /tmp/format-verify.log
if grep -Eq ': error [A-Z0-9]+:' /tmp/format-verify.log; then
  verify_status=1
fi

echo ""
echo "=== Copiar de vuelta solo los archivos C# con cambios reales ==="
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

find /tmp/work/src /tmp/work/tests -type d \( -name bin -o -name obj \) -prune -o -type f -name '*.cs' -print > /tmp/cs-files.txt
while IFS= read -r source_path; do
  copy_if_changed "$source_path" "/repo/${source_path#/tmp/work/}"
done < /tmp/cs-files.txt

echo ""
echo "Archivos C# actualizados en el repositorio: $copied (los demas ya estaban en su forma final)."
echo "La normalizacion final de LF/UTF-8 se ejecutara en el host."

if [ "$verify_status" -ne 0 ]; then
  echo "AVISO: quedan diagnosticos de formato que dotnet format no pudo corregir (ver arriba)."
  exit 3
fi
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
# Codigo 3: el formato se aplico y se copio, pero quedan diagnosticos que dotnet format no corrige.
$formatRemaining = ($LASTEXITCODE -eq 3)
if ($LASTEXITCODE -ne 0 -and -not $formatRemaining) {
    throw "No se pudo aplicar dotnet format. No copie resultados manualmente desde la imagen."
}

# Normaliza todos los C# de producto/pruebas en el host: UTF-8 sin BOM, LF y
# exactamente una nueva linea final. Excluye artefactos generados bin/obj.
$sourceRoots = @(
    (Join-Path $repoRoot "src"),
    (Join-Path $repoRoot "tests")
)
$sourceFiles = @(
    Get-ChildItem -Path $sourceRoots -Recurse -File -Filter "*.cs" |
        Where-Object { $_.FullName -notmatch '[\/](bin|obj)[\/]' }
)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$normalizedCount = 0

foreach ($file in $sourceFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $hasBom = (
        $bytes.Length -ge 3 -and
        $bytes[0] -eq 0xEF -and
        $bytes[1] -eq 0xBB -and
        $bytes[2] -eq 0xBF
    )

    $content = [System.IO.File]::ReadAllText($file.FullName)
    $normalized = [regex]::Replace($content, '\r\n?', "`n")
    if (-not $normalized.EndsWith("`n", [System.StringComparison]::Ordinal)) {
        $normalized += "`n"
    }

    if ($hasBom -or $normalized -cne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $normalized, $utf8NoBom)
        $normalizedCount++
    }
}

$invalidFiles = @(
    foreach ($file in $sourceFiles) {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $hasBom = (
            $bytes.Length -ge 3 -and
            $bytes[0] -eq 0xEF -and
            $bytes[1] -eq 0xBB -and
            $bytes[2] -eq 0xBF
        )

        if ($hasBom -or
            $content.Contains("`r") -or
            -not $content.EndsWith("`n", [System.StringComparison]::Ordinal)) {
            $file.FullName
        }
    }
)
if ($invalidFiles.Count -gt 0) {
    $invalidFiles | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    throw "La normalizacion de finales de linea no quedo completa."
}

Write-Host ("Normalizacion de texto: {0} archivos C# revisados; {1} normalizados; 0 excepciones." -f $sourceFiles.Count, $normalizedCount) -ForegroundColor Cyan
if ($formatRemaining) {
    Write-Host "Formato aplicado, pero dotnet format reporta diagnosticos que no puede corregir solo." -ForegroundColor Red
    Write-Host "Copie la seccion 'Diagnosticos de formato restantes' de la salida y corrijalos en el codigo." -ForegroundColor Red
    exit 1
}

Write-Host "Formato aplicado. Revise git status y git diff antes de crear un commit." -ForegroundColor Green
Write-Host "Ejecute .\scripts\test-backend.ps1 para verificar formato, build y pruebas." -ForegroundColor Green
