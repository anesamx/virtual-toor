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

## Previous Milestones
* **Master 24/7 Deployment & PC Auto-Startup**: Implemented supervisor watchdogs, `Master_Start_All.bat`, `Master_Start_Silent.vbs`, and Windows startup registry integration.

---

## Current Plan: System Tray App ("Minbar" Bottom Bar) & Multi-User Decoupling (Djef Utilisateur)

### 1. Objective
1. **Decouple from User "ADNET"**:
   - Make the entire system independent of any single Windows user profile so that deleting/switching user accounts does NOT delete binaries, auth tokens, or break auto-start.
   - Store portable `ngrok.exe` and `ngrok.yml` inside `C:\dev\djef folder\bin\`.
   - Update `virtual-toor/watchdog.js` to target portable binaries with explicit configuration paths.
2. **System Tray / Bottom Bar Application ("Djef System Bar")**:
   - Provide a native, zero-dependency Windows desktop application (`DjefSystemBar.exe`) compiled via built-in C# (`csc.exe`).
   - Sits continuously in the bottom Windows taskbar notification tray ("minbar that appears from the bottom").
   - When clicked, a sleek, modern, glassmorphic flyout panel pops up directly from the bottom bar showing:
     - 🕶️ **VR Headset Public Link (ngrok)**: Live HTTPS link, live connection indicator, **[Copy Link]** and **[Open in Browser]** buttons.
     - 👑 **Admin Control Room**: One-click **[Open Admin]** (`/#admin`).
     - 🏢 **Djef ERP Immo**: One-click **[Open ERP Immo]** (`:5173`) and **[Backend API]** (`:3001`).
     - 🌐 **Ngrok Dashboard**: One-click **[Open Dashboard]** (`:4040`).
     - ⚡ **Service Controls**: One-click **[Restart All]**, **[Stop All]**, **[Start All]**.
     - Auto-polls status every 3 seconds to keep links and indicators fresh.
3. **Multi-User / All-Users Auto-Start**:
   - Install for all users via `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup` and public desktop `C:\Users\Public\Desktop` so user `djef` automatically has access upon logging in without needing user `ADNET`.
   - When `DjefSystemBar.exe` launches, it also ensures background servers are running silently.

### 2. Actionable Implementation Steps
1. **Update `virtual-toor/watchdog.js`**:
   - Use `C:\dev\djef folder\bin\ngrok.exe` and `--config "C:\dev\djef folder\bin\ngrok.yml"`.
2. **Build `DjefSystemBar` (Native C# Windows Tray / Flyout Application)**:
   - Design sleek UI with dark theme, smooth buttons, copy-to-clipboard animations, and system tray integration.
   - Compile using `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`.
3. **Multi-User Installer (`Install_System_App.bat`)**:
   - Copy shortcuts to Public Desktop and All Users Startup folder.
   - Provide UAC elevation if needed so standard users can also run it.
4. **Validation**:
   - Test compilation, tray icon appearance, link copying, browser launch, and service status polling.