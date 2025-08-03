# RABHAN Services Startup Script
Write-Host "Starting RABHAN services with port cleanup..." -ForegroundColor Green
Write-Host ""

# Step 1: Cleanup ports
Write-Host "Step 1: Cleaning up existing processes..." -ForegroundColor Cyan
& "$PSScriptRoot\cleanup-ports.ps1"

# Step 2: Test PostgreSQL
Write-Host "Step 2: Testing PostgreSQL connection..." -ForegroundColor Cyan
try {
    $result = & node "$PSScriptRoot\test-postgresql.js"
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL connection failed"
    }
    Write-Host "PostgreSQL is ready!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: PostgreSQL is not running or not accessible" -ForegroundColor Red
    Write-Host "Please start PostgreSQL and make sure it's running with:" -ForegroundColor Yellow
    Write-Host "- Host: localhost" -ForegroundColor Yellow
    Write-Host "- Port: 5432" -ForegroundColor Yellow
    Write-Host "- Username: postgres" -ForegroundColor Yellow
    Write-Host "- Password: 12345" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 3: Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start services
Write-Host "Starting Auth Service on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend\services\auth-service'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Document Service on port 3002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend\services\document-service'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting User Service on port 3003..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend\services\user-service'; npx ts-node src/server.ts" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\frontend\rabhan-web'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All RABHAN services are starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "- Auth Service:      http://localhost:3001" -ForegroundColor Cyan
Write-Host "- Document Service:  http://localhost:3002" -ForegroundColor Cyan
Write-Host "- User Service:      http://localhost:3003" -ForegroundColor Cyan
Write-Host "- Frontend:          http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wait 10-15 seconds for all services to initialize" -ForegroundColor Yellow
Write-Host "Check each service window for startup status" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"