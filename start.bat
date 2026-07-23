@echo off
title VR Architecture Portfolio Launcher
echo ========================================================
echo   Starting VR Architecture Portfolio Server & ngrok...
echo ========================================================
echo.

:: Ensure current working directory is the script folder
cd /d "%~dp0"

:: 1. Start Node.js Server in a new window
echo [1/3] Launching Node.js server on port 8080...
start "VR Server (Port 8080)" cmd /k "npm start"

:: Wait 2 seconds for server startup
timeout /t 2 /nobreak >nul

:: 2. Start ngrok Tunnel in a new window
echo [2/3] Launching ngrok tunnel...
start "ngrok Tunnel" cmd /k "ngrok http 8080"

:: Wait 2 seconds for ngrok startup
timeout /t 2 /nobreak >nul

:: 3. Open Admin Control Room in browser
echo [3/3] Opening Admin Dashboard in browser...
start http://localhost:8080/#admin

echo.
echo ========================================================
echo   All systems started successfully!
echo   - VR Viewer & Admin: http://localhost:8080/#admin
echo   - Keep the opened command windows running.
echo ========================================================
echo.
timeout /t 3
