@echo off
echo.
echo ====================================================
echo 📋 RABHAN Platform - Logs Viewer
echo ====================================================
echo.

if not exist logs (
    echo ❌ Logs directory not found
    echo 🔧 Run start-all.bat first to generate logs
    pause
    exit /b 1
)

echo 📁 Available log files:
echo ================================
dir /b logs\*.log 2>nul | findstr /v "^$"

if errorlevel 1 (
    echo ❌ No log files found
    echo 🔧 Run start-all.bat first to generate logs
    pause
    exit /b 1
)

echo.
echo 📋 Log Viewer Options:
echo ================================
echo 1. View all logs (combined)
echo 2. View specific service log
echo 3. Follow live logs (tail)
echo 4. Search logs
echo 5. Clear all logs
echo 6. Exit
echo.

set /p choice="Select option (1-6): "

if "%choice%"=="1" goto :view_all
if "%choice%"=="2" goto :view_specific
if "%choice%"=="3" goto :follow_logs
if "%choice%"=="4" goto :search_logs
if "%choice%"=="5" goto :clear_logs
if "%choice%"=="6" goto :exit

echo ❌ Invalid choice
pause
goto :start

:view_all
echo.
echo 📋 Viewing all logs (last 100 lines each):
echo ================================
for %%f in (logs\*.log) do (
    echo.
    echo === %%f ===
    powershell "Get-Content '%%f' -Tail 100 -ErrorAction SilentlyContinue"
)
pause
goto :start

:view_specific
echo.
echo 📁 Select a log file:
set /a count=0
for %%f in (logs\*.log) do (
    set /a count+=1
    echo !count!. %%f
    set "file!count!=%%f"
)

if %count% equ 0 (
    echo ❌ No log files found
    pause
    goto :start
)

echo.
set /p file_choice="Select file number (1-%count%): "

if %file_choice% lss 1 goto :invalid_file
if %file_choice% gtr %count% goto :invalid_file

call set selected_file=%%file%file_choice%%%
echo.
echo 📋 Viewing %selected_file%:
echo ================================
type "%selected_file%"
pause
goto :start

:invalid_file
echo ❌ Invalid file number
pause
goto :view_specific

:follow_logs
echo.
echo 📋 Following live logs (Ctrl+C to stop):
echo ================================
echo Starting live log monitoring...

:: Use PowerShell to tail logs
powershell -Command "& {Get-ChildItem 'logs\*.log' | ForEach-Object {Get-Content $_.FullName -Wait -Tail 10 | ForEach-Object {Write-Host \"[$($_.DirectoryName | Split-Path -Leaf)/$($_.Name)]: $_\"}}}"
pause
goto :start

:search_logs
echo.
set /p search_term="Enter search term: "

if "%search_term%"=="" (
    echo ❌ Search term cannot be empty
    pause
    goto :search_logs
)

echo.
echo 🔍 Searching for "%search_term%" in all logs:
echo ================================

for %%f in (logs\*.log) do (
    findstr /i "%search_term%" "%%f" >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo === Found in %%f ===
        findstr /i /n "%search_term%" "%%f"
    )
)

echo.
echo Search completed.
pause
goto :start

:clear_logs
echo.
echo ⚠️  Are you sure you want to clear all logs? (y/N)
set /p confirm="Confirm: "

if /i "%confirm%"=="y" (
    del logs\*.log >nul 2>&1
    del logs\*.pid >nul 2>&1
    echo ✅ All logs cleared
) else (
    echo ❌ Operation cancelled
)
pause
goto :start

:exit
echo.
echo 👋 Goodbye!
echo.