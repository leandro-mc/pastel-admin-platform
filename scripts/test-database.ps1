[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "Test-Helpers.ps1")

$testDatabase = "pastel_integration_tests"
$connectionBuilder = $null
$dbPassword = $null
$resultsDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("pastel-database-tests-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $resultsDirectory -Force | Out-Null

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "No se encontro Docker en PATH."
    }
    if (-not (Test-Path (Join-Path $script:RepoRoot "compose.yaml"))) {
        throw "No se encontro compose.yaml."
    }

    # Compose config may contain secrets; capture its JSON and never print it.
    $null = & docker compose config --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose config --quiet fallo. Revise .env y compose.yaml; no se imprimieron secretos."
    }

    $composeLines = @(& docker compose config --format json 2>$null)
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo leer la configuracion efectiva de Docker Compose."
    }

    try {
        $composeConfig = (($composeLines -join [Environment]::NewLine) | ConvertFrom-Json)
    }
    catch {
        throw "No se pudo interpretar la configuracion efectiva de Docker Compose."
    }

    $dbService = $composeConfig.services.db
    if ($null -eq $dbService) {
        throw "compose.yaml no declara el servicio PostgreSQL 'db'."
    }

    $dbEnvironment = $dbService.environment
    $dbNameProperty = $dbEnvironment.PSObject.Properties["POSTGRES_DB"]
    $dbUserProperty = $dbEnvironment.PSObject.Properties["POSTGRES_USER"]
    $dbPasswordProperty = $dbEnvironment.PSObject.Properties["POSTGRES_PASSWORD"]
    if ($null -eq $dbNameProperty -or $null -eq $dbUserProperty -or $null -eq $dbPasswordProperty) {
        throw "La configuracion de db debe definir POSTGRES_DB, POSTGRES_USER y POSTGRES_PASSWORD."
    }

    $configuredDatabase = [string]$dbNameProperty.Value
    $dbUser = [string]$dbUserProperty.Value
    $dbPassword = [string]$dbPasswordProperty.Value

    if ([string]::IsNullOrWhiteSpace($configuredDatabase) -or [string]::IsNullOrWhiteSpace($dbUser) -or [string]::IsNullOrWhiteSpace($dbPassword)) {
        throw "La configuracion PostgreSQL efectiva tiene valores vacios."
    }
    if ($configuredDatabase -ieq $testDatabase) {
        throw ("POSTGRES_DB no puede usar el nombre reservado para pruebas: {0}" -f $testDatabase)
    }

    Write-Host "Iniciando unicamente PostgreSQL (no se levantan API ni frontend)." -ForegroundColor Cyan
    & docker compose up -d db
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo iniciar el servicio db."
    }

    Write-Host "Esperando a que PostgreSQL este listo..."
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
        throw "PostgreSQL no estuvo listo tras 120 segundos. Revise docker compose logs db."
    }

    # Solo se recrea el nombre fijo reservado para pruebas. No se eliminan la base normal ni el volumen.
    Write-Host ("Recreando exclusivamente la base reservada {0}..." -f $testDatabase)
    & docker compose exec -T db psql -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $testDatabase WITH (FORCE);"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo eliminar la base de pruebas anterior."
    }
    & docker compose exec -T db psql -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $testDatabase;"
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear la base de pruebas."
    }

    # Resolve the Compose network dynamically instead of assuming its generated name.
    $dbContainerId = ((& docker compose ps -q db) | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($dbContainerId)) {
        throw "No se encontro el contenedor PostgreSQL tras iniciarlo."
    }
    $networkOutput = @(& docker inspect --format '{{range $name, $config := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}' $dbContainerId)
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo resolver la red Docker del servicio db."
    }
    $networkName = @($networkOutput | ForEach-Object { ([string]$_).Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
    if ($networkName.Count -ne 1) {
        throw "No se pudo determinar una red Docker para conectar el ejecutor de pruebas."
    }

    $connectionBuilder = [System.Data.Common.DbConnectionStringBuilder]::new()
    $connectionBuilder["Host"] = "db"
    $connectionBuilder["Port"] = 5432
    $connectionBuilder["Database"] = $testDatabase
    $connectionBuilder["Username"] = $dbUser
    $connectionBuilder["Password"] = $dbPassword
    $connectionBuilder["GSS Encryption Mode"] = "Disable"
    $env:PASTEL_TEST_CONNECTION_STRING = $connectionBuilder.ConnectionString

    $containerScript = @'
set -e
mkdir -p /tmp/work /test-results
cp -a /repo/. /tmp/work/
find /tmp/work -type d \( -name .git -o -name node_modules -o -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -f /tmp/work/.env
cd /tmp/work
dotnet restore tests/Pastel.IntegrationTests/Pastel.IntegrationTests.csproj
dotnet test tests/Pastel.IntegrationTests/Pastel.IntegrationTests.csproj \
  --configuration Release --no-restore \
  --logger 'trx;LogFileName=database-tests.trx' \
  --results-directory /test-results
'@

    Write-Host "Ejecutando las pruebas HTTP + PostgreSQL en un contenedor .NET 10." -ForegroundColor Cyan
    Write-Host ("Resultados TRX: {0}" -f $resultsDirectory)
    $dockerArguments = @(
        "run", "--rm",
        "--network", [string]$networkName[0],
        "--mount", ("type=bind,source={0},target=/repo,readonly" -f $script:RepoRoot),
        "--mount", ("type=bind,source={0},target=/test-results" -f $resultsDirectory),
        "--env", "PASTEL_TEST_CONNECTION_STRING",
        "--entrypoint", "sh",
        "mcr.microsoft.com/dotnet/sdk:10.0",
        "-lc", $containerScript
    )

    & docker @dockerArguments
    $dockerExitCode = $LASTEXITCODE
    $summary = Get-TestResultSummary -ResultsDirectory $resultsDirectory
    Assert-TestResultSummary -Label "integracion PostgreSQL" -Summary $summary

    if ($dockerExitCode -ne 0) {
        throw ("Las pruebas de integracion devolvieron codigo {0}." -f $dockerExitCode)
    }

    Write-Host ("BASE DE DATOS: APROBADO. La base {0} se conserva para inspeccion y se recreara en la siguiente ejecucion." -f $testDatabase) -ForegroundColor Green
    Write-Host ("La base de desarrollo '{0}' y el volumen de PostgreSQL no se eliminaron." -f $configuredDatabase) -ForegroundColor Green
}
finally {
    Remove-Item Env:PASTEL_TEST_CONNECTION_STRING -ErrorAction SilentlyContinue
    $dbPassword = $null
    if ($null -ne $connectionBuilder) {
        $connectionBuilder.Clear()
        $connectionBuilder = $null
    }
}
