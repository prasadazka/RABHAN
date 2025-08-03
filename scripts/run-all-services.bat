@echo off
echo Starting all RABHAN services locally...
echo.
echo Make sure PostgreSQL is running with:
echo - Host: localhost
echo - Port: 5432
echo - Username: postgres
echo - Password: 12345
echo.

REM Start auth service
start "Auth Service" cmd /k "cd /d %~dp0..\backend\services\auth-service && npm run dev"

REM Wait a bit for auth service to start
timeout /t 5 /nobreak > nul

REM Start document service
start "Document Service" cmd /k "cd /d %~dp0..\backend\services\document-service && npm run dev"

REM Start user service
start "User Service" cmd /k "cd /d %~dp0..\backend\services\user-service && npm run dev"

REM Start frontend
start "Frontend" cmd /k "cd /d %~dp0..\frontend\rabhan-web && npm run dev"

echo.
echo Services starting in separate windows:
echo - Auth Service: http://localhost:3001
echo - Document Service: http://localhost:3002
echo - User Service: http://localhost:3003
echo - Frontend: http://localhost:3000
echo.
pause