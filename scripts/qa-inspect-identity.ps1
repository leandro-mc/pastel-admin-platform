[CmdletBinding()]
param(
    [string]$DbContainer = "pastel-fase0-qa-db-1",
    [string]$ApiContainer = "pastel-fase0-qa-api-1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Diagnostico de solo lectura del stack de QA (proyecto pastel-fase0-qa): muestra con que correo arranco el API, que
# cuentas y roles existen y que eventos de Google/arranque se auditaron. No imprime hashes de contrasena.
# Uso: .\scripts\qa-inspect-identity.ps1   (con el stack levantado con -KeepRunning)

function Invoke-Sql {
    param([string]$Title, [string]$Sql)
    Write-Host ""
    Write-Host "== $Title ==" -ForegroundColor Cyan
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $Sql | & docker exec -i $DbContainer sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -tA'
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

Write-Host "== Correo de administrador de arranque que recibio el API ==" -ForegroundColor Cyan
& docker exec $ApiContainer printenv Bootstrap__AdminEmail

Invoke-Sql "Cuentas (sin hash de contrasena)" "select to_jsonb(u) - 'PasswordHash' - 'password_hash' from identity.users u order by to_jsonb(u)::text;"
Invoke-Sql "Roles" "select to_jsonb(r) from identity.roles r order by to_jsonb(r)::text;"
Invoke-Sql "Asignacion de roles (user_roles)" "select to_jsonb(ur) from identity.user_roles ur order by to_jsonb(ur)::text;"
Invoke-Sql "Vinculos externos (Google)" "select to_jsonb(e) from identity.external_logins e order by to_jsonb(e)::text;"
Invoke-Sql "Auditoria de Google y de arranque" "select to_jsonb(a) from identity.audit_logs a where to_jsonb(a)::text ~* '(google|bootstrap)' order by to_jsonb(a)::text;"
