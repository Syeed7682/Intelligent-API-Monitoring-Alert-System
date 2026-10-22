@echo off
title Intelligent API Monitoring & Alert System Launcher
echo ==================================================
echo  Starting Intelligent API Monitoring & Alert System
echo ==================================================

echo [1/2] Starting Backend server on http://localhost:3001...
start "API Monitor Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [2/2] Starting Frontend dashboard on http://localhost:5173...
start "API Monitor Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==================================================
echo  Both servers started in dedicated windows!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:3001
echo ==================================================
pause
