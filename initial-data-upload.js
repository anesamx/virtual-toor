/*
THIS IS A ONE-TIME-USE SCRIPT.

Instructions:
1. Open the `aframe-vr.html` page in your browser.
2. Open the developer console (usually by pressing F12).
3. Copy the entire content of this file.
4. Paste it into the console and press Enter.
5. Wait for the success message. Your database will then be populated.

You can delete this file after you have successfully uploaded the data.
*/

async function uploadInitialData() {
  if (typeof firebase === 'undefined' || typeof db === 'undefined') {
      console.error("Firebase is not initialized. Please ensure you have the correct firebase-init.js file and credentials.");
      alert("Firebase connection failed. Cannot upload data.");
      return;
  }

  console.log("Starting data upload...");

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

  const batch = db.batch();

  // Add scenes
  console.log("Preparing scenes...");
  scenes.forEach(scene => {
    const sceneRef = db.collection('scenes').doc(); // Auto-generate ID
    batch.set(sceneRef, scene);
  });

  // Add hotspots
  console.log("Preparing hotspots...");
  hotspots.forEach(hotspot => {
    const hotspotRef = db.collection('hotspots').doc(); // Auto-generate ID
    batch.set(hotspotRef, hotspot);
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
