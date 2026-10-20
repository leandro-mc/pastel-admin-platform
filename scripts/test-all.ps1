[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$checks = @(
    @{ Name = "Backend"; Path = (Join-Path $PSScriptRoot "test-backend.ps1") },
    @{ Name = "Frontend"; Path = (Join-Path $PSScriptRoot "test-frontend.ps1") },
    @{ Name = "Base de datos"; Path = (Join-Path $PSScriptRoot "test-database.ps1") }
)
$failures = [System.Collections.Generic.List[string]]::new()

Write-Host "PASTEL ADMIN PLATFORM - VALIDACION COMPLETA" -ForegroundColor Cyan
Write-Host "Los tres bloques se ejecutan aunque uno falle, para obtener un diagnostico completo."

foreach ($check in $checks) {
    Write-Host ""
    Write-Host ("================ {0} ================" -f $check.Name) -ForegroundColor Cyan
    try {
        & $check.Path
        Write-Host ("{0}: APROBADO" -f $check.Name) -ForegroundColor Green
    }
    catch {
        $message = $_.Exception.Message
        $failures.Add(("{0}: {1}" -f $check.Name, $message)) | Out-Null
        Write-Host ("{0}: FALLO - {1}" -f $check.Name, $message) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================ RESUMEN FINAL ================" -ForegroundColor Cyan
if ($failures.Count -gt 0) {
    foreach ($failure in $failures) {
        Write-Host ("- {0}" -f $failure) -ForegroundColor Red
    }
    throw ("Validacion completa FALLIDA: {0} bloque(s) requieren correccion." -f $failures.Count)
}

Write-Host "Todos los bloques de validacion pasaron." -ForegroundColor Green
