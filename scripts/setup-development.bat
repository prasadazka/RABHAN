@echo off
REM RABHAN Platform - Development Environment Setup Script (Windows)
REM This script automates the setup process for new developers on Windows

setlocal enabledelayedexpansion

echo 🚀 RABHAN Platform - Development Setup (Windows)
echo =====================================================

REM Helper functions for colored output
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Check system requirements
echo %BLUE%[INFO]%NC% Checking system requirements...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Node.js not found. Please install Node.js 18+ from https://nodejs.org
    exit /b 1
) else (
    for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
    set NODE_MAJOR=!NODE_MAJOR:v=!
    if !NODE_MAJOR! GEQ 18 (
        echo %GREEN%[SUCCESS]%NC% Node.js %NODE_VERSION% ✓
    ) else (
        echo %RED%[ERROR]%NC% Node.js version 18+ required
        exit /b 1
    )
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% npm not found
    exit /b 1
) else (
    echo %GREEN%[SUCCESS]%NC% npm ✓
)

REM Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% PostgreSQL not found in PATH. Please ensure PostgreSQL is installed.
) else (
    echo %GREEN%[SUCCESS]%NC% PostgreSQL ✓
)

REM Check Redis
redis-server --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% Redis not found in PATH. Please ensure Redis is installed.
) else (
    echo %GREEN%[SUCCESS]%NC% Redis ✓
)

REM Check Git
git --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Git not found. Please install Git.
    exit /b 1
) else (
    echo %GREEN%[SUCCESS]%NC% Git ✓
)

echo.

REM Get database password
set /p DB_PASSWORD="Enter PostgreSQL password for rabhan_dev user: "

REM Get JWT secret or generate one
set /p JWT_SECRET="Enter JWT secret (or press Enter for auto-generated): "
if "!JWT_SECRET!"=="" (
    set JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure_for_development
    echo %BLUE%[INFO]%NC% Using default JWT secret for development
)

echo.
echo %BLUE%[INFO]%NC% Creating environment files...

REM Create backend service environment files
set SERVICES=auth-service user-service contractor-service document-service quote-service admin-service marketplace-service
set PORTS=3001 3002 3004 3003 3005 3006 3007
set DATABASES=rabhan_auth rabhan_users rabhan_contractors rabhan_documents rabhan_quotes rabhan_admin rabhan_marketplace

set i=0
for %%s in (%SERVICES%) do (
    set /a i+=1
    call :create_backend_env %%s !i!
)

REM Create frontend environment files
call :create_frontend_env rabhan-web
call :create_frontend_env admin-dashboard

echo.
echo %BLUE%[INFO]%NC% Installing dependencies...

REM Install backend dependencies
for %%s in (%SERVICES%) do (
    if exist "backend\services\%%s\" (
        echo Installing dependencies for %%s...
        cd "backend\services\%%s"
        npm install --silent
        cd ..\..\..
        echo %GREEN%[SUCCESS]%NC% Dependencies installed for %%s
    )
)

REM Install document-proxy-service dependencies
if exist "backend\services\document-proxy-service\" (
    echo Installing dependencies for document-proxy-service...
    cd "backend\services\document-proxy-service"
    npm install --silent
    cd ..\..\..
    echo %GREEN%[SUCCESS]%NC% Dependencies installed for document-proxy-service
)

REM Install frontend dependencies
for %%a in (rabhan-web admin-dashboard) do (
    if exist "frontend\%%a\" (
        echo Installing dependencies for %%a...
        cd "frontend\%%a"
        npm install --silent
        cd ..\..
        echo %GREEN%[SUCCESS]%NC% Dependencies installed for %%a
    )
)

echo.
echo %BLUE%[INFO]%NC% Creating startup scripts...

REM Create Windows startup script
(
echo @echo off
echo echo 🚀 Starting RABHAN Platform Services
echo echo ====================================
echo.
echo REM Create logs directory
echo if not exist logs mkdir logs
echo.
echo REM Start backend services
echo echo Starting Auth Service...
echo start "Auth Service" cmd /k "cd backend\services\auth-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting User Service...
echo start "User Service" cmd /k "cd backend\services\user-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Document Service...
echo start "Document Service" cmd /k "cd backend\services\document-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Contractor Service...
echo start "Contractor Service" cmd /k "cd backend\services\contractor-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Quote Service...
echo start "Quote Service" cmd /k "cd backend\services\quote-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Admin Service...
echo start "Admin Service" cmd /k "cd backend\services\admin-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Marketplace Service...
echo start "Marketplace Service" cmd /k "cd backend\services\marketplace-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Document Proxy Service...
echo start "Document Proxy Service" cmd /k "cd backend\services\document-proxy-service && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Main Web App...
echo start "Rabhan Web" cmd /k "cd frontend\rabhan-web && npm run dev"
echo timeout /t 2 /nobreak ^> nul
echo.
echo echo Starting Admin Dashboard...
echo start "Admin Dashboard" cmd /k "cd frontend\admin-dashboard && npm run dev"
echo.
echo echo.
echo echo ✅ All services are starting!
echo echo.
echo echo Service URLs:
echo echo - Main App: http://localhost:3000
echo echo - Admin Dashboard: http://localhost:3010
echo echo - Auth Service: http://localhost:3001/health
echo echo - User Service: http://localhost:3002/health
echo echo - Document Service: http://localhost:3003/health
echo echo - Contractor Service: http://localhost:3004/health
echo echo - Quote Service: http://localhost:3005/health
echo echo - Admin Service: http://localhost:3006/health
echo echo - Marketplace Service: http://localhost:3007/health
echo echo - Document Proxy: http://localhost:3008/health
echo echo.
echo pause
) > start-all-services.bat

REM Create stop script
(
echo @echo off
echo echo 🛑 Stopping RABHAN Platform Services
echo echo ====================================
echo.
echo REM Kill processes on specific ports
echo for %%p in ^(3000 3001 3002 3003 3004 3005 3006 3007 3008 3010^) do ^(
echo     for /f "tokens=5" %%%%a in ^('netstat -ano ^| findstr :%%p'^) do ^(
echo         echo Stopping process on port %%p ^(PID: %%%%a^)...
echo         taskkill /PID %%%%a /F ^>nul 2^>^&1
echo     ^)
echo ^)
echo.
echo echo ✅ All services stopped!
echo pause
) > stop-all-services.bat

echo %GREEN%[SUCCESS]%NC% Created startup scripts

echo.
echo %GREEN%[SUCCESS]%NC% 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Ensure PostgreSQL and Redis are running
echo 2. Start all services: start-all-services.bat
echo 3. Open http://localhost:3000 in your browser
echo 4. Open http://localhost:3010 for admin dashboard
echo 5. Check the DEVELOPER_SETUP_GUIDE.md for detailed information
echo.
echo To stop all services: stop-all-services.bat
echo.
pause
goto :eof

REM Function to create backend environment file
:create_backend_env
set SERVICE_NAME=%1
set SERVICE_INDEX=%2

set PORT_ARRAY=3001 3002 3004 3003 3005 3006 3007
set DB_ARRAY=rabhan_auth rabhan_users rabhan_contractors rabhan_documents rabhan_quotes rabhan_admin rabhan_marketplace

set j=0
for %%p in (%PORT_ARRAY%) do (
    set /a j+=1
    if !j! EQU %SERVICE_INDEX% set SERVICE_PORT=%%p
)

set j=0
for %%d in (%DB_ARRAY%) do (
    set /a j+=1
    if !j! EQU %SERVICE_INDEX% set SERVICE_DB=%%d
)

if not exist "backend\services\%SERVICE_NAME%\.env" (
    echo Creating backend\services\%SERVICE_NAME%\.env
    (
    echo NODE_ENV=development
    echo PORT=!SERVICE_PORT!
    echo.
    echo # Database Configuration
    echo DATABASE_URL=postgresql://rabhan_dev:!DB_PASSWORD!@localhost:5432/!SERVICE_DB!
    echo.
    echo # Redis Configuration
    echo REDIS_URL=redis://localhost:6379
    echo REDIS_PASSWORD=
    echo.
    echo # JWT Configuration
    echo JWT_SECRET=!JWT_SECRET!
    echo JWT_EXPIRES_IN=24h
    echo JWT_REFRESH_EXPIRES_IN=7d
    echo.
    echo # Security Configuration
    echo BCRYPT_ROUNDS=12
    echo RATE_LIMIT_WINDOW_MS=900000
    echo RATE_LIMIT_MAX_REQUESTS=100
    echo.
    echo # CORS Configuration
    echo CORS_ORIGIN=http://localhost:3000,http://localhost:3010
    echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3010
    echo.
    echo # SAMA Compliance
    echo SAMA_COMPLIANCE_MODE=development
    echo SAMA_AUDIT_ENABLED=true
    echo SAMA_LOG_LEVEL=info
    echo.
    echo # Service URLs
    echo AUTH_SERVICE_URL=http://localhost:3001
    echo USER_SERVICE_URL=http://localhost:3002
    echo CONTRACTOR_SERVICE_URL=http://localhost:3004
    echo DOCUMENT_SERVICE_URL=http://localhost:3003
    echo QUOTE_SERVICE_URL=http://localhost:3005
    echo ADMIN_SERVICE_URL=http://localhost:3006
    echo MARKETPLACE_SERVICE_URL=http://localhost:3007
    echo.
    echo # Business Configuration
    echo MAX_QUOTE_AMOUNT=5000
    echo DEFAULT_SYSTEM_COST_PER_KWP=2000
    echo PENALTY_RATE=0.05
    echo.
    echo # File Storage
    echo UPLOAD_DIR=./uploads
    echo MAX_FILE_SIZE=10485760
    echo ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png
    ) > "backend\services\%SERVICE_NAME%\.env"
    echo %GREEN%[SUCCESS]%NC% Created backend\services\%SERVICE_NAME%\.env
) else (
    echo %YELLOW%[WARNING]%NC% backend\services\%SERVICE_NAME%\.env already exists, skipping
)
goto :eof

REM Function to create frontend environment file
:create_frontend_env
set APP_NAME=%1

if not exist "frontend\%APP_NAME%\.env" (
    echo Creating frontend\%APP_NAME%\.env
    (
    echo VITE_APP_ENV=development
    echo VITE_APP_NAME=RABHAN
    echo.
    echo # API URLs
    echo VITE_API_BASE_URL=http://localhost:3001
    echo VITE_AUTH_SERVICE_URL=http://localhost:3001
    echo VITE_USER_SERVICE_URL=http://localhost:3002
    echo VITE_DOCUMENT_SERVICE_URL=http://localhost:3003
    echo VITE_CONTRACTOR_SERVICE_URL=http://localhost:3004
    echo VITE_QUOTE_SERVICE_URL=http://localhost:3005
    echo VITE_ADMIN_SERVICE_URL=http://localhost:3006
    echo VITE_MARKETPLACE_SERVICE_URL=http://localhost:3007
    echo.
    echo # App Configuration
    echo VITE_DEFAULT_LANGUAGE=en
    echo VITE_SUPPORTED_LANGUAGES=en,ar
    echo VITE_APP_THEME=light
    ) > "frontend\%APP_NAME%\.env"
    echo %GREEN%[SUCCESS]%NC% Created frontend\%APP_NAME%\.env
) else (
    echo %YELLOW%[WARNING]%NC% frontend\%APP_NAME%\.env already exists, skipping
)
goto :eof