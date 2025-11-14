
# Blueprint: Immersive VR Tour

## Overview

This project is an immersive 360-degree virtual tour application built using modern web technologies. It allows users to navigate between different panoramic scenes by clicking on interactive hotspots. The application also features a simple, in-VR "edit mode" that enables developers to visually reposition these hotspots and save their new coordinates directly to the database.

## Features & Design

### Technology Stack

- **3D/VR Framework:** A-Frame
- **Database:** Google Firestore
- **Core Technologies:** HTML, CSS, JavaScript (ES Modules)

### Core Functionality

1.  **360° Scene Viewing:** The application displays panoramic images in a VR-ready environment using an `<a-sky>` entity.
2.  **Scene Navigation:** Users can move between different scenes by gazing at and clicking on interactive hotspots (grey spheres).
3.  **VR Edit Mode:**
    -   Accessed by adding `?edit=true` to the URL.
    -   Enables a gaze-based drag-and-drop system for repositioning hotspots.
    -   An in-world "Save Positions" button appears, which persists the new hotspot coordinates to Firestore.
4.  **Dynamic Data:** All scene and hotspot information is loaded dynamically from Firestore, making the tour easily configurable without changing the core code.

### Data Model

The application uses two main collections in Firestore:

1.  **`scenes`**: Stores the information for each panoramic location.
    -   `sceneId` (string): A unique identifier (e.g., "1", "2").
    -   `name` (string): The name of the scene (e.g., "Living Room").
    -   `image` (string): The path to the 360-degree image.
2.  **`hotspots`**: Stores the data for the navigation points that link scenes.
    -   `sourceSceneId` (string): The `sceneId` where the hotspot appears.
    -   `targetSceneId` (string): The `sceneId` the user is taken to upon clicking.
    -   `text` (string): The label displayed above the hotspot.
    -   `coordination` (string): The position of the hotspot in 3D space (e.g., "x y z").

## Current Plan: Manual Data Setup

To ensure data integrity and prevent conflicts, the automatic data-upload script (`initial-data-upload.js`) has been removed. The initial dataset must be created manually in the Firebase Firestore console.

### Step 1: Create `scenes` Collection

Create a collection named `scenes` with three documents, each containing the following fields:

- **Document 1:** `sceneId: "1"`, `name: "Living Room"`, `image: "./public/1.jpg"`
- **Document 2:** `sceneId: "2"`, `name: "Bedroom"`, `image: "./public/2.jpg"`
- **Document 3:** `sceneId: "3"`, `name: "Bathroom"`, `image: "./public/3.jpg"`

### Step 2: Create `hotspots` Collection

Create a collection named `hotspots` with four documents, each containing the following fields:

- **Document 1:** `sourceSceneId: "1"`, `targetSceneId: "2"`, `text: "Go to Bedroom"`, `coordination: "-4.2 1.5 -2"`
- **Document 2:** `sourceSceneId: "1"`, `targetSceneId: "3"`, `text: "Go to Bathroom"`, `coordination: "-1.75 1.5 -4"`
- **Document 3:** `sourceSceneId: "2"`, `targetSceneId: "1"`, `text: "Go to Living Room"`, `coordination: "4 1.5 1.1"`
- **Document 4:** `sourceSceneId: "3"`, `targetSceneId: "1"`, `text: "Go to Living Room"`, `coordination: "-2 1.5 4"`

## Editor Functionality (Latest Update)

The `draggable` A-Frame component has been rewritten to fix critical bugs related to the drag-and-drop feature in edit mode.

- **Reliable Dragging:** The component now correctly handles `mousedown` and `mouseup` events.
- **Scene-Wide Event Listener:** It attaches the `mouseup` listener to the entire scene during a drag operation, ensuring that the release is always captured, regardless of cursor position.
- **Proper Cleanup:** The `mouseup` listener is immediately removed after the drag operation ends to prevent memory leaks and objects getting "stuck."
- **Context Binding:** The component correctly binds its context (`this`) to event handlers to ensure robust behavior.
