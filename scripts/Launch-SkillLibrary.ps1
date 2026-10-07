$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$server = Join-Path $projectRoot 'server.mjs'
$url = 'http://127.0.0.1:32147'

$running = $false
try { $running = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "$url/api/health").StatusCode -eq 200 } catch { }
if ($running) {
  Start-Process -FilePath 'rundll32.exe' -ArgumentList 'url.dll,FileProtocolHandler', $url
  exit 0
}
Start-Process -FilePath 'node.exe' -ArgumentList ('"{0}" --open' -f $server) -WorkingDirectory $projectRoot -WindowStyle Hidden
