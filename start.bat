@echo off
title Djef Master Launcher (VR Portfolio + ERP Immo)
color 0A
echo ========================================================
echo   Starting VR Architecture Portfolio and ERP Immo...
echo ========================================================
echo.

:: Ensure current working directory is the project folder in C:
cd /d "C:\dev\djef folder\vr model\virtual-toor"

echo [1/4] Updating Duck DNS IP...
curl -s "https://www.duckdns.org/update?domains=djef&token=a50ac9a8-2234-451d-b0e1-742de300fd9a"
echo.

echo [2/4] Launching 24/7 VR Supervisor (Port 8080 and ngrok Tunnel)...
start "VR-Portfolio-Supervisor" cmd /k "cd /d ""C:\dev\djef folder\vr model\virtual-toor"" && node watchdog.js"

echo [3/4] Launching 24/7 ERP Immo Supervisor (Backend 3001 and Frontend 5173)...
start "ERP-Immo-Supervisor" cmd /k "cd /d ""C:\dev\djef folder\erp immo"" && node watchdog_all.js"

:: Wait 3 seconds for servers and ngrok to initialize
timeout /t 3 /nobreak >nul

:: Open Admin Control Room and ERP in browser
echo [4/4] Opening Web Dashboards in browser...
start http://localhost:8080/#admin
start http://localhost:5173

echo.
echo ========================================================
echo   All Servers and ngrok Tunnel are Active!
echo ========================================================
echo   - Local Admin Dashboard: http://localhost:8080/#admin
echo   - ERP Immo Web App:      http://localhost:5173
echo   - ngrok Dashboard:       http://127.0.0.1:4040
echo.
echo ========================================================
echo.
powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 4; $u = ($res.tunnels | Where-Object { $_.proto -eq 'https' }).public_url; if ($u) { Write-Host '>>> YOUR VR HEADSET PUBLIC HTTPS URL: ' $u -ForegroundColor Green; Write-Host '>>> REMOTE ADMIN DASHBOARD:            ' ($u + '/#admin') -ForegroundColor Green; Write-Host '' } } catch { Write-Host 'ngrok is initializing... tunnel will be ready in seconds.' -ForegroundColor Yellow }"

timeout /t 10
