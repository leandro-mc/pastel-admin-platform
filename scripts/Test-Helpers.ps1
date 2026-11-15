Set-StrictMode -Version Latest

function Get-TestResultSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ResultsDirectory
    )

    $summary = @{
        Files = 0
        Total = 0
        Passed = 0
        Failed = 0
        Skipped = 0
        ParseFailed = $false
    }

    $trxFiles = @(Get-ChildItem -Path $ResultsDirectory -Filter "*.trx" -File -Recurse -ErrorAction SilentlyContinue)
    $summary.Files = $trxFiles.Count

    foreach ($trxFile in $trxFiles) {
        try {
            [xml]$trx = Get-Content -Path $trxFile.FullName -Raw
            $counters = $trx.SelectSingleNode('//*[local-name()="Counters"]')
            if ($null -eq $counters) {
                $summary.ParseFailed = $true
                continue
            }

            foreach ($counterName in @("total", "passed", "failed", "error", "notExecuted", "notRunnable", "inconclusive", "aborted", "timeout", "pending")) {
                $attribute = $counters.Attributes[$counterName]
                if ($null -eq $attribute) {
                    continue
                }

                $value = 0
                if (-not [int]::TryParse($attribute.Value, [ref]$value)) {
                    $summary.ParseFailed = $true
                    continue
                }

                switch ($counterName) {
                    "total" { $summary.Total += $value }
                    "passed" { $summary.Passed += $value }
                    { $_ -in @("failed", "error") } { $summary.Failed += $value }
                    default { $summary.Skipped += $value }
                }
            }
        }
        catch {
            $summary.ParseFailed = $true
            Write-Host ("No se pudo interpretar el resultado TRX: {0}" -f $trxFile.Name) -ForegroundColor Red
        }
    }

    return [pscustomobject]$summary
}

function Assert-TestResultSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Label,

        [Parameter(Mandatory)]
        [pscustomobject]$Summary
    )

    Write-Host ("Resultados TRX: {0}; total: {1}; aprobadas: {2}; fallidas/errores: {3}; omitidas/no ejecutadas: {4}" -f $Summary.Files, $Summary.Total, $Summary.Passed, $Summary.Failed, $Summary.Skipped)

    if ($Summary.ParseFailed -or $Summary.Files -lt 1 -or $Summary.Total -lt 1 -or $Summary.Failed -ne 0 -or $Summary.Skipped -ne 0 -or $Summary.Passed -ne $Summary.Total) {
        throw ("{0}: los resultados TRX no confirman que todas las pruebas se ejecutaron y aprobaron." -f $Label)
    }

    Write-Host ("Correcto: todas las pruebas de {0} pasaron sin omisiones." -f $Label) -ForegroundColor Green
}
