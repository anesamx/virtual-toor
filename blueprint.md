# VR Architecture Portfolio & Multi-Service System Blueprint

## Overview

This repository hosts the **VR Architecture Portfolio** (Cinema Mode WebXR synchronization system), and co-exists alongside the **Djef ERP Immo** platform on the host workstation. 
The system provides:
1. **VR Architecture Portfolio**: A WebXR-compatible 360° virtual tour system with a PC Admin Dashboard (`/#admin`) and real-time head-rotation tracking for connected VR headsets (e.g., Meta Quest). Remote access is tunneled through **ngrok** HTTPS for seamless WebXR encryption requirements.
2. **Djef ERP Immo**: A local real-estate enterprise resource planning and network chat system (Backend on port 3001, Frontend on port 5173).
3. **High-Availability & Auto-Boot Engine**: Continuous 24/7 background operation ("never turn off") with auto-restart supervisors, and automatic system launch upon PC boot/startup (Windows Startup Run Key).

---

## Design and Features

### 1. VR Cinema Portfolio (`virtual-toor`)
* **Viewer Session (`/`)**: Automatically enters the immersive 360° panorama scene. Stripped of UI chrome for full VR headset immersion.
* **Admin Control Room (`/#admin`)**: Live 3D preview mirroring connected VR headsets' gaze directions in real-time via Socket.io. Allows uploading 360° panoramas, renaming scenarios, and projecting them to all headsets simultaneously.
* **Asset Auto-Optimization**: Uploaded images (PNG, TIFF, high-res JPG) are automatically converted into compressed Web-ready JPEGs via `sharp`, purging raw originals.
* **ngrok HTTPS Tunnel**: Port 8080 is exposed publicly with valid SSL certificates, enabling remote WebXR on Meta Quest browsers with zero router port forwarding.

### 2. Djef ERP Immo (`erp immo`)
* **Backend Server (Port 3001)**: Express 5, Better-SQLite3, WebSocket real-time chat, file uploads, and session management. Supervised by an automated watchdog (`watchdog.js`).
* **Frontend Application (Port 5173)**: React 19, Vite, Tailwind CSS, Lucide icons, Three.js 3D viewers.
* **Local Office LAN Access**: Accessible at `http://localhost:5173` and on local Wi-Fi/Ethernet (`http://<LAN_IP>:5173`).

---

## Current Plan: Master 24/7 Deployment & PC Auto-Startup

### Objective
Create a unified, resilient launcher infrastructure that:
1. Starts **VR Architecture Portfolio** on port 8080 and establishes the **ngrok** tunnel for remote access.
2. Starts **Djef ERP Immo** on port 3001 (Backend) and port 5173 (Frontend) for local LAN operation.
3. Ensures **zero downtime ("Never Turn Off")**:
   - Both services are guarded by supervisor loops/watchdogs that automatically restart any crashed process in < 2 seconds.
   - Scripts run silently in the background (preventing accidental terminal window closure) or in dedicated supervisory consoles.
4. Auto-starts on **PC Boot ("PC ON" / Windows Startup Key)**:
   - Registers a launcher shortcut in the Windows Startup directory (`shell:startup`) and/or the Windows Registry Run Key (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).

### Actionable Implementation Steps

1. **Architecture & Watchdog Preparation**:
   - Add a robust `watchdog.js` to `virtual-toor` that supervises both `server.js` (port 8080) and the `ngrok http 8080` tunnel process, automatically respawning them if disconnected or killed.
   - Utilize the existing `watchdog.js` in `erp immo/server` and configure a persistent runner for `erp immo/client`.

2. **Master Launcher Creation (`Djef_Master_Start.bat` & `Djef_Master_Start_Silent.vbs`)**:
   - Create a central master launcher script in `C:\dev\djef folder\` (or project root) that triggers both services in parallel.
   - Provide both a **Console Monitor Mode** (for visual debugging with status outputs) and a **Silent Background Mode** (`.vbs`) so no terminal windows clutter the screen or get closed by mistake.

3. **PC Boot / Windows Startup Key Configuration**:
   - Provide an automatic installation script (`Install_Auto_Startup.bat`) that registers the master launcher in:
     - Windows Startup folder: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
     - (Optional) Windows Registry Run Key: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
   - When the user turns on the PC, both services launch instantly in the background without requiring any manual clicks.

4. **Health Check & Controller Dashboard**:
   - Provide a quick status checking utility / desktop shortcut to view the active ngrok URL and ERP status at any time (`http://127.0.0.1:4040` and local URLs).
   - Update `HOW_TO_START.md` with complete instructions for managing, stopping, and verifying the 24/7 background services.