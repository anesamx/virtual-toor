# Project Blueprint

## Overview

This document outlines the structure, design, and features of a modern, responsive landing page with two distinct virtual tour experiences.

## Current State

The project includes a landing page, a 360-degree photo tour using Pannellum, and the beginning of a true VR experience using A-Frame.

### Implemented Features

*   **Landing Page:** A responsive landing page with a hero section, feature cards, and footer.
*   **360 Photo Tour:** A panorama-based tour implemented with `Pannellum` in `vr.html`.

## Current Task: Add A-Frame VR Experience

I will now add a second, separate VR experience for VR headsets using the A-Frame framework, keeping the existing photo tour.

**Plan:**

1.  **Modify `index.html`:**
    *   Add a new button labeled "A-Frame VR Tour" to the hero section.
    *   This button will link to a new `aframe-vr.html` page.
2.  **Create `aframe-vr.html`:**
    *   This file will be the entry point for the A-Frame experience.
    *   It will import the A-Frame library from the official CDN.
    *   The scene will be constructed using A-Frame's declarative HTML tags.
3.  **Build the A-Frame Scene:**
    *   Use `<a-sky>` to set a 360-degree panoramic background using the existing images.
    *   Add an interactive element (e.g., a 3D box) that the user can gaze at to navigate between the "living room" and "kitchen" scenes.
    *   Add text elements to guide the user.
4.  **Create `aframe-vr.js`:**
    *   Implement the JavaScript logic to handle scene navigation when the user interacts with the navigation elements.
