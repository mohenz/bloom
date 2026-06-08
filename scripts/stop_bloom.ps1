$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1. Kill Vercel Dev server
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*vercel*dev*" -or $_.CommandLine -like "*vc*dev*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2. Stop PostgreSQL only if CineTube web server is NOT running
$CinetubeRunning = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*http.server*8080*" }
if (-not $CinetubeRunning) {
  $PgRoot = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]$_.Name } -Descending |
    Select-Object -First 1 -ExpandProperty FullName
  if ($PgRoot) {
    $PgBin = Join-Path $PgRoot "bin"
    
    $CinetubePgData = "D:\workspace\cinetube\local\postgres-data"
    if (Test-Path $CinetubePgData) {
      $DataDir = $CinetubePgData
    } else {
      $DataDir = Join-Path $ProjectRoot "local\postgres-data"
    }

    if (Test-Path $DataDir) {
      & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -m fast stop 2>$null
    }
    Write-Host "PostgreSQL (port 54322) stopped."
  }
} else {
  Write-Host "PostgreSQL is kept running because CineTube local service is active."
}

Write-Host "Bloom Universe local service stopped."
