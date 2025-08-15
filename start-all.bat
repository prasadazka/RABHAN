@echo off
echo.
echo ====================================================
echo 🚀 RABHAN Solar BNPL Platform - Complete Startup
echo ====================================================
echo.

:: Set console colors for better visibility
color 0A

:: Set environment variables
set NODE_ENV=development
set FORCE_COLOR=1

echo 📋 Checking prerequisites...

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

:: Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ npm found:
npm --version

echo.
echo 🔧 Installing dependencies if needed...

:: Install dependencies for all services (run in background)
echo Installing backend service dependencies...
cd /d "%~dp0backend\services\auth-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\user-service" && if not exist node_modules npm install  
cd /d "%~dp0backend\services\contractor-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\admin-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\document-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\solar-calculator-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\marketplace-service" && if not exist node_modules npm install
cd /d "%~dp0backend\services\document-proxy-service" && if not exist node_modules npm install

echo Installing frontend dependencies...
cd /d "%~dp0frontend\rabhan-web" && if not exist node_modules npm install
cd /d "%~dp0frontend\admin-dashboard" && if not exist node_modules npm install

echo.
echo 🚀 Starting all RABHAN services and applications...
echo.

:: Create logs directory if it doesn't exist
if not exist logs mkdir logs

:: Start all backend services with proper titles
echo 🔐 Starting Auth Service (Port 3001)...
start "RABHAN Auth Service - Port 3001" cmd /k "cd /d \"%~dp0backend\services\auth-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 👥 Starting User Service (Port 3002)...
start "RABHAN User Service - Port 3002" cmd /k "cd /d \"%~dp0backend\services\user-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 📁 Starting Document Service (Port 3003)...
start "RABHAN Document Service - Port 3003" cmd /k "cd /d \"%~dp0backend\services\document-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 🏗️ Starting Contractor Service (Port 3004)...
start "RABHAN Contractor Service - Port 3004" cmd /k "cd /d \"%~dp0backend\services\contractor-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 🌞 Starting Solar Calculator Service (Port 3005)...
start "RABHAN Solar Calculator - Port 3005" cmd /k "cd /d \"%~dp0backend\services\solar-calculator-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo ⚙️ Starting Admin Service (Port 3006)...
start "RABHAN Admin Service - Port 3006" cmd /k "cd /d \"%~dp0backend\services\admin-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 🛒 Starting Marketplace Service (Port 3007)...
start "RABHAN Marketplace Service - Port 3007" cmd /k "cd /d \"%~dp0backend\services\marketplace-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo 📂 Starting Document Proxy Service (Port 3008)...
start "RABHAN Document Proxy - Port 3008" cmd /k "cd /d \"%~dp0backend\services\document-proxy-service\" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo.
echo 🌐 Starting Frontend Applications...
echo.

echo 💻 Starting Main Web App (Port 3000)...
start "RABHAN Web App - Port 3000" cmd /k "cd /d \"%~dp0frontend\rabhan-web\" && npm run dev"
timeout /t 5 /nobreak >nul

echo 🔧 Starting Admin Dashboard (Port 3010)...
start "RABHAN Admin Dashboard - Port 3010" cmd /k "cd /d \"%~dp0frontend\admin-dashboard\" && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ✅ All services and applications are starting up!
echo.
echo 📊 Service Status:
echo ================================
echo 🔐 Auth Service:           http://localhost:3001/health
echo 👥 User Service:           http://localhost:3002/health  
echo 📁 Document Service:       http://localhost:3003/health
echo 🏗️ Contractor Service:     http://localhost:3004/health
echo 🌞 Solar Calculator:       http://localhost:3005/health
echo ⚙️ Admin Service:          http://localhost:3006/health
echo 🛒 Marketplace Service:    http://localhost:3007/health
echo 📂 Document Proxy:         http://localhost:3008/health
echo.
echo 🌐 Frontend Applications:
echo ================================
echo 💻 Main Web App:           http://localhost:3000
echo 🔧 Admin Dashboard:        http://localhost:3010
echo.
echo 🔍 Health Check Dashboard: http://localhost:3000/health-dashboard
echo.

:: Wait for user input before checking health
echo ⏳ Waiting 30 seconds for all services to fully initialize...
timeout /t 30 /nobreak >nul

:: Run health checks
echo.
echo 🏥 Running Health Checks...
echo.

call "%~dp0scripts\health-check.bat"

echo.
echo 🎉 RABHAN Platform is now running!
echo.
echo 📖 Quick Start Guide:
echo ================================
echo 1. Main Application: http://localhost:3000
echo 2. Admin Dashboard:  http://localhost:3010  
echo 3. API Documentation: Available at each service's /docs endpoint
echo 4. Logs: Check individual service windows for real-time logs
echo.
echo 🛑 To stop all services, run: stop-all.bat
echo 📊 To check status, run: scripts\health-check.bat
echo.

pause