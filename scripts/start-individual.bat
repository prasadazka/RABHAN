@echo off
echo.
echo ====================================================
echo 🔧 RABHAN Platform - Individual Service Launcher
echo ====================================================
echo.

if "%1"=="" (
    echo Usage: scripts\start-individual.bat [service-name]
    echo.
    echo Available services:
    echo ================================
    echo 🔐 auth          - Auth Service ^(Port 3001^)
    echo 👥 user          - User Service ^(Port 3002^)
    echo 📁 document      - Document Service ^(Port 3003^)
    echo 🏗️ contractor    - Contractor Service ^(Port 3004^)
    echo 🌞 calculator    - Solar Calculator Service ^(Port 3005^)
    echo ⚙️ admin         - Admin Service ^(Port 3006^)
    echo 🛒 marketplace   - Marketplace Service ^(Port 3007^)
    echo 📂 document-proxy - Document Proxy Service ^(Port 3008^)
    echo 💻 web           - Main Web App ^(Port 3000^)
    echo 🔧 admin-dash    - Admin Dashboard ^(Port 3010^)
    echo.
    echo Examples:
    echo   scripts\start-individual.bat auth
    echo   scripts\start-individual.bat web
    echo   scripts\start-individual.bat calculator
    pause
    exit /b 1
)

set SERVICE=%1

if "%SERVICE%"=="auth" (
    echo 🔐 Starting Auth Service ^(Port 3001^)...
    cd /d "%~dp0..\backend\services\auth-service"
    start "RABHAN Auth Service - Port 3001" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="user" (
    echo 👥 Starting User Service ^(Port 3002^)...
    cd /d "%~dp0..\backend\services\user-service"
    start "RABHAN User Service - Port 3002" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="document" (
    echo 📁 Starting Document Service ^(Port 3003^)...
    cd /d "%~dp0..\backend\services\document-service"
    start "RABHAN Document Service - Port 3003" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="contractor" (
    echo 🏗️ Starting Contractor Service ^(Port 3004^)...
    cd /d "%~dp0..\backend\services\contractor-service"
    start "RABHAN Contractor Service - Port 3004" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="calculator" (
    echo 🌞 Starting Solar Calculator Service ^(Port 3005^)...
    cd /d "%~dp0..\backend\services\solar-calculator-service"
    start "RABHAN Solar Calculator - Port 3005" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="admin" (
    echo ⚙️ Starting Admin Service ^(Port 3006^)...
    cd /d "%~dp0..\backend\services\admin-service"
    start "RABHAN Admin Service - Port 3006" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="marketplace" (
    echo 🛒 Starting Marketplace Service ^(Port 3007^)...
    cd /d "%~dp0..\backend\services\marketplace-service"
    start "RABHAN Marketplace Service - Port 3007" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="document-proxy" (
    echo 📂 Starting Document Proxy Service ^(Port 3008^)...
    cd /d "%~dp0..\backend\services\document-proxy-service"
    start "RABHAN Document Proxy - Port 3008" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="web" (
    echo 💻 Starting Main Web App ^(Port 3000^)...
    cd /d "%~dp0..\frontend\rabhan-web"
    start "RABHAN Web App - Port 3000" cmd /k "npm run dev"
    goto :success
)

if "%SERVICE%"=="admin-dash" (
    echo 🔧 Starting Admin Dashboard ^(Port 3010^)...
    cd /d "%~dp0..\frontend\admin-dashboard"
    start "RABHAN Admin Dashboard - Port 3010" cmd /k "npm run dev"
    goto :success
)

echo ❌ Unknown service: %SERVICE%
echo.
echo Available services: auth, user, document, contractor, calculator, admin, marketplace, document-proxy, web, admin-dash
pause
exit /b 1

:success
echo ✅ %SERVICE% service is starting...
echo ⏳ Please wait a moment for the service to initialize
echo 🔍 Check the new window for startup logs
echo.
pause