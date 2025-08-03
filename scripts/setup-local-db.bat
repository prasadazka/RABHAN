@echo off
echo Setting up RABHAN databases in local PostgreSQL...
echo.

REM Run the SQL setup script
psql -U postgres -h localhost -p 5432 -f "../database/setup-local.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Databases created successfully!
    echo.
    echo Databases:
    echo - rabhan_auth
    echo - rabhan_documents  
    echo - rabhan_users
    echo.
    echo Now you can run the services:
    echo - cd backend\services\auth-service ^&^& npm run dev
    echo - cd backend\services\document-service ^&^& npm run dev
    echo - cd backend\services\user-service ^&^& npm run dev
) else (
    echo.
    echo ❌ Error creating databases. Make sure PostgreSQL is running on localhost:5432
    echo    with username: postgres and password: 12345
)

pause