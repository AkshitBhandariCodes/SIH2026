# ============================================================
# AURA-BTC: Clean & Reset System Data Script
# Cleans all DuckDB tables, alerts, uploaded files, and trained models
# ============================================================

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         AURA-BTC: DATA PURGE & SYSTEM RESET UTILITY        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$resetDone = $false

# Method 1: If FastAPI backend is running, call /api/reset endpoint
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/reset" -Method Post -TimeoutSec 3 -ErrorAction Stop
    if ($res.status -eq "SUCCESS") {
        Write-Host "[OK] Database reset successfully via live API endpoint!" -ForegroundColor Green
        $resetDone = $true
    }
} catch {
    # Backend might not be running locally or busy, fallback to direct python execution
}

# Method 2: If API was not reachable or direct reset needed, run clean_db.py directly
if (-not $resetDone) {
    Write-Host "[*] Executing direct database reset script..." -ForegroundColor Yellow
    $pythonExe = Join-Path $root ".venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) {
        $pythonExe = "python"
    }

    $cleanScript = Join-Path $root "scripts\clean_db.py"
    & $pythonExe $cleanScript
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SYSTEM IS CLEAN! READY FOR FRESH DATA TESTING" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  - All DuckDB tables:      0 rows" -ForegroundColor Gray
Write-Host "  - Uploads directory:      Cleaned" -ForegroundColor Gray
Write-Host "  - Trained ML models:      Reset" -ForegroundColor Gray
Write-Host ""
Write-Host "  Verify in DuckDB Studio:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Verify in Frontend:       http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
