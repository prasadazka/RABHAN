@echo off
echo.
echo ====================================================
echo 🛑 STOP Git Workflows and Continuous Processes
echo ====================================================
echo.

color 0C

echo 🔍 Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo 🔍 Stopping any git-related processes...
taskkill /F /IM git.exe >nul 2>&1
taskkill /F /IM git-upload-pack.exe >nul 2>&1
taskkill /F /IM git-receive-pack.exe >nul 2>&1

echo 🔍 Stopping any SSH/deployment processes...
taskkill /F /IM ssh.exe >nul 2>&1
taskkill /F /IM scp.exe >nul 2>&1

echo 🔍 Stopping any Docker processes...
taskkill /F /IM docker.exe >nul 2>&1
taskkill /F /IM dockerd.exe >nul 2>&1

echo 🔍 Stopping any CI/CD related processes...
taskkill /F /IM npm.exe >nul 2>&1
taskkill /F /IM yarn.exe >nul 2>&1

echo 🔍 Clearing git hooks...
cd /d "%~dp0"
if exist .git\hooks\pre-commit del .git\hooks\pre-commit
if exist .git\hooks\post-commit del .git\hooks\post-commit
if exist .git\hooks\pre-push del .git\hooks\pre-push
if exist .git\hooks\post-receive del .git\hooks\post-receive

echo 🔍 Disabling git auto-deployment...
git config --unset deploy.remote >nul 2>&1
git config --unset deploy.branch >nul 2>&1
git config --unset hooks.pre-push >nul 2>&1

echo 🔍 Stopping any background deployment scripts...
wmic process where "CommandLine like '%%deploy%%' and Name='node.exe'" delete >nul 2>&1
wmic process where "CommandLine like '%%workflow%%' and Name='node.exe'" delete >nul 2>&1
wmic process where "CommandLine like '%%action%%' and Name='node.exe'" delete >nul 2>&1

echo 🔍 Checking for any remaining processes on deployment ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :22') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ✅ All git workflows and continuous processes stopped!
echo.

echo 📊 Verifying cleanup...
echo ================================

:: Check if Node.js processes are stopped
tasklist | findstr node.exe >nul
if errorlevel 1 (
    echo ✅ All Node.js processes stopped
) else (
    echo ⚠️  Some Node.js processes still running
    tasklist | findstr node.exe
)

:: Check git processes
tasklist | findstr git.exe >nul
if errorlevel 1 (
    echo ✅ All git processes stopped
) else (
    echo ⚠️  Some git processes still running
)

echo.
echo 🔧 Recommended actions:
echo ================================
echo 1. Commit your changes: git add . && git commit -m "Stop workflows"
echo 2. Push manually when ready: git push
echo 3. Use start-all.bat to restart RABHAN services only
echo 4. Disable GitHub Actions in repository settings if needed
echo.

echo 📋 Git status:
git status --porcelain | wc -l >temp_count.txt
set /p change_count=<temp_count.txt
del temp_count.txt
echo You have %change_count% pending changes

echo.
echo 🚀 To restart RABHAN services cleanly: start-all.bat
echo 🛑 If issues persist, restart your computer
echo.

pause