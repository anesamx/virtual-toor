
# Web-Based VR Architecture Portfolio

## Project Overview

This project is a single-page web application designed to showcase an architectural project through an interactive VR tour. The application is built using React and Tailwind CSS for the user interface, with the `pannellum-react` library powering the VR experience. The user can view project details and images on the landing page and then enter a full-screen VR tour with hotspots to navigate between different panoramic views.

## Design and Features

### Visual Design
- **Layout:** A clean, modern, single-page layout that is easy to navigate.
- **Typography:** Clear and legible fonts for project descriptions.
- **Color Palette:** A neutral color scheme to ensure the architectural images are the main focus.
- **Interactivity:** A prominent "Enter VR Tour" button to draw users into the immersive experience.

### Implemented Features
- **React-based:** The application is built with React for a modular and maintainable codebase.
- **Tailwind CSS via CDN:** The project uses the Tailwind CSS library through a CDN for styling, which simplifies the setup process.
- **Responsive Design:** The layout is responsive and works on both desktop and mobile devices.

## Current Plan: Landing Page with Tailwind CDN

1.  **Clean Project:** Remove unnecessary files from the default project structure.
2.  **Update `index.html`:** Add the Tailwind CSS CDN script to the `<head>` of the `index.html` file.
3.  **Create Placeholder Assets:** Add placeholder images for the landing page gallery.
4.  **Develop React Components:**
    *   `App.js`: The main component to manage the application state (switching between views).
    *   `Landing.js`: The component for the portfolio landing page section.
5.  **Style the Landing Page:** Use Tailwind CSS classes directly in the JSX to create a visually appealing and responsive layout for the project title, description, image gallery, and "Enter VR Tour" button.
6.  **Next Step:** Once the landing page is complete, we will proceed to build the VR tour experience.
