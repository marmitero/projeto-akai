param([switch]$NoBrowser, [switch]$SmokeTest, [switch]$PrepareOnly, [switch]$Online, [switch]$Mobile, [string]$LanIp)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot

function Test-Node([string]$NodePath) {
    if (-not (Test-Path -LiteralPath $NodePath)) { return $false }
    try {
        $version = & $NodePath --version 2>$null
        return ($LASTEXITCODE -eq 0 -and $version -match '^v24\.')
    } catch { return $false }
}

try {
    Set-Location -LiteralPath $root
    if (-not (Test-Path -LiteralPath (Join-Path $root 'package-lock.json'))) {
        throw 'Extraia a pasta completa do projeto antes de executar jogar.bat.'
    }
    $node = $null
    if ($env:AKAI_FORCE_PORTABLE_NODE -ne '1') {
        $installed = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($installed -and (Test-Node $installed.Source)) {
            $candidateNpm = Join-Path (Split-Path -Parent $installed.Source) 'npm.cmd'
            if (Test-Path -LiteralPath $candidateNpm) {
                $npmVersion = & $candidateNpm --version 2>$null
                if ($LASTEXITCODE -eq 0 -and $npmVersion -match '^(1[1-9]|[2-9][0-9])\.') { $node = $installed.Source }
            }
        }
    }
    if (-not $node) {
        $version = (Get-Content -LiteralPath (Join-Path $root '.nvmrc') -Raw).Trim()
        if ($version -notmatch '^24\.[0-9]+\.[0-9]+$') { throw 'Versao Node invalida em .nvmrc.' }
        $architecture = $env:PROCESSOR_ARCHITEW6432
        if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
        switch ($architecture.ToUpperInvariant()) {
            'AMD64' { $arch = 'x64' }
            'ARM64' { $arch = 'arm64' }
            default { throw 'Este preview requer Windows 64 bits (x64 ou ARM64).' }
        }
        $runtime = Join-Path $root '.akai-runtime'
        $folder = "node-v$version-win-$arch"
        $nodeFolder = Join-Path $runtime $folder
        $node = Join-Path $nodeFolder 'node.exe'
        if (-not (Test-Node $node)) {
            Write-Host "Baixando Node.js portatil $version ($arch) do site oficial..."
            New-Item -ItemType Directory -Path $runtime -Force | Out-Null
            $staging = Join-Path $runtime ("download-" + [guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $staging | Out-Null
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                $archive = "$folder.zip"
                $zip = Join-Path $staging $archive
                $base = "https://nodejs.org/dist/v$version"
                Invoke-WebRequest -UseBasicParsing -Uri "$base/SHASUMS256.txt" -OutFile (Join-Path $staging 'SHASUMS256.txt')
                Invoke-WebRequest -UseBasicParsing -Uri "$base/$archive" -OutFile $zip
                $line = Get-Content -LiteralPath (Join-Path $staging 'SHASUMS256.txt') | Where-Object { $_ -match ('^[a-fA-F0-9]{64}\s+' + [regex]::Escape($archive) + '$') }
                if (@($line).Count -ne 1) { throw 'Checksum oficial do Node nao encontrado.' }
                $expected = ($line -split '\s+')[0]
                $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
                if ($actual -ne $expected) { throw 'Checksum do download divergiu. Tente novamente.' }
                Expand-Archive -LiteralPath $zip -DestinationPath $staging
                if (Test-Path -LiteralPath $nodeFolder) { Remove-Item -LiteralPath $nodeFolder -Recurse -Force }
                Move-Item -LiteralPath (Join-Path $staging $folder) -Destination $nodeFolder
            } finally {
                if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
            }
            if (-not (Test-Node $node)) { throw 'Nao foi possivel iniciar o Node portatil.' }
        }
    }
    # This process only: do not change the machine PATH or the user's Node installation.
    $env:PATH = (Split-Path -Parent $node) + [IO.Path]::PathSeparator + $env:PATH
    $env:VITE_GAME_MODE = if ($Online) { 'online' } else { 'local' }
    $arguments = @()
    if ($NoBrowser) { $arguments += '--no-browser' }
    if ($SmokeTest) { $arguments += '--smoke-test' }
    if ($PrepareOnly) { $arguments += '--prepare-only' }
    if ($Mobile) { $arguments += '--mobile' }
    if ($LanIp) { $arguments += @('--lan-ip', $LanIp) }
    $launcher = if ($Online) { 'servidor.mjs' } else { 'jogar.mjs' }
    & $node (Join-Path $PSScriptRoot $launcher) @arguments
    exit $LASTEXITCODE
} catch {
    Write-Host ''
    Write-Host ('Nao foi possivel abrir o Projeto Akai: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Na primeira execucao, confira sua internet e permissao de escrita nesta pasta.'
    exit 1
}
