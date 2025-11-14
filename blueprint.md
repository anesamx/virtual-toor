# A-Frame Virtual Tour Creator

## **Overview**

This project is an interactive virtual tour application built with A-Frame and Firebase. It allows users to navigate between 360-degree panoramic scenes by clicking on interactive hotspots. The application features a dedicated "Edit Mode" that enables authorized users to visually create, move, and resize hotspots directly within the 3D environment.

All scene and hotspot data is stored and managed in a Firestore database, allowing for real-time updates and persistence.

---

## **Core Features & Implementation**

### **1. Scene & Hotspot Loading**
- **Technology**: Firestore Database, A-Frame
- **Description**: The application fetches scene information (e.g., background image) and hotspot data from a Firestore database. On startup, it loads the initial scene and dynamically creates hotspot entities based on the retrieved data.
- **File**: `aframe-vr.js` (function: `updateScene`)

### **2. Scene Navigation (Viewer Mode)**
- **Technology**: A-Frame Events
- **Description**: In viewer mode, clicking on a hotspot triggers a scene change. The application fetches the new scene's data and updates the environment, providing a seamless virtual tour experience.
- **File**: `aframe-vr.js` (function: `createHotspotElement`)

### **3. Edit Mode**
- **Technology**: URL Parameters (`?edit=true`), DOM manipulation
- **Description**: The application can be launched in a special "Edit Mode" by appending `?edit=true` to the URL. This mode activates an editor sidebar and enables hotspot manipulation features.
- **Files**: `aframe-vr.js`, `aframe-vr.html`

### **4. Visual Hotspot Editor**
- **Technology**: A-Frame Raycaster, DOM Events, CSS
- **Description**: The editor sidebar allows for comprehensive control over hotspots.
    - **Scene Jumper**: A dropdown menu allows the editor to instantly jump to any scene in the tour for modification.
    - **Click-to-Select**: Clicking a hotspot directly in the 3D view will select it in the sidebar, loading its properties for editing.
    - **Click-to-Place**: After selecting a hotspot, the user can click anywhere on the 360-degree background to instantly move the hotspot to that location.
    - **Live Updates**: The "Yaw," "Pitch," and "Radius" (size) input fields in the sidebar update in real-time as the hotspot is moved or resized.
    - **Save to Database**: Changes can be persisted to the Firestore database by clicking the "Save Selected" button.
- **Files**: `aframe-vr.js` (functions: `initializeEditor`, `updateHotspotPosition`, `populateSidebar`), `aframe-vr.html`

### **5. Hotspot Properties**
- **Position (Yaw/Pitch)**: Spherical coordinates determine the hotspot's placement on the scene's sphere. The editor includes a **+9 degree pitch offset** for more accurate visual placement.
- **Size (Radius)**: The visual size of the hotspot bubble is configurable through the editor.
- **Text Label**: Each hotspot has a text label that always faces the camera using a custom **billboard component**, which provides a smoother experience than the default `look-at` attribute.

### **6. Camera Controls**
- **Mouse Drag**: The primary method for looking around the scene.
- **Keyboard Controls**: Standard WASD and arrow key movement have been **disabled** to prevent unintentional navigation and focus on the click-and-drag experience.
- **File**: `aframe-vr.html` (`<a-camera wasd-controls-enabled="false">`)

---

## **Current Plan**

- **Status**: The core features for the visual editor and virtual tour functionality have been implemented with an improved, dropdown-based scene navigation system for efficient editing.
- **Next Steps**: Awaiting further instructions or requests for new features or modifications.
