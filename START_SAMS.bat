@echo off
:: ============================================================
:: SAMS - Quick Start (use this every day after setup)
:: ============================================================
title SAMS - Quick Start

echo.
echo  Starting SAMS...
echo.

start "SAMS Backend"  cmd /k "cd /d %~dp0backend  && npm run dev"
timeout /t 3 /nobreak >nul
start "SAMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo  SAMS is starting...
echo  Browser will open in 3 seconds.
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
