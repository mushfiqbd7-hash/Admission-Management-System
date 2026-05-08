@echo off
:: ============================================================
:: SAMS - Step 3: Run Database Migration and Seed
:: Creates all tables and inserts demo data
:: ============================================================
title SAMS - Migration and Seed

echo.
echo  ================================================
echo   SAMS - Database Migration and Seed
echo  ================================================
echo.

if not exist "backend\.env" (
  echo  [ERROR] backend\.env not found!
  echo  Please run 1_setup_database.bat first.
  echo.
  pause
  exit /b 1
)

echo  Running database migrations...
echo  (This creates all 12 tables)
echo.

cd backend
call node src/migrate.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Migration failed!
  echo  Check your database connection in backend\.env
  echo.
  cd ..
  pause
  exit /b 1
)

echo.
echo  Running database seed...
echo  (This creates demo admin + staff accounts)
echo.

call node src/seed.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo  [ERROR] Seed failed! But migration may have succeeded.
  echo.
  cd ..
  pause
  exit /b 1
)

cd ..

echo.
echo  ================================================
echo   Migration and Seed complete!
echo  ================================================
echo.
echo  Demo accounts created:
echo.
echo    Admin  : your_admin_email_here   / your_admin_password_here
echo    Staff  : your_staff_email_here   / your_staff_password_here
echo.
echo  Next step: Run  4_start.bat  to launch the app
echo.
pause

