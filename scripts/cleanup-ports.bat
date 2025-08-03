@echo off
echo Cleaning up RABHAN service ports...
echo.

REM Define ports for all RABHAN services
set PORTS=3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010

for %%p in (%PORTS%) do (
    echo Checking port %%p...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
        if not "%%a"=="" (
            echo   Found process %%a using port %%p - terminating...
            taskkill //F //PID %%a >nul 2>&1
            if errorlevel 1 (
                echo   Warning: Could not terminate process %%a
            ) else (
                echo   Process %%a terminated successfully
            )
        )
    )
)

echo.
echo Port cleanup completed!
echo.
timeout /t 2 /nobreak >nul