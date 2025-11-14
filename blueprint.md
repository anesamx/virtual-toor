# Blueprint: Immersive Tour (Desktop & VR)

## Overview

This project is a flexible 360-degree virtual tour application designed with a **desktop-first** architecture, while also providing a seamless **VR mode** on demand. Users can navigate between scenes by clicking hotspots. A simple and intuitive in-browser editor allows for the visual repositioning of these hotspots using a standard mouse, with changes saved directly to Firestore.

## Architecture & Design

### Core Principles

1.  **Desktop First:** The primary user experience is optimized for desktop users with a mouse. The interface is clean, intuitive, and does not rely on VR-specific controls.
2.  **VR on Demand:** A UI button allows users to enter an immersive VR mode at any time, providing a native headset experience.
3.  **Clean Separation:** The application logic (JavaScript) is cleanly separated from the page structure (HTML). UI elements like buttons are standard HTML, not A-Frame entities, for maximum reliability.

### Technology Stack

- **3D/VR Framework:** A-Frame
- **Database:** Google Firestore
- **Core Technologies:** HTML, CSS, JavaScript (ES Modules)

### Core Functionality

1.  **360° Scene Viewing:** Displays panoramic images via an `<a-sky>` entity.
2.  **Desktop Navigation:** Users navigate by clicking on hotspots with their standard mouse pointer.
3.  **VR Mode:** An "Enter VR" button in the top-right corner activates A-Frame's VR mode for headset users.
4.  **Editor (`?edit=true`):**
    -   A mouse-driven "select-and-place" system allows for intuitive hotspot positioning.
    -   **First Click (with mouse):** Selects a hotspot, highlighting it in yellow.
    -   **Second Click (with mouse):** Moves the selected hotspot to the new clicked location.
    -   A standard HTML "Save Positions" button in the top-left persists all changes to Firestore.
5.  **Dynamic Data:** All scene and hotspot data is loaded from Firestore.

### Data Model

The application uses two main collections in Firestore:

1.  **`scenes`**: `sceneId`, `name`, `image`
2.  **`hotspots`**: `sourceSceneId`, `targetSceneId`, `text`, `coordination`

## Style & Design

-   **Hotspots:** Rendered as light grey (`#E0E0E0`) spheres with a subtle transparency to blend cleanly with the scene.
-   **Selection Highlight:** A selected hotspot in edit mode turns a clear `yellow` for unambiguous visual feedback.
-   **UI Buttons:** The "Enter VR" and "Save Positions" buttons are styled cleanly with rounded corners and hover effects for a modern, professional look.
