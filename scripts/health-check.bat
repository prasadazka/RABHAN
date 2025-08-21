@echo off
echo.
echo ====================================================
echo 🏥 RABHAN Platform - Health Check
echo ====================================================
echo.

color 0B

:: Function to check if a service is running on a specific port
setlocal enabledelayedexpansion

echo 🔍 Checking all RABHAN services...
echo.

:: Define services and ports
set services[0].name=Main Web App
set services[0].port=3000
set services[0].path=/

set services[1].name=Auth Service
set services[1].port=3001
set services[1].path=/health

set services[2].name=User Service
set services[2].port=3002
set services[2].path=/health

set services[3].name=Document Service
set services[3].port=3003
set services[3].path=/health

set services[4].name=Contractor Service
set services[4].port=3004
set services[4].path=/health

set services[5].name=Solar Calculator
set services[5].port=3005
set services[5].path=/health

set services[6].name=Admin Service
set services[6].port=3006
set services[6].path=/health

set services[7].name=Marketplace Service
set services[7].port=3007
set services[7].path=/health

set services[8].name=Document Proxy
set services[8].port=3008
set services[8].path=/health

set services[9].name=Admin Dashboard
set services[9].port=3010
set services[9].path=/

:: Check each service
set total_services=10
set running_services=0

for /L %%i in (0,1,9) do (
    set service_name=!services[%%i].name!
    set service_port=!services[%%i].port!
    set service_path=!services[%%i].path!
    
    echo Checking !service_name! on port !service_port!...
    
    :: Check if port is listening
    netstat -an | findstr ":!service_port! " | findstr "LISTENING" >nul
    if !errorlevel! equ 0 (
        echo ✅ !service_name! - Port !service_port! is listening
        
        :: Try to make HTTP request to health endpoint
        curl -s -o nul -w "%%{http_code}" http://localhost:!service_port!!service_path! >temp_status.txt 2>nul
        if exist temp_status.txt (
            set /p http_status=<temp_status.txt
            if "!http_status!"=="200" (
                echo ✅ !service_name! - Health check passed ^(HTTP 200^)
                set /a running_services+=1
            ) else if "!http_status!"=="000" (
                echo ⚠️  !service_name! - Port listening but no HTTP response
                set /a running_services+=1
            ) else (
                echo ⚠️  !service_name! - HTTP !http_status! response
                set /a running_services+=1
            )
            del temp_status.txt >nul 2>&1
        ) else (
            echo ⚠️  !service_name! - Port listening ^(HTTP check failed^)
            set /a running_services+=1
        )
    ) else (
        echo ❌ !service_name! - Not running ^(port !service_port! not listening^)
    )
    echo.
)

echo ====================================================
echo 📊 HEALTH CHECK SUMMARY
echo ====================================================
echo Total Services: %total_services%
echo Running Services: !running_services!
echo Failed Services: !total_services! - !running_services! = %total_services%

if !running_services! equ %total_services% (
    echo.
    echo 🎉 ALL SERVICES ARE HEALTHY!
    echo ✅ RABHAN Platform is fully operational
    echo.
    echo 🌐 Quick Links:
    echo ================================
    echo Main Application: http://localhost:3000
    echo Admin Dashboard:  http://localhost:3010
    echo API Health:       http://localhost:3001/health
) else (
    echo.
    echo ⚠️  SOME SERVICES ARE DOWN!
    echo 🔧 Run start-all.bat to start missing services
    echo 📋 Check individual service logs for details
)

echo.
echo 🔄 To restart all services: start-all.bat
echo 🛑 To stop all services: stop-all.bat
echo 📊 To run this check again: scripts\health-check.bat
echo.

:: Show running processes on RABHAN ports
echo 📋 Processes on RABHAN ports:
echo ================================
for /f "tokens=1,2,5" %%a in ('netstat -aon ^| findstr ":300"') do (
    echo Port %%b - PID %%c
)

echo.

endlocal