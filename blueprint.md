# VR Architecture Portfolio Blueprint

## Overview

This project is a virtual reality architecture portfolio designed for a synced "Cinema Mode" tour. A PC Admin dashboard controls the active scene of connected VR viewer sessions (such as VR headsets) and mirrors their look direction in real time.

## Design and Features

### VR Cinema Viewer (Root Viewer Session)
*   **Direct Immersion:** Navigating to the root URL (`/`) automatically enters the interactive 3D VR environment immediately.
*   **Clean Viewport:** The VR viewer interface is stripped of all interactive sidebars, menus, and buttons. It displays only the 360-degree panorama sphere and the WebXR button.
*   **Cinema Synchronization:** Receives server commands to switch scenes in real time.
*   **Head/Gaze Tracking:** Transmits its real-time camera rotation to the server for the admin to follow.

### Admin Dashboard (PC Controller Session)
*   **Access Control:** Accessed directly via `/#admin` (no password check).
*   **Régie de Contrôle VR (Cinema Control Room):** Tracks active viewer sessions and displays a live 3D preview mirroring their gaze.
*   **VR Scenarios Management:** Allows administrators to upload new 360-degree scenes, name them, delete them, and broadcast/project them to all viewers.

### Automatic Asset Optimization
*   **Automated Conversion:** When an image is uploaded (including heavy formats like `.png` or unsupported formats like `.tif`), the server uses the `sharp` library to automatically convert the image to compressed JPEG (`.jpg`).
*   **Cleanup:** The server automatically deletes the raw uploaded files to conserve space and only stores optimized `.jpg` images, speeding up wireless downloads on mobile VR headsets.

---

## Current Plan: Automatic JPEG Conversion

1.  **Backend Dependencies:** Add `sharp` for image compression.
2.  **API Upload Refactoring:** Update `/api/upload` route in `server.js` to process uploads into JPEG, delete raw uploads, and return optimized image URLs.