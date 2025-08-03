@echo off
echo Starting RABHAN services with port cleanup...
echo.

REM First cleanup any existing processes
echo Step 1: Cleaning up existing processes...
call "%~dp0cleanup-ports.bat"

echo.
echo Step 2: Starting services...
echo.

REM Check PostgreSQL is running
echo Checking PostgreSQL connection...
cd "%~dp0"
node test-postgresql.js
if errorlevel 1 (
    echo ERROR: PostgreSQL is not running or not accessible
    echo Please start PostgreSQL and make sure it's running with:
    echo - Host: localhost
    echo - Port: 5432
    echo - Username: postgres
    echo - Password: 12345
    pause
    exit /b 1
)

echo.
echo PostgreSQL is ready!
echo.

REM Start auth service
echo Starting Auth Service on port 3001...
start "RABHAN Auth Service" cmd /k "cd /d %~dp0..\backend\services\auth-service && npm run dev"
timeout /t 3 /nobreak > nul

REM Start document service
echo Starting Document Service on port 3002...
start "RABHAN Document Service" cmd /k "cd /d %~dp0..\backend\services\document-service && npm run dev"
timeout /t 3 /nobreak > nul

REM Start user service
echo Starting User Service on port 3003...
start "RABHAN User Service" cmd /k "cd /d %~dp0..\backend\services\user-service && npx ts-node src/server.ts"
timeout /t 3 /nobreak > nul

REM Start frontend
echo Starting Frontend on port 3000...
start "RABHAN Frontend" cmd /k "cd /d %~dp0..\frontend\rabhan-web && npm run dev"

echo.
echo ========================================
echo All RABHAN services are starting...
echo ========================================
echo.
echo Services:
echo - Auth Service:      http://localhost:3001
echo - Document Service:  http://localhost:3002
echo - User Service:      http://localhost:3003
echo - Frontend:          http://localhost:3000
echo.
echo Wait 10-15 seconds for all services to initialize
echo Check each service window for startup status
echo.
pause