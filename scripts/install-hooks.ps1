[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Instala el hook de pre-commit versionado. Requiere Node.js y Git en PATH.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "No se encontro Node.js en PATH. Instale Node 22 o superior."
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "No se encontro Git en PATH."
}

Push-Location $repoRoot
try {
    & node (Join-Path $PSScriptRoot "install-hooks.mjs")
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo instalar el hook de pre-commit."
    }
}
finally {
    Pop-Location
}
