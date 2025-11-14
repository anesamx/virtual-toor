/*
THIS IS A ONE-TIME-USE SCRIPT.

Instructions:
1. Make sure you are on the aframe-vr.html page in your browser.
2. Open the developer console (usually F12).
3. Copy the ENTIRE content of this file.
4. Paste it into the console and press Enter.
5. Wait for the success message. Your database will then be populated.

You can delete this file after you have successfully uploaded the data.
*/

import { db } from './firebase-init.js';
import { collection, writeBatch, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

async function uploadInitialData() {
  console.log("Starting data upload with modern Firebase SDK...");

  const scenes = [
    { sceneId: "1", name: "Living Room", image: "./public/1.jpg" },
    { sceneId: "2", name: "Bedroom", image: "./public/2.jpg" },
    { sceneId: "3", name: "Bathroom", image: "./public/3.jpg" }
  ];

  const hotspots = [
    { sourceSceneId: "1", targetSceneId: "2", text: "Go to Bedroom", coordination: "-4.2 1.5 -2" },
    { sourceSceneId: "1", targetSceneId: "3", text: "Go to Bathroom", coordination: "-1.75 1.5 -4" },
    { sourceSceneId: "2", targetSceneId: "1", text: "Go to Living Room", coordination: "4 1.5 1.1" },
    { sourceSceneId: "3", targetSceneId: "1", text: "Go to Living Room", coordination: "-2 1.5 4" }
  ];

  // Use the v9 batch function
  const batch = writeBatch(db);

  // Add scenes
  console.log("Preparing scenes...");
  const scenesRef = collection(db, 'scenes');
  scenes.forEach(scene => {
    const sceneDocRef = doc(scenesRef); // Auto-generate ID
    batch.set(sceneDocRef, scene);
  });

  // Add hotspots
  console.log("Preparing hotspots...");
  const hotspotsRef = collection(db, 'hotspots');
  hotspots.forEach(hotspot => {
    const hotspotDocRef = doc(hotspotsRef); // Auto-generate ID
    batch.set(hotspotDocRef, hotspot);
  });

  try {
    await batch.commit();
    console.log("%cSUCCESS!", "color: green; font-weight: bold; font-size: 20px;");
    console.log("Your Firestore database has been populated with the initial data.");
    alert("Initial data uploaded to Firebase successfully! You can now refresh the page.");
  } catch (error) {
    console.error("Error uploading data: ", error);
    alert("An error occurred during data upload. Check the console for details.");
  }
}

// To run this, copy the function call below and paste it into your browser console:
// uploadInitialData();

// We will call this function directly for convenience since this is a module now
uploadInitialData();
