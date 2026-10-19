[CmdletBinding()]
param(
    [switch]$SkipContainerBuild,
    [switch]$AllowIncompleteCoverage
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
$script:CoverageIncomplete = $false
$password = $null

$testDatabase = "pastel_integration_tests"

# WP3/WP4 IDs that must be represented by automated tests before WP5 can start.
# Each corresponding xUnit test/class must include [Trait("RequirementId", "F0-S101")]
# with the matching ID.
$requiredRequirementIds = @()
for ($id = 101; $id -le 116; $id++) {
    $requiredRequirementIds += "F0-S$id"
}
$requiredRequirementIds += @(
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
            if ($trxParseFailed -or $trxFiles.Count -eq 0 -or $totalTests -lt 21 -or $failedTests -ne 0 -or $notExecutedTests -ne 0 -or $passedTests -ne $totalTests) {
                $script:Failures.Add("Los resultados TRX no confirman que todas las pruebas .NET (minimo 21) pasaron sin omisiones.") | Out-Null
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

    # Presence gate for requirements; QA must also inspect the actual assertions.
    Write-Section "Cobertura obligatoria previa a WP5"
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
    foreach ($requirementId in $requiredRequirementIds) {
        $pattern = 'RequirementId"\s*,\s*"' + [regex]::Escape($requirementId) + '"'
        if ($testSource -notmatch $pattern) {
            $missingRequirementIds += $requirementId
        }
    }

    if ($missingRequirementIds.Count -gt 0) {
        Write-Host "Faltan pruebas etiquetadas para estos requisitos obligatorios/importantes:" -ForegroundColor Yellow
        foreach ($requirementId in $missingRequirementIds) {
            Write-Host "  - $requirementId" -ForegroundColor Yellow
        }
        Write-Host ('Etiquete cada prueba xUnit con [Trait("RequirementId", "' + $missingRequirementIds[0] + '")] usando el ID correspondiente.')
        Write-Host "Las etiquetas solo controlan presencia; QA debe revisar que cada prueba compruebe el comportamiento completo."
        if (-not $AllowIncompleteCoverage) {
            $script:Failures.Add("Cobertura de WP3/WP4 incompleta; el gate previo a WP5 sigue bloqueado.") | Out-Null
        }
        else {
            $script:CoverageIncomplete = $true
            Write-Warning "-AllowIncompleteCoverage es solo para diagnostico; no significa que WP3/WP4 esten cerrados ni autoriza considerar listo WP5."
        }
    }
    else {
        Write-Host "Correcto: todos los IDs de cobertura exigidos aparecen en el codigo de pruebas." -ForegroundColor Green
    }

    Write-Section "Resumen final"
    Write-Host "Los resultados TRX quedaron en: $script:TestResultsDirectory"
    Write-Host ("The test database {0} is retained for inspection and recreated on the next run." -f $testDatabase)
    Write-Host ("The development database {0} and the PostgreSQL volume were not deleted." -f $configuredDatabase)
    if ($script:Failures.Count -gt 0) {
        Write-Host "VALIDACION NO APROBADA:" -ForegroundColor Red
        foreach ($failure in $script:Failures) {
            Write-Host "  - $failure" -ForegroundColor Red
        }
        throw "La validacion previa a WP5 no esta completa. Corrija los fallos y vuelva a ejecutar el script."
    }

    if ($script:CoverageIncomplete) {
        Write-Host "VALIDACION TECNICA TERMINADA, PERO LA COBERTURA PREVIA A WP5 SIGUE INCOMPLETA. NO inicie WP5." -ForegroundColor Yellow
    }
    else {
        Write-Host "VALIDACION TECNICA Y COBERTURA PREVIA A WP5 APROBADAS." -ForegroundColor Green
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
