# Quick Start & ngrok Connection Guide

This guide explains how to start the **VR Architecture Portfolio** server, establish an `ngrok` tunnel for global VR access, and connect both VR headsets and the Admin Control Room.

---

## 1. Quickest Method: 1-Click Batch File (No Editor Needed)

Double-click **`start.bat`** in the project folder (`c:\dev\djef folder\vr model\virtual-toor\start.bat`).
It will automatically:
1. Start the Node.js server.
2. Launch the `ngrok` tunnel.
3. Open the Admin Control Room in your browser (`http://localhost:8080/#admin`).

---

## 2. Command Line Instructions (Manual)

Open your terminal in the project root directory (`c:\dev\djef folder\vr model\virtual-toor`):

### **Step 1: Start the Web & WebSocket Server**
In Terminal 1, run:
```bash
npm start
```
> **Note:** The server starts on port `8080` (`http://localhost:8080`).

---

### **Step 2: Start the ngrok Tunnel**
In Terminal 2, run:
```bash
ngrok http 8080
```
> **Note:** This exposes port `8080` securely to the internet via HTTPS, allowing VR headsets outside your local network to connect.

---

## 2. Connecting Devices & Dashboard

Your active public URL:
**`https://coastland-unretired-darkish.ngrok-free.dev`**

### **A. VR Viewer Session (VR Headsets / Mobile / Remote Clients)**
* **URL:** `https://coastland-unretired-darkish.ngrok-free.dev`
* **Instructions:**
  1. Open the URL in your VR headset browser (e.g. Meta Quest Browser).
  2. Click the **"ENTER VR"** button.
  3. The headset will load the 360° panorama and stream head-rotation data to the Admin dashboard.

---

### **B. Admin Control Room (PC Controller Session)**
* **URL:** `https://coastland-unretired-darkish.ngrok-free.dev/#admin`
* **Instructions:**
  1. Open the URL in your PC browser.
  2. View active connected VR sessions and their live 3D gaze tracking preview.
  3. Upload new 360° panoramas (automatically converted & optimized as JPEG).
  4. Click any scene card to instantly project it to all connected VR viewers.

---

## 3. Local Network Access (Alternative)
If all devices are connected to the same Wi-Fi network, you can bypass ngrok and use your local PC IP address:
* **Viewer:** `http://<YOUR_LOCAL_IP>:8080`
* **Admin:** `http://<YOUR_LOCAL_IP>:8080/#admin`
