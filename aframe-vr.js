// --- GLOBALS ---
let currentSceneId = "1"; // Default to scene "1"

// --- URL PARAMETERS ---
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// --- DRAGGABLE COMPONENT (REWRITTEN FOR VR CURSOR) ---
if (isEditMode) {
  AFRAME.registerComponent('draggable', {
    init: function () {
      this.isDragging = false;
      this.distance = 2.5; // How far the object is held from the camera

      // On click, start dragging
      this.el.addEventListener('mousedown', () => {
        this.isDragging = true;
        this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', false);
        this.el.setAttribute('material', 'color', '#FFC107'); // Highlight color
      });

      // On release, stop dragging
      this.el.sceneEl.addEventListener('mouseup', () => {
          if (this.isDragging) {
            this.isDragging = false;
            this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', true);
            this.el.setAttribute('material', 'color', 'grey'); // Revert color
          }
      });
    },

    // While dragging, update position on every frame
    tick: function () {
      if (this.isDragging) {
        const camera = this.el.sceneEl.camera;
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        const newPosition = cameraPosition.add(cameraDirection.multiplyScalar(this.distance));
        this.el.object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
      }
    }
  });
}

// --- SCENE MANAGEMENT ---

async function updateScene() {
  const sky = document.getElementById('sky');
  const navContainer = document.getElementById('nav-vr-container');
  navContainer.innerHTML = ''; // Clear old hotspots

  // 1. Fetch scene data
  const sceneQuery = await db.collection('scenes').where('sceneId', '==', currentSceneId).limit(1).get();
  if (sceneQuery.empty) {
    console.error(`Scene with sceneId "${currentSceneId}" not found!`);
    return;
  }
  const sceneDoc = sceneQuery.docs[0];
  sky.setAttribute('src', sceneDoc.data().image);

  // 2. Fetch hotspots for the scene
  const hotspotsQuery = await db.collection('hotspots').where('sourceSceneId', '==', currentSceneId).get();
  hotspotsQuery.forEach(hotspotDoc => {
    const hotspot = createHotspot(hotspotDoc.id, hotspotDoc.data());
    navContainer.appendChild(hotspot);
  });
}

function createHotspot(docId, hotspotData) {
  const hotspot = document.createElement('a-entity');
  hotspot.setAttribute('hotspot-db-id', docId);
  hotspot.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
  hotspot.setAttribute('material', 'color: grey; transparent: true; opacity: 0.5');

  // *** ERROR FIX ***
  // Robustly handle position data, whether it's a string or an object
  const pos = hotspotData.coordination;
  if (typeof pos === 'object' && pos !== null) {
    hotspot.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
  } else {
    hotspot.setAttribute('position', pos);
  }

  if (isEditMode) {
    hotspot.setAttribute('draggable', ''); // Enable VR dragging
    hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2;');
    hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1;');
  } else {
    hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
    hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');
    hotspot.addEventListener('click', () => {
      currentSceneId = hotspotData.targetSceneId;
      updateScene();
    });
  }

  const text = document.createElement('a-text');
  text.setAttribute('value', hotspotData.text);
  text.setAttribute('look-at', '[camera]');
  text.setAttribute('scale', '0.5 0.5 0.5');
  text.setAttribute('position', '0 0.4 0');
  hotspot.appendChild(text);

  return hotspot;
}

// --- DATA SAVING (Edit Mode) ---

async function saveHotspotPositions() {
  const navContainer = document.getElementById('nav-vr-container');
  const hotspotEntities = navContainer.children;
  const batch = db.batch();

  for (let i = 0; i < hotspotEntities.length; i++) {
    const hotspotEl = hotspotEntities[i];
    const docId = hotspotEl.getAttribute('hotspot-db-id');
    const newPosition = hotspotEl.getAttribute('position');
    const newCoordString = `${newPosition.x.toFixed(2)} ${newPosition.y.toFixed(2)} ${newPosition.z.toFixed(2)}`;

    const hotspotRef = db.collection('hotspots').doc(docId);
    batch.update(hotspotRef, { coordination: newCoordString });
  }

  try {
    await batch.commit();
    alert('Success! New positions saved to Firebase.');
  } catch (error) {
    console.error("Error saving positions: ", error);
    alert('Error: Could not save positions.');
  }
}

// --- INITIALIZATION & UI CREATION ---

function createSaveButtonEntity() {
    const sceneEl = document.querySelector('a-scene');
    const cameraEl = sceneEl.camera.el;

    const saveButton = document.createElement('a-entity');
    saveButton.setAttribute('geometry', 'primitive: plane; width: 0.6; height: 0.2');
    saveButton.setAttribute('material', 'color: #FFC107; shader: flat');
    saveButton.setAttribute('position', '0 -0.5 -1.5'); // Position in front of the camera
    
    const buttonText = document.createElement('a-text');
    buttonText.setAttribute('value', 'Save Positions');
    buttonText.setAttribute('color', 'black');
    buttonText.setAttribute('align', 'center');
    buttonText.setAttribute('scale', '0.3 0.3 0.3');
    saveButton.appendChild(buttonText);

    // Add hover effect
    saveButton.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.1 1.1 1.1');
    saveButton.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');

    // Add click listener
    saveButton.addEventListener('click', saveHotspotPositions);

    // Append the button as a child of the camera so it's always visible
    cameraEl.appendChild(saveButton);
}

window.onload = async () => {
  if (typeof firebase === 'undefined' || typeof db === 'undefined') {
      console.error("Firebase is not initialized.");
      alert("Firebase connection failed.");
      return;
  }

  await updateScene();

  if (isEditMode) {
    createSaveButtonEntity(); // Create the in-scene save button
    console.log("Edit mode enabled. Click and hold to drag hotspots.");
  }
};