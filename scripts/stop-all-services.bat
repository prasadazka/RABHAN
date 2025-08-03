@echo off
echo Stopping all RABHAN services...
echo.

REM Stop by process name patterns
echo Stopping Node.js processes for RABHAN services...

REM Kill processes by port
for %%p in (3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p 2^>nul') do (
        if not "%%a"=="" (
            echo Stopping process %%a on port %%p...
            taskkill //F //PID %%a >nul 2>&1
        )
    )
)

REM Also kill any remaining node processes that might be RABHAN services
echo Checking for remaining RABHAN processes...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr tsx') do (
    echo Found potential RABHAN process %%a - stopping...
    taskkill //F //PID %%a >nul 2>&1
)

echo.
echo All RABHAN services stopped!
echo.
timeout /t 2 /nobreak >nul