@echo off
:: ============================================================
:: SAMS - Step 2: Install Node.js Dependencies
:: ============================================================
title SAMS - Install Dependencies

echo.
echo  ================================================
echo   SAMS - Installing Dependencies
echo  ================================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Node.js is not installed!
  echo.
  echo  Please download and install Node.js 18+ from:
  echo  https://nodejs.org/en/download
  echo.
  echo  Choose the LTS version (Windows Installer .msi^)
  echo  After installing, restart this script.
  echo.
  pause
  exit /b 1
)

echo  Node.js found:
node --version
npm --version
echo.

echo  Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Backend npm install failed.
  pause
  exit /b 1
)
cd ..

echo.
echo  Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Frontend npm install failed.
  pause
  exit /b 1
)
cd ..

echo.
echo  ================================================
echo   Dependencies installed successfully!
echo  ================================================
echo.
echo  Next step: Run  3_run_migration_and_seed.bat
echo.
pause
