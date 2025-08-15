@echo off
echo.
echo ====================================================
echo 🛑 RABHAN Platform - Shutdown All Services
echo ====================================================
echo.

color 0C

echo 🔍 Finding and stopping RABHAN processes...

:: Kill processes by window title (for Windows)
echo Stopping frontend applications...
taskkill /FI "WINDOWTITLE eq RABHAN Web App - Port 3000*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Admin Dashboard - Port 3010*" /F >nul 2>&1

echo Stopping backend services...
taskkill /FI "WINDOWTITLE eq RABHAN Auth Service - Port 3001*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN User Service - Port 3002*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Document Service - Port 3003*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Contractor Service - Port 3004*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Solar Calculator - Port 3005*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Admin Service - Port 3006*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Marketplace Service - Port 3007*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RABHAN Document Proxy - Port 3008*" /F >nul 2>&1

:: Alternative method: Kill processes by port
echo Stopping processes on RABHAN ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3004') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3006') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3007') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3008') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3010') do taskkill /F /PID %%a >nul 2>&1

:: Clean up any remaining Node.js processes related to RABHAN
echo Cleaning up remaining Node.js processes...
wmic process where "Name='node.exe' AND CommandLine LIKE '%%rabhan%%'" delete >nul 2>&1

echo.
echo ✅ All RABHAN services have been stopped!
echo.
echo 📊 Verifying shutdown...

:: Check if ports are still in use
echo Checking if ports are free...
netstat -aon | findstr ":3000 " >nul
if errorlevel 1 (echo ✅ Port 3000: Free) else (echo ⚠️  Port 3000: Still in use)

netstat -aon | findstr ":3001 " >nul
if errorlevel 1 (echo ✅ Port 3001: Free) else (echo ⚠️  Port 3001: Still in use)

netstat -aon | findstr ":3002 " >nul
if errorlevel 1 (echo ✅ Port 3002: Free) else (echo ⚠️  Port 3002: Still in use)

netstat -aon | findstr ":3003 " >nul
if errorlevel 1 (echo ✅ Port 3003: Free) else (echo ⚠️  Port 3003: Still in use)

netstat -aon | findstr ":3004 " >nul
if errorlevel 1 (echo ✅ Port 3004: Free) else (echo ⚠️  Port 3004: Still in use)

netstat -aon | findstr ":3005 " >nul
if errorlevel 1 (echo ✅ Port 3005: Free) else (echo ⚠️  Port 3005: Still in use)

netstat -aon | findstr ":3006 " >nul
if errorlevel 1 (echo ✅ Port 3006: Free) else (echo ⚠️  Port 3006: Still in use)

netstat -aon | findstr ":3007 " >nul
if errorlevel 1 (echo ✅ Port 3007: Free) else (echo ⚠️  Port 3007: Still in use)

netstat -aon | findstr ":3008 " >nul
if errorlevel 1 (echo ✅ Port 3008: Free) else (echo ⚠️  Port 3008: Still in use)

netstat -aon | findstr ":3010 " >nul
if errorlevel 1 (echo ✅ Port 3010: Free) else (echo ⚠️  Port 3010: Still in use)

echo.
echo 🔄 To restart all services, run: start-all.bat
echo.

pause