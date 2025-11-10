# Project Blueprint: Interactive Landing Page with VR Tour

## 1. Project Overview

This project is a modern, interactive landing page for a product or service. The key features are an immersive A-Frame VR tour for headsets and a 360-degree panoramic viewer for mobile devices.

## 2. Core Features & Design

### Landing Page
- **Modern Design:** Clean, spacious layout with a professional color palette and typography.
- **Hero Section:** A prominent hero section with a welcoming headline, a brief product description, and a clear call-to-action button to the VR experience.
- **Feature Cards:** A section showcasing the product's key features using visually appealing cards with images and descriptions.
- **Responsive:** The layout adapts seamlessly to different screen sizes, from mobile devices to desktops.
- **Web Components:** The feature cards are implemented as custom Web Components for reusability and encapsulation.

### VR & 360 Tours
- **A-Frame VR Experience (`aframe-vr.html`):** A true WebVR experience built with A-Frame, designed for immersive headsets like the Meta Quest. It features a 360-degree panoramic image in a VR scene.
- **Pannellum 360 Tour (`vr.html`):** A 360-degree panoramic image viewer for mobile devices and desktops, built with the Pannellum library.

## 3. Current Implementation Plan

The following steps have been taken to build and integrate the VR and 360 tours:

1.  **Create `aframe-vr.html`:** A dedicated HTML file was created for the A-Frame VR experience.
2.  **Update `index.html`:** 
    *   The "Get Started" button now links to the `aframe-vr.html` page.
    *   The navigation link to the Pannellum tour has been renamed to "360 Tour" to distinguish it from the A-Frame VR experience.
