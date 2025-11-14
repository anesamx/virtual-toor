# Project Blueprint: Interactive VR Tour

## 1. Overview

This project is a web-based, interactive virtual reality (VR) tour application. It allows users to navigate between different 360-degree panoramic scenes by clicking on interactive hotspots. The application features a special "edit mode" that enables an administrator to create new scenes, upload panoramic images, and place/edit the navigation hotspots directly within the VR environment.

## 2. Core Technologies & Features

### Architecture
- **Frontend Framework:** A-Frame for the core VR experience.
- **Database:** Google Firestore for storing scene and hotspot data in real-time.
- **Image Storage:** Cloudflare R2 for storing the 360-degree panoramic images.
- **Secure Uploads:** A Cloudflare Worker acts as a secure intermediary to generate temporary, "presigned" URLs for uploading images directly to R2, preventing client-side exposure of secret keys.

### Key Features
- **Dynamic Scene Loading:** The application loads scene data (image URL, hotspots) from Firestore.
- **VR Navigation:** Users can click on hotspots to transition to linked scenes.
- **Edit Mode (`?edit=true`):**
    - **Scene Management:** Add new scenes with a name and a 360° image.
    - **Hotspot Management:** Add new navigation hotspots, linking a source scene to a target scene.
    - **Visual Hotspot Placement:** Click within the scene to place hotspots. An editor panel allows for fine-tuning the position (Yaw, Pitch) and size of the selected hotspot.
    - **Real-time Updates:** All changes are saved to Firestore and reflected immediately.
- **Secure and Scalable Storage:** Images are uploaded securely to Cloudflare R2, and the public R2 URL is used for efficient, low-cost delivery to users.
- **Modular Code:**
    - `index.html`: Main application entry point and UI layout.
    - `aframe-vr.js`: All A-Frame and application logic.
    - `firebase-init.js`: Firebase configuration and initialization.
    - `r2-config.js`: Configuration for R2 and Worker URLs.
    - `cloudflare-worker.js`: Serverless function for secure uploads.

## 3. Current Plan: Resolve CORS/500 Error

**Objective:** Fix the `500 Internal Server Error` originating from the Cloudflare Worker, which is preventing image uploads.

**Diagnosis:** The error indicates the Worker is crashing. The most likely cause is a misconfiguration between the `cloudflare-worker.js` code and the R2 Bucket Binding settings in the Cloudflare dashboard.

**Steps:**
1.  **Verify Worker Code:** Double-check that the deployed worker code is exactly the version that uses `createPresignedUrl` and expects the `R2_BUCKET` binding.
2.  **Verify Cloudflare Binding:** Log into the Cloudflare dashboard, navigate to the Worker's settings (`Settings` -> `Variables`), and confirm:
    - The "R2 Bucket Binding" variable name is *exactly* `R2_BUCKET`.
    - The binding is correctly linked to the `anesamx` R2 bucket.
3.  **Redeploy:** After verifying, click "Save and deploy" on the binding to ensure the settings are active.
4.  **Test:** Re-attempt the image upload in the application's edit mode.

