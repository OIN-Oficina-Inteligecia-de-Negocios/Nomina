$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectDirectory '.tunnel.pid'

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host 'No hay un túnel registrado.'
  exit 0
}

$tunnelPid = [int](Get-Content -LiteralPath $pidFile -Raw)
$process = Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue
if ($process) {
  if ($process.ProcessName -ne 'ssh') {
    throw "El PID $tunnelPid no corresponde a ssh; no se detuvo ningún proceso."
  }
  Stop-Process -Id $tunnelPid
}

Remove-Item -LiteralPath $pidFile -Force
Write-Host 'Túnel SSH detenido.'
