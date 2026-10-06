@echo off
title VR Architecture Portfolio Launcher
echo ========================================================
echo   Starting VR Architecture Portfolio Server...
echo ========================================================
echo.

:: Ensure current working directory is the script folder
cd /d "%~dp0"

echo [1/3] Updating Duck DNS IP...
curl -s "https://www.duckdns.org/update?domains=djef&token=a50ac9a8-2234-451d-b0e1-742de300fd9a"
echo.

:: 1. Start Node.js Server in a new window
echo [2/3] Launching Node.js server on port 8080...
start "VR Server (Port 8080)" cmd /k "npm start"

:: Wait 2 seconds for server startup
timeout /t 2 /nobreak >nul

:: 3. Open Admin Control Room in browser (Local view)
echo [3/3] Opening Admin Dashboard in browser...
start http://localhost:8080/#admin

echo.
echo ========================================================
echo   All systems started successfully!
echo   - Local Admin: http://localhost:8080/#admin
echo   - Public Access: http://djef.duckdns.org:8080
echo     (Note: Ensure port 8080 is forwarded to this PC on your router)
echo   - Keep the opened command windows running.
echo ========================================================
echo.
timeout /t 5
