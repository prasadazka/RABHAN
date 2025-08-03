@echo off
echo RABHAN Services Status Check
echo ============================
echo.

REM Define service ports and names
set "SERVICES=3001:Auth-Service 3002:Document-Service 3003:User-Service 3000:Frontend"

for %%s in (%SERVICES%) do (
    for /f "tokens=1,2 delims=:" %%a in ("%%s") do (
        set PORT=%%a
        set NAME=%%b
        
        echo Checking %%b (port %%a)...
        
        REM Check if port is in use
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%%a 2^>nul') do (
            if not "%%p"=="" (
                echo   ✓ %%b is RUNNING (PID: %%p^)
                goto :next_%%a
            )
        )
        echo   ✗ %%b is NOT RUNNING
        :next_%%a
    )
)

echo.
echo Database Status:
echo ================
cd "%~dp0"
node test-postgresql.js

echo.
echo Use these commands:
echo - start-services-clean.bat  : Start all services with cleanup
echo - stop-all-services.bat     : Stop all services
echo - cleanup-ports.bat         : Clean up ports only
echo.
pause