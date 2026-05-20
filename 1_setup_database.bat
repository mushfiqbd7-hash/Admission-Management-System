@echo off
:: ============================================================
:: SAMS - Step 1: Create Database
:: Run this ONCE to set up the PostgreSQL database
:: ============================================================
title SAMS - Database Setup

echo.
echo  ================================================
echo   SAMS - Database Setup
echo  ================================================
echo.
echo  This will create the sams_db database and user.
echo.
echo  You will be prompted for your PostgreSQL
echo  SUPERUSER (postgres) password.
echo.

:: Try to find psql in common install paths
set PSQL=
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\15\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\14\bin\psql.exe"

if "%PSQL%"=="" (
  echo  [ERROR] psql.exe not found. Is PostgreSQL installed?
  echo  Common path: C:\Program Files\PostgreSQL\16\bin\psql.exe
  echo.
  pause
  exit /b 1
)

echo  Found PostgreSQL: %PSQL%
echo.
set /p PG_PORT=Enter PostgreSQL port (default 5432, press Enter to use 5432): 
if "%PG_PORT%"=="" set PG_PORT=5432

set /p DB_PASS=Enter password for the new sams_user account: 
if "%DB_PASS%"=="" set DB_PASS=sams_password_2026

echo.
echo  Creating database and user...
echo.

:: Create SQL commands
(
echo CREATE DATABASE sams_db;
echo CREATE USER sams_user WITH PASSWORD '%DB_PASS%';
echo GRANT ALL PRIVILEGES ON DATABASE sams_db TO sams_user;
echo \c sams_db
echo GRANT ALL ON SCHEMA public TO sams_user;
echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sams_user;
echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sams_user;
) > "%TEMP%\sams_create_db.sql"

%PSQL% -U postgres -p %PG_PORT% -h localhost -f "%TEMP%\sams_create_db.sql"

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Database creation failed.
  echo  Make sure PostgreSQL is running and you entered the correct postgres password.
  pause
  exit /b 1
)

:: Update .env file with the password
echo.
echo  Updating backend\.env with your settings...

(
echo PORT=5000
echo NODE_ENV=development
echo.
echo DB_HOST=localhost
echo DB_PORT=%PG_PORT%
echo DB_NAME=sams_db
echo DB_USER=sams_user
echo DB_PASSWORD=%DB_PASS%
echo.
echo JWT_SECRET=sams_jwt_secret_key_windows_local_dev_change_in_production_2026_secure
echo JWT_EXPIRES_IN=8h
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo UPLOAD_DIR=./uploads
echo MAX_FILE_SIZE_MB=10
echo.
echo CLIENT_URL=http://localhost:5173
echo.
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX=500
) > backend\.env

echo.
echo  ================================================
echo   Database created successfully!
echo  ================================================
echo.
echo  sams_db database : created
echo  sams_user        : created
echo  backend\.env     : configured
echo.
echo  Next step: Run  2_install_dependencies.bat
echo.
pause
