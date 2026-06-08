$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LocalDir = Join-Path $ProjectRoot "local"
$VercelOutLog = Join-Path $LocalDir "vercel.out.log"
$VercelErrLog = Join-Path $LocalDir "vercel.err.log"
$Url = "http://localhost:3000"

New-Item -ItemType Directory -Force $LocalDir | Out-Null

# 1. PostgreSQL DB Start
$PgRoot = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $PgRoot) {
  throw "PostgreSQL was not found under C:\Program Files\PostgreSQL"
}
$PgBin = Join-Path $PgRoot "bin"

# Share the data folder with CineTube if it exists to preserve the "persona-online" DB
$CinetubePgData = "D:\workspace\cinetube\local\postgres-data"
if (Test-Path $CinetubePgData) {
  $DataDir = $CinetubePgData
} else {
  $DataDir = Join-Path $ProjectRoot "local\postgres-data"
}

$serverReady = & (Join-Path $PgBin "pg_isready.exe") -h 127.0.0.1 -p 54322 2>$null
if ($LASTEXITCODE -ne 0) {
  if (-not (Test-Path $DataDir)) {
    & (Join-Path $PgBin "initdb.exe") -D $DataDir -U postgres --auth=trust --encoding=UTF8 --locale=C
  }
  
  # Remove potential BOM in config files to prevent startup failure
  $ConfigPaths = @(
    (Join-Path $DataDir "PG_VERSION"),
    (Join-Path $DataDir "postgresql.conf"),
    (Join-Path $DataDir "postgresql.auto.conf")
  )
  foreach ($ConfigPath in $ConfigPaths) {
    if (Test-Path $ConfigPath) {
      $bytes = [System.IO.File]::ReadAllBytes($ConfigPath)
      if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        [System.IO.File]::WriteAllBytes($ConfigPath, $bytes[3..($bytes.Length - 1)])
      }
    }
  }

  & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -o "-p 54322" -l (Join-Path $LocalDir "postgres.log") start
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL start failed."
  }
}

# 2. Vercel Dev Server Start
$vercelReady = $false
try {
  $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
  $vercelReady = $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
} catch {
  $vercelReady = $false
}

if (-not $vercelReady) {
  Start-Process -FilePath "npx.cmd" -ArgumentList @("vercel", "dev", "--listen", "3000") -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $VercelOutLog -RedirectStandardError $VercelErrLog
  
  # Wait for Vercel Dev to be ready
  $retries = 10
  while (-not $vercelReady -and $retries -gt 0) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
      $vercelReady = $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
      $vercelReady = $false
    }
    $retries--
  }
}

Start-Process $Url

Write-Host "Bloom Universe local service is ready."
Write-Host "Open: $Url"
