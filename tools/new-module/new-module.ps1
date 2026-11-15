<#
.SYNOPSIS
  Genera el esqueleto de un modulo de Pastel (backend, pruebas vacias, frontend y fichas MODULE.md).
.EXAMPLE
  ./tools/new-module/new-module.ps1 -Codigo cosecha -Nombre "Cosecha" -Icon Sprout -Order 40 -Tagline "De la finca al comprador"
.NOTES
  Equivalente de new-module.sh con las mismas plantillas (tools/new-module/templates). Solo ASCII en este archivo
  para evitar problemas de codificacion en Windows PowerShell 5.1; las plantillas se leen y escriben como UTF-8 sin BOM.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Codigo,
    [Parameter(Mandatory = $true)][string]$Nombre,
    [string]$Icon = 'LayoutGrid',
    [int]$Order = 100,
    [string]$Tagline = ([string][char]0x50 + 'roximamente'),
    [ValidateSet('permission', 'authenticated', 'public')][string]$Access = 'permission',
    [switch]$NoSlnx
)
$ErrorActionPreference = 'Stop'

if ($Codigo -cnotmatch '^[a-z][a-z0-9]{1,31}$') { throw 'El codigo debe ir en minusculas y numeros (2 a 32 caracteres, empieza con letra).' }
if (@('identity', 'auth', 'admin', 'api', 'health', 'platform', 'cuenta', 'configuracion', 'ingresar') -contains $Codigo) { throw "El codigo '$Codigo' es una palabra reservada." }
if ($Icon -notmatch '^[A-Za-z][A-Za-z0-9]*$') { throw 'El icono debe ser un identificador de Lucide (p. ej. Sprout).' }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $here '..\..')).Path
$pascal = $Codigo.Substring(0, 1).ToUpperInvariant() + $Codigo.Substring(1)
$upper = $Codigo.ToUpperInvariant()
$sort = 200 + $Order
$backendDir = Join-Path $root "src\Modules\$pascal"
$webDir = Join-Path $root "web\src\modules\$Codigo"
if (Test-Path $backendDir) { throw "Ya existe $backendDir. No se sobrescribe." }
if (Test-Path $webDir) { throw "Ya existe $webDir. No se sobrescribe." }

$utf8 = New-Object System.Text.UTF8Encoding($false)
$tokens = [ordered]@{
    '__PASCAL__' = $pascal; '__CODE__' = $Codigo; '__NAME__' = $Nombre; '__UPPER__' = $upper; '__ICON__' = $Icon
    '__ORDER__' = "$Order"; '__SORT__' = "$sort"; '__TAGLINE__' = $Tagline; '__ACCESS__' = $Access
}

function Convert-Text([string]$text) {
    foreach ($key in $tokens.Keys) { $text = $text.Replace($key, $tokens[$key]) }
    return $text
}

function Render-Templates([string]$source, [string]$destination) {
    $sourceFull = (Resolve-Path $source).Path
    Get-ChildItem -Path $sourceFull -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($sourceFull.Length).TrimStart('\', '/')
        $relative = (Convert-Text $relative) -replace '\.tmpl$', ''
        $target = Join-Path $destination $relative
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
        $content = [System.IO.File]::ReadAllText($_.FullName, $utf8)
        [System.IO.File]::WriteAllText($target, ((Convert-Text $content) -replace "`r`n", "`n"), $utf8)
    }
}

Render-Templates (Join-Path $here 'templates\backend') $backendDir
Render-Templates (Join-Path $here 'templates\web') $webDir

if (-not $NoSlnx) {
    $slnx = Join-Path $root 'Pastel.slnx'
    $text = [System.IO.File]::ReadAllText($slnx, $utf8)
    if ($text.Contains("/Modules/$pascal/")) {
        Write-Host "Pastel.slnx ya contiene /Modules/$pascal/; no se modifica."
    }
    else {
        $block = "  <Folder Name=`"/Modules/$pascal/`">`n    <Project Path=`"src/Modules/$pascal/Pastel.Modules.$pascal/Pastel.Modules.$pascal.csproj`" />`n    <Project Path=`"src/Modules/$pascal/Pastel.Modules.$pascal.Tests/Pastel.Modules.$pascal.Tests.csproj`" />`n  </Folder>`n"
        $marker = '  <Folder Name="/Tests/">'
        $index = $text.IndexOf($marker)
        if ($index -lt 0) { throw 'No se encontro la carpeta /Tests/ en Pastel.slnx.' }
        [System.IO.File]::WriteAllText($slnx, $text.Insert($index, $block), $utf8)
    }
}

Write-Host "Modulo '$Nombre' ($Codigo) generado."
Write-Host "  backend:  src/Modules/$pascal"
Write-Host "  frontend: web/src/modules/$Codigo"
Write-Host 'Pasos siguientes:'
Write-Host "  1. Completar permisos y roles sugeridos desde docs/modules/$upper.md en ${pascal}Permissions.cs y ${pascal}Module.cs."
Write-Host '  2. Agregar el color y el icono en web/src/core/design/module-themes.css (CCR si el modulo es nuevo).'
Write-Host "  3. Build genera la migracion inicial con 'dotnet ef' (ver ${pascal}DbContextFactory.cs): sin migracion, el host no arranca con este modulo."
