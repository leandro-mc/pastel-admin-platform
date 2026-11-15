# Legacy filename retained for compatibility; technical validation and QA coverage are reported separately.
[CmdletBinding()]
param(
    [switch]$SkipContainerBuild,
    [switch]$FailOnCoverageDebt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:Failures = [System.Collections.Generic.List[string]]::new()
$script:LastExitCode = 0
$script:TestResultsDirectory = Join-Path $env:TEMP ("pastel-pre-wp5-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$script:ConnectionBuilder = $null
$script:ComposeConfig = $null
$script:TestConnectionString = $null
$script:CoverageDebt = [System.Collections.Generic.List[string]]::new()
$password = $null

$testDatabase = "pastel_integration_tests"

# Traceability inventory for the original WP3/WP4 security requirements.
# This is a presence-only report, not proof of assertion quality or phase completion.
# Technical validation and the optional coverage-debt gate are reported separately.
$trackedRequirementIds = @()
for ($id = 101; $id -le 116; $id++) {
    $trackedRequirementIds += "F0-S$id"
}
$trackedRequirementIds += @(
    "F0-S203",
    "F0-S204",
    "F0-S205",
    "F0-S207",
    "F0-S208",
    "F0-S209",
    "F0-S210",
    "F0-S211",
    "F0-S212",
    "F0-S213",
    "F0-S214",
    "WP3-PERMISSION-EVALUATOR-SQL",
    "WP3-REQUEST-QUERY-BUDGET"
)

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Invoke-NativeCheck {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [string]$WorkingDirectory = $script:RepoRoot
    )

    Write-Section $Label
    Push-Location $WorkingDirectory
    try {
        $nativeOutput = @(& $Executable @Arguments 2>&1)
        $script:LastExitCode = $LASTEXITCODE
        foreach ($line in $nativeOutput) {
            Write-Host ([string]$line)
        }

        # dotnet format may print WHITESPACE diagnostics while returning exit code 0.
        # Treat those diagnostics as a failed validation instead of reporting a false success.
        if ($Label -eq "Verificar formato .NET") {
            $outputText = ($nativeOutput | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
            if ($outputText -match '(?m)\berror WHITESPACE:') {
                $script:LastExitCode = 1
            }
        }
    }
    catch {
        $script:LastExitCode = 9009
        Write-Host "No se pudo ejecutar el comando: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }

    if ($script:LastExitCode -ne 0) {
        $script:Failures.Add("$Label (codigo $script:LastExitCode)") | Out-Null
        Write-Host "FALLO: $Label (codigo $script:LastExitCode)" -ForegroundColor Red
    }
    else {
        Write-Host "Correcto: $Label" -ForegroundColor Green
    }
}

function Invoke-RequiredNative {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [string]$WorkingDirectory = $script:RepoRoot
    )

    Write-Section $Label
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        $code = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($code -ne 0) {
        throw "$Label fallo (codigo $code). Se detiene la preparacion por seguridad."
    }
}

function Get-CounterValue {
    param(
        [Parameter(Mandatory)][System.Xml.XmlNode]$Counters,
        [Parameter(Mandatory)][string]$Name
    )

    $rawValue = $Counters.Attributes[$Name]
    if ($null -eq $rawValue -or [string]::IsNullOrWhiteSpace($rawValue.Value)) {
        return 0
    }

    return [int]$rawValue.Value
}

try {
    Set-Location $script:RepoRoot

    if (-not (Test-Path (Join-Path $script:RepoRoot "Pastel.slnx"))) {
        throw "Ejecute el script desde una copia del repositorio que contenga Pastel.slnx."
    }
    if (-not (Test-Path (Join-Path $script:RepoRoot ".env"))) {
        throw "Falta .env. Creelo a partir de .env.example y configure los secretos locales antes de ejecutar la validacion."
    }

    foreach ($tool in @("dotnet", "docker")) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            throw ("Required command not found in PATH: {0}" -f $tool)
        }
    }

    # Validate Compose without printing its resolved values (which include secrets).
    $null = & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose config --quiet fallo. Revise .env y compose.yaml; no se imprimieron secretos."
    }

    $composeJsonLines = & docker compose config --format json
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo leer la configuracion efectiva de Docker Compose."
    }
    $script:ComposeConfig = (($composeJsonLines | Out-String) | ConvertFrom-Json)

    $dbService = $script:ComposeConfig.services.db
    if ($null -eq $dbService) {
        throw "compose.yaml does not declare the PostgreSQL service db."
    }

    $dbEnvironment = $dbService.environment
    $dbNameProperty = $dbEnvironment.PSObject.Properties["POSTGRES_DB"]
    $dbUserProperty = $dbEnvironment.PSObject.Properties["POSTGRES_USER"]
    $dbPasswordProperty = $dbEnvironment.PSObject.Properties["POSTGRES_PASSWORD"]
    if ($null -eq $dbNameProperty -or $null -eq $dbUserProperty -or $null -eq $dbPasswordProperty) {
        throw "La configuracion efectiva del servicio db debe definir POSTGRES_DB, POSTGRES_USER y POSTGRES_PASSWORD."
    }

    $configuredDatabase = [string]$dbNameProperty.Value
    $dbUser = [string]$dbUserProperty.Value
    $password = [string]$dbPasswordProperty.Value
    if ([string]::IsNullOrWhiteSpace($configuredDatabase) -or
        [string]::IsNullOrWhiteSpace($dbUser) -or
        [string]::IsNullOrWhiteSpace($password)) {
        throw "La configuracion PostgreSQL efectiva tiene valores vacios."
    }
    if ($configuredDatabase -ieq $testDatabase) {
        throw ("POSTGRES_DB must not match the reserved test database: {0}" -f $testDatabase)
    }

    # Start only PostgreSQL first so Compose can resolve the published port reliably.
    # This does not start/rebuild the API or web containers and does not remove the database volume.
    Invoke-RequiredNative -Label "Asegurar que PostgreSQL local este iniciado" -Executable "docker" -Arguments @("compose", "up", "-d", "db")

    # Require the port to be bound to loopback; do not test against an exposed remote database.
    $publishedEndpointLines = & docker compose port db 5432
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo resolver el puerto publicado de PostgreSQL."
    }
    $publishedEndpoint = (($publishedEndpointLines | Out-String).Trim() -split "\r?\n")[0].Trim()
    if ($publishedEndpoint -notmatch '^(127\.0\.0\.1|localhost|\[::1\]):(?<port>[0-9]+)$') {
        $message = 'PostgreSQL port must be bound to loopback only. Found endpoint: {0}' -f $publishedEndpoint
        throw $message
    }
    $hostPort = [int]$Matches["port"]

    Write-Section "Esperar a que PostgreSQL este listo"
    $databaseReady = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $null = & docker compose exec -T db pg_isready -U $dbUser -d $configuredDatabase 2>&1
        if ($LASTEXITCODE -eq 0) {
            $databaseReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $databaseReady) {
        $null = & docker compose ps
        throw "PostgreSQL no estuvo listo en 120 segundos. Revise docker compose logs db."
    }
    Write-Host "PostgreSQL esta listo." -ForegroundColor Green

    # Only this fixed, dedicated test database is dropped/recreated. The app database and volume remain intact.
    Invoke-RequiredNative -Label "Recreate isolated integration test database" -Executable "docker" -Arguments @("compose", "exec", "-T", "db", "psql", "-U", $dbUser, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "DROP DATABASE IF EXISTS $testDatabase WITH (FORCE);")
    Invoke-RequiredNative -Label "Create isolated integration test database" -Executable "docker" -Arguments @("compose", "exec", "-T", "db", "psql", "-U", $dbUser, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE $testDatabase;")

    $script:ConnectionBuilder = [System.Data.Common.DbConnectionStringBuilder]::new()
    $script:ConnectionBuilder["Host"] = "127.0.0.1"
    $script:ConnectionBuilder["Port"] = $hostPort
    $script:ConnectionBuilder["Database"] = $testDatabase
    $script:ConnectionBuilder["Username"] = $dbUser
    $script:ConnectionBuilder["Password"] = $password
    $script:ConnectionBuilder["GSS Encryption Mode"] = "Disable"
    $script:TestConnectionString = $script:ConnectionBuilder.ConnectionString
    $env:PASTEL_TEST_CONNECTION_STRING = $script:TestConnectionString

    New-Item -ItemType Directory -Path $script:TestResultsDirectory -Force | Out-Null

    # Backend: Release build/test, plus format validation and strict detection of skipped integration tests.
    Invoke-NativeCheck -Label "Restaurar solucion .NET" -Executable "dotnet" -Arguments @("restore", "Pastel.slnx")
    $restoreSucceeded = ($script:LastExitCode -eq 0)

    if ($restoreSucceeded) {
        Invoke-NativeCheck -Label "Verificar formato .NET" -Executable "dotnet" -Arguments @("format", "Pastel.slnx", "--verify-no-changes", "--no-restore")
        Invoke-NativeCheck -Label "Compilar solucion en Release" -Executable "dotnet" -Arguments @("build", "Pastel.slnx", "--configuration", "Release", "--no-restore")
        $buildSucceeded = ($script:LastExitCode -eq 0)

        if ($buildSucceeded) {
            Invoke-NativeCheck -Label "Ejecutar toda la suite .NET contra PostgreSQL dedicado" -Executable "dotnet" -Arguments @("test", "Pastel.slnx", "--configuration", "Release", "--no-build", "--no-restore", "--logger", "trx", "--results-directory", $script:TestResultsDirectory)

            $trxFiles = @(Get-ChildItem -Path $script:TestResultsDirectory -Filter "*.trx" -Recurse -ErrorAction SilentlyContinue)
            $totalTests = 0
            $passedTests = 0
            $failedTests = 0
            $notExecutedTests = 0
            $trxParseFailed = $false

            foreach ($trxFile in $trxFiles) {
                try {
                    [xml]$trx = Get-Content -Path $trxFile.FullName -Raw
                    $counters = $trx.SelectSingleNode('//*[local-name()="Counters"]')
                    if ($null -eq $counters) {
                        continue
                    }
                    $totalTests += Get-CounterValue -Counters $counters -Name "total"
                    $passedTests += Get-CounterValue -Counters $counters -Name "passed"
                    $failedTests += Get-CounterValue -Counters $counters -Name "failed"
                    $notExecutedTests += Get-CounterValue -Counters $counters -Name "notExecuted"
                    $failedTests += Get-CounterValue -Counters $counters -Name "error"
                }
                catch {
                    $trxParseFailed = $true
                    Write-Host "No se pudo interpretar el resultado TRX: $($trxFile.Name)" -ForegroundColor Red
                }
            }

            Write-Section "Resumen verificable de pruebas .NET"
            Write-Host "Resultados TRX: $($trxFiles.Count); total: $totalTests; aprobadas: $passedTests; fallidas/errores: $failedTests; no ejecutadas/omitidas: $notExecutedTests"
            if ($trxParseFailed -or $trxFiles.Count -eq 0 -or $totalTests -lt 1 -or $failedTests -ne 0 -or $notExecutedTests -ne 0 -or $passedTests -ne $totalTests) {
                $script:Failures.Add("Los resultados TRX no confirman que se ejecutara al menos una prueba .NET y que todas pasaran sin omisiones.") | Out-Null
            }
            else {
                Write-Host "Correcto: ninguna prueba .NET quedo omitida." -ForegroundColor Green
            }
        }
        else {
            $script:Failures.Add("No se ejecutaron pruebas .NET porque fallo la compilacion.") | Out-Null
        }
    }
    else {
        $script:Failures.Add("Se omitieron formato, compilacion y pruebas .NET porque fallo la restauracion.") | Out-Null
    }

    # Frontend is out of scope before WP7/WP8: do not install, format, build, lint, or test it here.

    Invoke-NativeCheck -Label "Validar la configuracion final de Docker Compose" -Executable "docker" -Arguments @("compose", "config", "--quiet")
    if (-not $SkipContainerBuild) {
        Invoke-NativeCheck -Label "Construir la imagen Docker de API (sin iniciar la API sobre la base de desarrollo)" -Executable "docker" -Arguments @("compose", "build", "api")
    }
    else {
        Write-Host "Build de imagenes omitido por -SkipContainerBuild."
    }

    # Presence-only inventory; never treat labels as proof of sufficient QA coverage.
    Write-Section "Inventario de trazabilidad de requisitos de seguridad"
    $testRoots = @((Join-Path $script:RepoRoot "src/Modules/Identity/Pastel.Modules.Identity.Tests"), (Join-Path $script:RepoRoot "tests"))
    $testFiles = @()
    foreach ($root in $testRoots) {
        if (Test-Path $root) {
            $testFiles += @(Get-ChildItem -Path $root -Filter "*.cs" -Recurse -File | Where-Object { $_.FullName -notmatch "[\\/](bin|obj)[\\/]" })
        }
    }

    $testSource = ""
    foreach ($file in $testFiles) {
        $testSource += [Environment]::NewLine + (Get-Content -Path $file.FullName -Raw)
    }

    $missingRequirementIds = @()
    foreach ($requirementId in $trackedRequirementIds) {
        $pattern = 'RequirementId"\s*,\s*"' + [regex]::Escape($requirementId) + '"'
        if ($testSource -notmatch $pattern) {
            $missingRequirementIds += $requirementId
        }
    }

    if ($missingRequirementIds.Count -gt 0) {
        Write-Host "Hay requisitos de seguridad sin una etiqueta de prueba reconocible:" -ForegroundColor Yellow
        foreach ($requirementId in $missingRequirementIds) {
            Write-Host "  - $requirementId" -ForegroundColor Yellow
            $script:CoverageDebt.Add($requirementId) | Out-Null
        }
        Write-Host "Este inventario solo detecta la presencia de etiquetas; no demuestra que las aserciones sean suficientes." -ForegroundColor Yellow
        Write-Warning "La deuda de cobertura se informa separada del resultado tecnico. Use -FailOnCoverageDebt para convertirla en un gate explicito de QA."
    }
    else {
        Write-Host "Todos los IDs de trazabilidad inventariados aparecen en el codigo de pruebas." -ForegroundColor Green
        Write-Host "La presencia de etiquetas no sustituye la revision de aserciones ni las pruebas manuales/E2E." -ForegroundColor Yellow
    }

    Write-Section "Resumen final"
    Write-Host "Los resultados TRX quedaron en: $script:TestResultsDirectory"
    Write-Host ("The test database {0} is retained for inspection and recreated on the next run." -f $testDatabase)
    Write-Host ("The development database {0} and the PostgreSQL volume were not deleted." -f $configuredDatabase)
    if ($script:Failures.Count -gt 0) {
        Write-Host "BUILD/QA TECNICO: FALLO" -ForegroundColor Red
        foreach ($failure in $script:Failures) {
            Write-Host "  - $failure" -ForegroundColor Red
        }
        throw "La validacion tecnica de Build/QA fallo. Corrija los errores y vuelva a ejecutar el script."
    }

    Write-Host "BUILD TECNICO: APROBADO (restore, formato, build, pruebas .NET y validaciones de Docker ejecutadas)." -ForegroundColor Green
    if ($script:CoverageDebt.Count -gt 0) {
        Write-Host "QA DE FASE 0: PENDIENTE; quedan $($script:CoverageDebt.Count) IDs sin etiqueta de prueba." -ForegroundColor Yellow
        Write-Host "Este resultado tecnico no significa que Fase 0 este cerrada ni que el comportamiento este totalmente cubierto." -ForegroundColor Yellow
        if ($FailOnCoverageDebt) {
            throw "Build tecnico correcto, pero se activo -FailOnCoverageDebt y quedan IDs de cobertura pendientes."
        }
        Write-Host "El proceso termina con exito tecnico por defecto; para exigir el gate de cobertura use -FailOnCoverageDebt." -ForegroundColor Yellow
    }
    else {
        Write-Host "INVENTARIO DE ETIQUETAS: sin IDs pendientes. QA aun debe revisar aserciones, integracion, E2E y casos manuales." -ForegroundColor Green
    }
}
finally {
    Remove-Item Env:PASTEL_TEST_CONNECTION_STRING -ErrorAction SilentlyContinue
    $password = $null
    $script:TestConnectionString = $null
    $script:ComposeConfig = $null
    if ($null -ne $script:ConnectionBuilder) {
        $script:ConnectionBuilder.Clear()
        $script:ConnectionBuilder = $null
    }
}
