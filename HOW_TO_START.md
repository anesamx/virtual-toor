# Quick Start & Duck DNS Connection Guide

This guide explains how to start the **VR Architecture Portfolio** server, auto-update your Duck DNS IP, and connect both VR headsets and the Admin Control Room.

---

## 1. Quickest Method: 1-Click Batch File (No Editor Needed)

Double-click **`start.bat`** in the project folder (`c:\dev\djef folder\vr model\virtual-toor\start.bat`).
It will automatically:
1. Update your IP address for `djef.duckdns.org`.
2. Start the Node.js server.
3. Open the Admin Control Room in your browser (`http://localhost:8080/#admin`).

---

## 2. Command Line Instructions (Manual)

Open your terminal in the project root directory (`c:\dev\djef folder\vr model\virtual-toor`):

### **Step 1: Update Duck DNS**
```bash
curl "https://www.duckdns.org/update?domains=djef&token=a50ac9a8-2234-451d-b0e1-742de300fd9a"
```

### **Step 2: Start the Web Server**
```bash
npm start
```
> **Note:** The server starts on port `8080`.

---

## 3. Connecting Devices & Dashboard

Your active public URL:
**`http://djef.duckdns.org:8080`**

*(Note: You must ensure port `8080` is forwarded to your PC's local IP address on your home router for this to work externally.)*

### **A. VR Viewer Session (VR Headsets / Mobile / Remote Clients)**
* **URL:** `http://djef.duckdns.org:8080`
* **Instructions:**
  1. Open the URL in your VR headset browser (e.g. Meta Quest Browser).
  2. Click the **"ENTER VR"** button.
  3. The headset will load the 360° panorama and stream head-rotation data to the Admin dashboard.

---

### **B. Admin Control Room (PC Controller Session)**
* **URL:** `http://djef.duckdns.org:8080/#admin` (or `http://localhost:8080/#admin` locally)
* **Instructions:**
  1. Open the URL in your PC browser.
  2. View active connected VR sessions and their live 3D gaze tracking preview.
  3. Upload new 360° panoramas.
  4. Click any scene card to instantly project it to all connected VR viewers.

---

## 4. Local Network Access (Alternative)
If all devices are connected to the same Wi-Fi network, you can bypass Duck DNS and use your local PC IP address:
* **Viewer:** `http://<YOUR_LOCAL_IP>:8080`
* **Admin:** `http://<YOUR_LOCAL_IP>:8080/#admin`
