$ErrorActionPreference = 'Stop'
$electronRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Resolve-Path (Join-Path $electronRoot '..\..')
$releaseRoot = Join-Path $projectRoot 'release\windows'
$unpacked = Join-Path $releaseRoot 'win-unpacked'
$zip = Join-Path $releaseRoot 'SkillLibraryMini-Windows-Portable-x64.zip'
if (-not (Test-Path $unpacked)) { throw 'Missing win-unpacked. Run npm run package:win first.' }
Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $unpacked '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Output $zip
