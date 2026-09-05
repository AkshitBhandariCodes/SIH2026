# ============================================================
# AURA-BTC: One-Click System Launcher (Docker & Offline)
# Builds and runs Frontend (3000), Backend (8000), and DuckDB Studio (8080)
# ============================================================

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         AURA-BTC: AUTONOMOUS OFFLINE PLATFORM LAUNCHER     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Step 1: Check Docker
Write-Host "[1/3] Checking Docker daemon status..." -ForegroundColor Yellow
$dockerReady = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        Write-Host "  [OK] Docker engine is active and ready." -ForegroundColor Green
    }
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "  [!] Docker is not running or not installed." -ForegroundColor Red
    Write-Host "  Starting in Native Local Mode (Python + Next.js)..." -ForegroundColor Yellow

    # Start Backend & DuckDB Studio natively in background
    $pythonExe = Join-Path $root ".venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }

    Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn src.db_dashboard:app --host 0.0.0.0 --port 8080" -WindowStyle Hidden
    Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn src.api.main:app --host 0.0.0.0 --port 8000" -WindowStyle Hidden

    # Start Frontend
    Set-Location (Join-Path $root "aura-btc-dashboard")
    Start-Process -FilePath "bun" -ArgumentList "run dev --port 3000" -WindowStyle Hidden
    Set-Location $root
} else {
    # Step 2: Ensure ports 3000, 8000, 8080 are free from conflicting local host processes
    $ports = @(3000, 8000, 8080)
    foreach ($p in $ports) {
        try {
            $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
            foreach ($c in $conns) {
                $procId = $c.OwningProcess
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -notmatch "docker|com.docker") {
                    Write-Host "  Freeing port $p (Stopping conflicting host process: $($proc.ProcessName) PID $procId)..." -ForegroundColor DarkGray
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {}
    }

    # Build & Start Containers via Docker Compose
    Write-Host "[2/3] Building & starting AURA-BTC Docker containers..." -ForegroundColor Yellow
    docker compose up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Docker compose encountered an issue. Check logs." -ForegroundColor Red
        exit 1
    }
}

# Step 3: Health Verification
Write-Host "[3/3] Verifying service readiness..." -ForegroundColor Yellow

$backendOk = $false
$studioOk = $false
$frontendOk = $false

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    if (-not $backendOk) {
        try {
            $r = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($r.status -eq "ONLINE") { $backendOk = $true }
        } catch {}
    }
    if (-not $studioOk) {
        try {
            $r = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($r.status -eq "ONLINE") { $studioOk = $true }
        } catch {}
    }
    if (-not $frontendOk) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($r.StatusCode -eq 200) { $frontendOk = $true }
        } catch {}
    }

    if ($backendOk -and $studioOk -and $frontendOk) { break }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "      AURA-BTC PLATFORM IS ONLINE & OPERATIONAL!            " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [1] FRONTEND FORENSIC DASHBOARD :" -ForegroundColor White -NoNewline
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "      (Interactive Graph Canvas, Alerts Triage & Dossier)" -ForegroundColor Gray
Write-Host ""
Write-Host "  [2] CORE BACKEND REST API       :" -ForegroundColor White -NoNewline
Write-Host "  http://localhost:8000" -ForegroundColor Cyan
Write-Host "      (Interactive Swagger Docs   :" -ForegroundColor Gray -NoNewline
Write-Host "  http://localhost:8000/docs)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [3] DUCKDB DATABASE DASHBOARD   :" -ForegroundColor White -NoNewline
Write-Host "  http://localhost:8080" -ForegroundColor Cyan
Write-Host "      (Live SQL Query Console, Table Inspector & Metrics)" -ForegroundColor Gray
Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Useful Commands:" -ForegroundColor Gray
Write-Host "  - View live logs:     docker compose logs -f" -ForegroundColor Gray
Write-Host "  - Wipe/Reset Data:    powershell .\deletedata.ps1" -ForegroundColor Gray
Write-Host "  - Stop platform:      docker compose down" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Green
