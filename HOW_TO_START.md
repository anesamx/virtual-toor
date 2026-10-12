# Djef Multi-Service 24/7 Production & Auto-Boot Guide

This system runs **VR Architecture Portfolio** (with ngrok HTTPS tunnel) and **Djef ERP Immo** (Local LAN) simultaneously, with **watchdog supervisors** that prevent crashes and an **Auto-Boot PC key** that starts both systems as soon as the computer powers on.

---

## 1. Quick Start Methods

### Option A: Automatic 24/7 PC Startup (Recommended)
You only need to run this once:
1. Double-click **`Install_PC_Startup_Key.bat`** located in `C:\dev\djef folder\`.
2. It registers both services in the **Windows Registry Startup Run Key** (`HKCU\...\Run`) and the **Windows Startup Folder**.
3. **From now on: Whenever you turn on or reboot your computer, both VR Portfolio (ngrok) and ERP Immo (local) will start automatically in the background and stay on 24/7.**

---

### Option B: 1-Click Desktop Icon
Double-click the **`Djef Master Start (24-7)`** icon on your Desktop (or run `C:\dev\djef folder\Master_Start_All.bat`).
* Starts the VR Portfolio on port `8080` with the ngrok HTTPS tunnel.
* Starts Djef ERP Immo (Backend on port `3001` + Frontend on port `5173`).
* Displays all active local and remote URLs on screen.

---

### Option C: Silent Invisible Mode (Never Turns Off)
Double-click **`Master_Start_Silent.vbs`** in `C:\dev\djef folder\`.
* Launches both systems invisibly in the background.
* **No command prompt windows are displayed**, meaning employees or users cannot accidentally close the servers by clicking "X".

---

## 2. Service Access & Endpoints

| Service | Mode | URL | Purpose |
| :--- | :--- | :--- | :--- |
| **VR Viewer (Headset)** | Remote / Internet | `https://<id>.ngrok-free.app` | Meta Quest 360° VR Cinema Mode (SSL/WebXR enabled) |
| **VR Admin Control Room**| Remote / Internet | `https://<id>.ngrok-free.app/#admin` | Remote project & scenario switching |
| **VR Admin (Local PC)** | Local Host | `http://localhost:8080/#admin` | PC Control Room for live headset mirroring |
| **ERP Immo Frontend** | Local Host / LAN | `http://localhost:5173` | React ERP Web UI |
| **ERP Immo Backend** | Local Host / LAN | `http://localhost:3001` | Express API, SQLite & WebSocket server |
| **ngrok Tunnel Monitor** | Local Host | `http://127.0.0.1:4040` | View live ngrok status, requests, and tunnel URLs |

---

## 3. High Availability ("Never Turn Off")

Both systems are monitored by automated Node.js **watchdog supervisors**:
* **`vr model/virtual-toor/watchdog.js`**: Continuously supervises the port 8080 web server and the ngrok tunnel process. If a network interruption or error stops either process, it automatically restarts it in 2 seconds.
* **`erp immo/watchdog_all.js`**: Continuously supervises the backend (port 3001) and frontend (port 5173). Any crash is logged to `erp_supervisor.log` and the server is restarted immediately.

---

## 4. How to Stop the Servers

If you need to perform maintenance or stop all services:
1. Double-click **`Djef Master Stop`** on your Desktop (or `C:\dev\djef folder\Master_Stop_All.bat`).
2. This stops all background `node.exe` and `ngrok.exe` processes cleanly.

To disable auto-start on PC boot at any time, run:
`C:\dev\djef folder\Uninstall_PC_Startup_Key.bat`.
