@echo off
:: ============================================================
:: SAMS - Step 4: Start the Application
:: Opens backend and frontend in separate windows
:: ============================================================
title SAMS - Launcher

echo.
echo  ================================================
echo   SAMS - Starting Application
echo  ================================================
echo.

if not exist "backend\.env" (
  echo  [ERROR] backend\.env not found.
  echo  Run scripts 1, 2, 3 first.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo  [ERROR] backend\node_modules missing.
  echo  Run 2_install_dependencies.bat first.
  pause
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo  [ERROR] frontend\node_modules missing.
  echo  Run 2_install_dependencies.bat first.
  pause
  exit /b 1
)

echo  Starting Backend API server on port 5000...
start "SAMS Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait a couple seconds for backend to start
timeout /t 3 /nobreak >nul

echo  Starting Frontend dev server on port 5173...
start "SAMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo  ================================================
echo   SAMS is running!
echo  ================================================
echo.
echo  Open your browser and go to:
echo.
echo    http://localhost:5173
echo.
echo  Login credentials:
echo    Admin : admin@sams.edu  /  Admin@2026!
echo    Staff : staff@sams.edu  /  Staff@2026!
echo.
echo  API Health check:
echo    http://localhost:5000/api/health
echo.
echo  Two windows opened:
echo    - SAMS Backend  (keep open)
echo    - SAMS Frontend (keep open)
echo.
echo  To stop: close both "SAMS Backend" and
echo            "SAMS Frontend" windows.
echo.

:: Open browser automatically
timeout /t 2 /nobreak >nul
start http://localhost:5173

pause
