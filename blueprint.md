# A-Frame Virtual Tour Creator

## **Overview**

This project is an interactive virtual tour application built with A-Frame and Firebase. It allows users to navigate between 360-degree panoramic scenes by clicking on interactive hotspots. The application features a dedicated "Edit Mode" that enables authorized users to create, modify, and manage all tour content—including scenes and hotspots—directly from a sidebar interface within the 3D environment.

All scene and hotspot data is stored and managed in a Firestore database, allowing for real-time updates and persistence.

---

## **Core Features & Implementation**

### **1. Content Creation & Management**
- **Technology**: Firestore (`addDoc`), DOM Events, HTML Forms
- **Description**: The editor sidebar contains tools for creating new tour content on the fly.
    - **Add New Scene**: A button opens a modal form to create a new scene. The user provides a name and an image URL. The system automatically assigns a new `sceneId`, saves it to Firestore, and refreshes the editor to show the new scene.
    - **Add New Hotspot**: A button opens a modal to create a new hotspot within the current scene. The user provides descriptive text and selects a target scene from a dropdown of all existing scenes. The new hotspot is added to Firestore and appears immediately in the editor, ready to be positioned.
- **Files**: `aframe-vr.js` (functions: `handleAddScene`, `handleAddHotspot`), `aframe-vr.html` (modals and buttons)

### **2. Visual Hotspot Editor**
- **Technology**: A-Frame Raycaster, DOM Events, CSS
- **Description**: The editor provides a comprehensive interface for managing hotspots.
    - **Scene Jumper**: A dropdown menu allows the editor to instantly jump to any scene in the tour for modification.
    - **Click-to-Select**: Clicking a hotspot directly in the 3D view will select it in the sidebar, loading its properties for editing.
    - **Click-to-Place**: After selecting a hotspot, the user can click anywhere on the 360-degree background to instantly move the hotspot to that location.
    - **Live Updates**: The "Yaw," "Pitch," and "Radius" (size) input fields in the sidebar update in real-time as the hotspot is moved or resized.
    - **Save Position/Size**: Changes to a hotspot's position and size can be persisted to the Firestore database with a dedicated save button.
- **Files**: `aframe-vr.js` (functions: `initializeEditor`, `updateHotspotPosition`, `handleSaveHotspot`), `aframe-vr.html`

### **3. Scene & Hotspot Loading**
- **Technology**: Firestore (`getDocs`, `query`), A-Frame
- **Description**: The application fetches all scene and hotspot data from the Firestore database. It dynamically populates the scene selection dropdowns and renders the hotspots for the currently active scene.
- **File**: `aframe-vr.js` (function: `updateScene`)

### **4. Scene Navigation (Viewer Mode)**
- **Technology**: A-Frame Events
- **Description**: In the standard viewer mode (when not editing), clicking on a hotspot triggers a seamless transition to the target scene.
- **File**: `aframe-vr.js` (function: `createHotspotElement`)

### **5. Hotspot Properties**
- **Position (Yaw/Pitch)**: Spherical coordinates determine the hotspot's placement. The editor includes a **+9 degree pitch offset** for more accurate visual placement.
- **Size (Radius)**: The visual size of the hotspot bubble is configurable through the editor.
- **Text Label**: Each hotspot has a text label that always faces the camera using a custom **billboard component**. The text color is set to **white** for better readability.

### **6. Camera Controls**
- **Mouse Drag**: The primary method for looking around the scene.
- **Keyboard Controls**: Standard WASD and arrow key movement have been **disabled** to focus on the click-and-drag experience.
- **File**: `aframe-vr.html` (`<a-camera wasd-controls-enabled="false">`)

---

## **Current Plan**

- **Status**: The application is now a complete content management system for creating and editing virtual tours. All requested features have been implemented.
- **Next Steps**: Awaiting further instructions or requests for new features or modifications.
