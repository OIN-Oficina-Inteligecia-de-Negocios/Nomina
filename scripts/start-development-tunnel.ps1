param(
  [string]$ConfigFile = (Join-Path $PSScriptRoot '..\.env.ssh')
)

$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectDirectory '.tunnel.pid'

if (-not (Test-Path -LiteralPath $ConfigFile)) {
  throw "No existe $ConfigFile. Copia .env.ssh.example como .env.ssh y ajusta la ruta de la llave."
}

$settings = @{}
Get-Content -LiteralPath $ConfigFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#')) {
    $name, $value = $line -split '=', 2
    $settings[$name.Trim()] = $value.Trim()
  }
}

$required = @(
  'SSH_HOST',
  'SSH_USER',
  'SSH_KEY_PATH',
  'SSH_LOCAL_PORT',
  'SSH_REMOTE_DB_HOST',
  'SSH_REMOTE_DB_PORT'
)
foreach ($name in $required) {
  if (-not $settings[$name]) { throw "Falta $name en $ConfigFile." }
}

$keyPath = $settings['SSH_KEY_PATH']
if (-not (Test-Path -LiteralPath $keyPath)) {
  throw "No se encontró la llave SSH: $keyPath"
}

if (Test-Path -LiteralPath $pidFile) {
  $existingPid = [int](Get-Content -LiteralPath $pidFile -Raw)
  $existing = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
  if ($existing -and $existing.ProcessName -eq 'ssh') {
    Write-Host "El túnel ya está activo (PID $existingPid)."
    exit 0
  }
  Remove-Item -LiteralPath $pidFile -Force
}

$forward = "127.0.0.1:$($settings['SSH_LOCAL_PORT']):$($settings['SSH_REMOTE_DB_HOST']):$($settings['SSH_REMOTE_DB_PORT'])"
$forwardArguments = @('-L', $forward)
$storageForward = $null
if (
  $settings['SSH_LOCAL_STORAGE_PORT'] -and
  $settings['SSH_REMOTE_STORAGE_HOST'] -and
  $settings['SSH_REMOTE_STORAGE_PORT']
) {
  $storageForward = "127.0.0.1:$($settings['SSH_LOCAL_STORAGE_PORT']):$($settings['SSH_REMOTE_STORAGE_HOST']):$($settings['SSH_REMOTE_STORAGE_PORT'])"
  $forwardArguments += @('-L', $storageForward)
}

$sshArguments = @('-N', '-T') + $forwardArguments + @(
  '-i', "`"$keyPath`"",
  '-o', 'BatchMode=yes',
  '-o', 'ExitOnForwardFailure=yes',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ServerAliveCountMax=3',
  "$($settings['SSH_USER'])@$($settings['SSH_HOST'])"
)

$process = Start-Process -FilePath 'ssh.exe' -ArgumentList $sshArguments -WindowStyle Hidden -PassThru
$process.Id | Set-Content -LiteralPath $pidFile -Encoding ascii
Start-Sleep -Seconds 2

if ($process.HasExited) {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  throw 'El túnel SSH no pudo iniciar. Revisa la llave, el host y el puerto.'
}

Write-Host "Túnel activo: localhost:$($settings['SSH_LOCAL_PORT']) -> $($settings['SSH_HOST']):$($settings['SSH_REMOTE_DB_PORT']) (PID $($process.Id))."
if ($storageForward) {
  Write-Host "Archivos disponibles en localhost:$($settings['SSH_LOCAL_STORAGE_PORT'])."
}
