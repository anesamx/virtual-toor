# Virtual Tour Creator Blueprint

## 1. Project Overview

**Purpose:** A web-based platform for creating, managing, and experiencing immersive, 360-degree virtual tours. Users can upload panoramic images as "scenes" and link them together using interactive "hotspots" to build a complete tour. The application supports multiple independent tours through a feature called "Scenarios".

**Core Technologies:**
- **Frontend:** A-Frame (WebXR), HTML, CSS, JavaScript (ES Modules)
- **Backend:** Firebase (Firestore Database)
- **Image Storage:** Cloudflare R2 with a serverless Worker for secure uploads.

---

## 2. Implemented Features & Design

This section documents all features implemented in the application up to the current version.

### 2.1. Core Functionality
- **3D Scene Viewing:** Uses A-Frame to display 360-degree panoramic images (`<a-sky>`).
- **Database:** Firestore manages all tour data, organized into collections.
- **Secure Image Uploads:** Users can upload scene images, which are securely handled by a Cloudflare Worker and stored in a private Cloudflare R2 bucket.
- **Scenario Management:** The application supports multiple independent tours (scenarios). Users are presented with a list of existing scenarios upon loading and can choose which one to work on.

### 2.2. Editor Mode (`?edit=true`)
The application features a comprehensive editor mode for tour creation and management, accessible by adding `?edit=true` to the URL.

- **Editor Sidebar:** A persistent UI for managing tour content.
  - **Scene Management:**
    - View a list of all scenes in the current tour.
    - Add a new scene by providing a name and a 360° image file.
  - **Hotspot Management:**
    - View a list of hotspots for the currently displayed scene.
    - Add a new hotspot, specifying its text label and target scene.
    - **Select & Edit:** Click on a hotspot in the list to select it.
    - **Reposition:** Move a selected hotspot by clicking a new position in the scene or by using yaw/pitch controls.
    - **Resize:** Adjust the radius of a selected hotspot.
    - **Save Changes:** Persist position and size modifications to Firestore.
    - **Delete:** Remove a selected hotspot from the tour.

### 2.3. Visual & UX Design
- **Layout:** A clean, two-column layout in editor mode, with the A-Frame scene on the right and the editor sidebar on the left.
- **Modals:** User-friendly modals for adding new scenes and hotspots, preventing background interaction until the form is completed or canceled.
- **Styling:**
  - Modern, dark theme for the editor sidebar for a professional look.
  - Clear visual cues for interactive elements (e.g., button hover effects, red color for selected hotspots and delete button).
  - Responsive design for modals and sidebar components.

---

## 3. Current Plan: Streamlined Scenario Creation

This section outlines the plan to improve the scenario creation process and fix a related bug.

### 3.1. Goal
To make creating new scenarios faster and more intuitive, and to ensure the application handles empty scenarios gracefully.

### 3.2. Action Plan

1.  **Bug Fix: Handle Empty Scenarios:**
    *   **Problem:** The application currently shows an error (`Scene with ID "null" not found`) when a newly created, empty scenario is loaded.
    *   **Solution:** Modify the `updateScene` function in `aframe-vr.js` to check if `currentSceneId` is valid before attempting to query the database. If it's not, the function will simply display the default background without trying to load a non-existent scene.

2.  **Streamline Scenario Creation:**
    *   **Problem:** Creating a new scenario requires the user to manually enter a name in a separate modal, which is an unnecessary step.
    *   **Solution:**
        *   Remove the "Add Scenario" modal from `aframe-vr.html`.
        *   Refactor the `handleAddScenario` function in `aframe-vr.js`. The "Create New Scenario" button will now instantly create a new scenario in Firestore.
        *   The new scenario will be given a default name based on the current date and time (e.g., "New Scenario - 2023-10-27 14:30").
        *   The application will immediately load this new, empty scenario into the editor, allowing the user to begin adding scenes right away.

3.  **Required Manual Step: Firestore Index Creation:**
    *   **Requirement:** The new scenario-based queries require a composite index in Firestore to function correctly.
    *   **Action:** The user must manually create this index by following the link provided in the browser's console error. The required index is on the `scenes` collection, with fields `scenarioId` (ascending) and `sceneId` (ascending).
