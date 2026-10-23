[CmdletBinding()]
param(
    [int]$WebPort = 18080,
    [int]$PostgresPort = 15435,
    [switch]$ModuleIsolation,
    [switch]$KeepRunning
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Verificacion de Fase 0 sobre un stack Compose AISLADO (proyecto pastel-fase0-qa, red y volumen propios).
# Cubre F0-001, F0-002, F0-S214 y F0-I06. Con -ModuleIsolation construye ademas las imagenes por modulo (F0-003).
# No toca la pila de desarrollo (proyecto pastel-admin) ni su volumen. Requiere Docker Compose 2.24.4 o superior
# y curl.exe (incluido en Windows 10/11). El unico "down -v" se aplica al proyecto pastel-fase0-qa.

$Project = "pastel-fase0-qa"
$QaSubnet = "172.31.87.0/24"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BaseUrl = "http://localhost:$WebPort"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "pastel-fase0-qa"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$qaOverride = Join-Path $tempDir "compose.qa.override.yaml"
$results = New-Object System.Collections.Generic.List[object]

function Add-Check {
    param([string]$Id, [string]$Name, [bool]$Passed, [string]$Detail)
    $results.Add([pscustomobject]@{ Id = $Id; Name = $Name; Passed = $Passed; Detail = $Detail })
    $label = if ($Passed) { "PASS" } else { "FAIL" }
    $color = if ($Passed) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} - {2}: {3}" -f $label, $Id, $Name, $Detail) -ForegroundColor $color
}

function Invoke-Curl {
    param([string[]]$Arguments)
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $headerFile = [System.IO.Path]::GetTempFileName()
    try {
        $text = (& curl.exe --silent --max-time 20 --dump-header $headerFile --output $bodyFile --write-out "%{http_code}" @Arguments 2>$null) -join ""
        $code = 0
        [void][int]::TryParse($text.Trim(), [ref]$code)
        $body = Get-Content -Raw -LiteralPath $bodyFile
        if (-not $body) { $body = "" }
        return [pscustomobject]@{
            Status  = $code
            Body    = $body
            Headers = @(Get-Content -LiteralPath $headerFile)
        }
    }
    finally {
        Remove-Item -LiteralPath $bodyFile, $headerFile -ErrorAction SilentlyContinue
    }
}

function Invoke-Login {
    param([string]$Email, [string]$Password)
    $jar = Join-Path $tempDir "cookies.txt"
    Remove-Item -LiteralPath $jar -ErrorAction SilentlyContinue
    $csrf = Invoke-Curl @("--cookie-jar", $jar, "$BaseUrl/api/auth/csrf")
    if ($csrf.Status -ne 200) { return $csrf }
    $token = ($csrf.Body | ConvertFrom-Json).csrfToken
    $bodyFile = Join-Path $tempDir "login.json"
    [System.IO.File]::WriteAllText($bodyFile, (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress))
    return Invoke-Curl @(
        "--request", "POST",
        "--cookie", $jar, "--cookie-jar", $jar,
        "--header", "X-CSRF-TOKEN: $token",
        "--header", "Content-Type: application/json",
        "--data-binary", "@$bodyFile",
        "$BaseUrl/api/auth/login")
}

function Wait-Status {
    param([string]$Url, [int]$Expected, [int]$TimeoutSeconds)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $last = 0
    do {
        $last = (Invoke-Curl @($Url)).Status
        if ($last -eq $Expected) { return $true }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    Write-Host "Ultimo estado observado en ${Url}: $last" -ForegroundColor Yellow
    return $false
}

function Get-DuplicateHeaders {
    param([string[]]$Lines)
    $names = @($Lines | Where-Object { $_ -match '^[A-Za-z0-9-]+:' } | ForEach-Object { ($_ -split ':', 2)[0].ToLowerInvariant() })
    $duplicates = @($names | Where-Object { $_ -ne "set-cookie" -and $_ -ne "vary" } | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
    return $duplicates
}

# Estado previo del entorno, para restaurarlo siempre al terminar.
$envNames = @("ASPNETCORE_ENVIRONMENT", "WEB_PORT", "POSTGRES_PORT", "APP_PUBLIC_BASE_URL", "PASTEL_MODULES", "TESTING_SEED_ENABLED", "REVERSE_PROXY_TRUSTED_NETWORKS")
$previousEnv = @{}
foreach ($name in $envNames) { $previousEnv[$name] = [Environment]::GetEnvironmentVariable($name, "Process") }

$composeFiles = @("-f", (Join-Path $repoRoot "compose.yaml"), "-f", (Join-Path $repoRoot "compose.override.yaml"), "-f", $qaOverride)

function Remove-QaProject {
    # Seguro: solo opera sobre el proyecto de QA (nombre fijo); nunca sobre pastel-admin.
    if ($Project -ne "pastel-fase0-qa") { throw "Proyecto inesperado: $Project" }
    # docker escribe su progreso en stderr; con "Stop" PowerShell lo trataria como error terminante.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & docker compose -p $Project @composeFiles down -v --remove-orphans 2>&1 | Out-Null
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker no esta disponible en PATH." }
    if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) { throw "curl.exe no esta disponible en PATH." }

    # Red propia: la pila de desarrollo ya usa 172.30.0.0/24 y Compose no permite subredes solapadas.
    $overrideText = @"
networks:
  pastel_net:
    ipam:
      config: !override
        - subnet: $QaSubnet
"@
    [System.IO.File]::WriteAllText($qaOverride, $overrideText)

    $env:ASPNETCORE_ENVIRONMENT = "Testing"
    $env:WEB_PORT = "$WebPort"
    $env:POSTGRES_PORT = "$PostgresPort"
    $env:APP_PUBLIC_BASE_URL = $BaseUrl
    $env:PASTEL_MODULES = "*"
    $env:TESTING_SEED_ENABLED = "true"
    $env:REVERSE_PROXY_TRUSTED_NETWORKS = $QaSubnet

    Write-Host "== Preparando stack aislado '$Project' desde cero (base de datos y volumen propios) ==" -ForegroundColor Cyan
    Remove-QaProject
    & docker compose -p $Project @composeFiles up -d --build --wait --wait-timeout 420
    if ($LASTEXITCODE -ne 0) { throw "docker compose up fallo. Revise los mensajes anteriores." }

    # ---------------- F0-001: arranque desde base vacia ----------------
    $live = Invoke-Curl @("$BaseUrl/health/live")
    $ready = Invoke-Curl @("$BaseUrl/health/ready")
    Add-Check "F0-001" "health/live y health/ready" (($live.Status -eq 200) -and ($ready.Status -eq 200)) "live=$($live.Status) ready=$($ready.Status)"

    $sql = "select table_schema || ' ' || count(*) from information_schema.tables where table_schema in ('identity','brisa','balance','agora','cosecha','huella') group by table_schema order by 1;"
    $schemaLines = @($sql | & docker compose -p $Project @composeFiles exec -T db sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -tA')
    $present = @($schemaLines | ForEach-Object { ("$_".Trim() -split ' ')[0] } | Where-Object { $_ })
    $expected = @("agora", "balance", "brisa", "cosecha", "huella", "identity")
    $missing = @($expected | Where-Object { $present -notcontains $_ })
    Add-Check "F0-001" "esquemas migrados desde base vacia" ($missing.Count -eq 0) ("tablas por esquema: " + (($schemaLines | ForEach-Object { "$_".Trim() }) -join "; ") + $(if ($missing.Count -gt 0) { " | faltan: " + ($missing -join ", ") } else { "" }))

    $options = Invoke-Curl @("$BaseUrl/api/auth/options")
    Add-Check "F0-001" "GET /api/auth/options" ($options.Status -eq 200) "status=$($options.Status)"

    $login = Invoke-Login "test.admin@pastel.local" "Local-Only-Test-Admin-2026!"
    Add-Check "F0-006" "semilla Testing: inicio de sesion de test.admin" ($login.Status -eq 200) "status=$($login.Status)"

    # ---------------- F0-S214 / F0-I06: cabeceras sin duplicados ----------------
    foreach ($target in @("/", "/api/auth/options")) {
        $response = Invoke-Curl @("$BaseUrl$target")
        $duplicates = @(Get-DuplicateHeaders $response.Headers)
        $hasNoSniff = @($response.Headers | Where-Object { $_ -match '^x-content-type-options:' }).Count -ge 1
        Add-Check "F0-S214" "cabeceras de $target sin duplicados" (($duplicates.Count -eq 0) -and $hasNoSniff) ("duplicadas: " + $(if ($duplicates.Count -eq 0) { "ninguna" } else { $duplicates -join ", " }) + "; x-content-type-options: $hasNoSniff")
        Write-Host "---- cabeceras de $target ----" -ForegroundColor DarkGray
        $response.Headers | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }

    # ---------------- F0-002: detener PostgreSQL con la API arriba ----------------
    Write-Host "== Deteniendo PostgreSQL (la API sigue arriba) ==" -ForegroundColor Cyan
    & docker compose -p $Project @composeFiles stop db | Out-Null
    $notReady = Wait-Status "$BaseUrl/health/ready" 503 60
    $down = Invoke-Login "test.admin@pastel.local" "Local-Only-Test-Admin-2026!"
    $isProblem = (($down.Headers -join "`n") -match "(?i)application/problem\+json")
    $hasTrace = ($down.Body -match "traceId")
    Add-Check "F0-002" "health/ready falla sin base de datos" $notReady "esperado 503"
    Add-Check "F0-002" "peticion con la base caida devuelve 503 problem+json con traceId" (($down.Status -eq 503) -and $isProblem -and $hasTrace) "status=$($down.Status) problem+json=$isProblem traceId=$hasTrace"
    $liveDown = Invoke-Curl @("$BaseUrl/health/live")
    Add-Check "F0-002" "health/live sigue en 200 sin base de datos" ($liveDown.Status -eq 200) "status=$($liveDown.Status)"

    Write-Host "== Reiniciando PostgreSQL ==" -ForegroundColor Cyan
    & docker compose -p $Project @composeFiles start db | Out-Null
    $recovered = Wait-Status "$BaseUrl/health/ready" 200 120
    $after = Invoke-Login "test.admin@pastel.local" "Local-Only-Test-Admin-2026!"
    Add-Check "F0-002" "la API se recupera al volver la base" ($recovered -and ($after.Status -eq 200)) "ready=$recovered login=$($after.Status)"

    # ---------------- F0-003: aislamiento por modulo (opcional, lento) ----------------
    if ($ModuleIsolation) {
        foreach ($module in @("agora", "brisa", "balance", "cosecha", "huella")) {
            Write-Host "== Construyendo imagenes con solo Identity + $module ==" -ForegroundColor Cyan
            & docker build --file (Join-Path $repoRoot "src/Host/Pastel.Host/Dockerfile") --build-arg "PASTEL_MODULES=$module" --tag "pastel-api:$module" $repoRoot
            $apiOk = ($LASTEXITCODE -eq 0)
            & docker build --file (Join-Path $repoRoot "web/Dockerfile") --build-arg "PASTEL_MODULES=$module" --tag "pastel-web:$module" $repoRoot
            $webOk = ($LASTEXITCODE -eq 0)
            Add-Check "F0-003" "build aislado '$module' (api y web)" ($apiOk -and $webOk) "api=$apiOk web=$webOk"
        }
    }
}
catch {
    Add-Check "ERROR" "El script se interrumpio" $false $_.Exception.Message
}
finally {
    foreach ($name in $envNames) {
        [Environment]::SetEnvironmentVariable($name, $previousEnv[$name], "Process")
    }
    if (-not $KeepRunning) {
        Write-Host "== Limpiando el proyecto '$Project' (no afecta a la pila de desarrollo) ==" -ForegroundColor Cyan
        try { Remove-QaProject } catch { Write-Host "No se pudo limpiar: $($_.Exception.Message)" -ForegroundColor Yellow }
    }
    else {
        Write-Host "Stack conservado (-KeepRunning). Limpiar con: docker compose -p $Project -f compose.yaml -f compose.override.yaml -f `"$qaOverride`" down -v" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================ RESUMEN ================" -ForegroundColor Cyan
$results | ForEach-Object { Write-Host ("{0,-5} {1,-8} {2}" -f $(if ($_.Passed) { "PASS" } else { "FAIL" }), $_.Id, $_.Name) }
$failed = @($results | Where-Object { -not $_.Passed }).Count
Write-Host ("Total: {0}; fallidos: {1}" -f $results.Count, $failed)
if ($failed -gt 0) { exit 1 }
