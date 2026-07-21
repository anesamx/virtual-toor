# VR Architecture Portfolio Blueprint

## Overview

This project is a virtual reality architecture portfolio designed to showcase architectural designs in an immersive 3D environment. The application is built using React (loaded via CDN) for the user interface, Express for the backend server, and Three.js for rendering the VR experience.

## Design and Features

### Landing Page
*   **Layout:** Clean, modern, responsive layout using Tailwind CSS.
*   **Hero Section:** Highlights the featured project (e.g., "Villa Moderne").
*   **Gallery:** Displays static images of the project.
*   **Interactive Call to Action:** "Entrer dans la Visite Virtuelle" launches the 3D VR environment.

### VR Tour Viewer (Viewer Session)
*   **3D Panorama Spheres:** Renders a 360-degree interactive environment using Three.js and `OrbitControls`.
*   **VR Support:** Leverages WebXR (via `VRButton.js`) for virtual reality headsets.
*   **In-VR UI Menu:** Allows VR users to select different scenes/scenarios using raycasting controllers.
*   **Real-time Synchronization:** Listens to socket events from the admin to change active scenes dynamically.
*   **Head Tracking:** Sends real-time look direction (camera rotation angles) back to the server to share with the admin session.

### Admin Dashboard (Admin Session)
*   **Access Control:** Simple password protection (`121212`) to verify the administrator.
*   **Scenario Management:** Upload new panorama images, create scenes (scenarios), hide/show scenarios, or delete them.
*   **Real-time Cinema Control:** Force all connected VR viewers to display a specific scene immediately.
*   **Live Gaze Mirroring:** Displays active viewers and replicates their looking direction in a miniature 3D scene in real-time.

---

## Current Plan: Cinema Mode and Real-time Gaze Replication

We are implementing real-time communications to bridge the PC (Admin) and VR (Viewer) sessions:

1.  **Backend Integration:**
    *   Install `socket.io`.
    *   Refactor `server.js` to initialize Socket.io alongside Express.
    *   Add message routers for `join` (viewer/admin), `admin-select-scene`, `viewer-gaze-update`, and connection bookkeeping.

2.  **Frontend Viewer Integration:**
    *   Include Socket.io client in `index.html`.
    *   Connect to socket in `VRScene` inside `main.js`.
    *   Receive `server-change-scenario` events to switch scenes.
    *   Throttled tracking of the camera's rotation, sending Euler/Quaternion values to the server.

3.  **Frontend Admin Controls:**
    *   Display active viewer counts and individual viewer states.
    *   Add a "Cinema Mode" control panel to broadcast scene changes.
    *   Render a mini 3D model that reflects the exact camera orientation of the viewer.