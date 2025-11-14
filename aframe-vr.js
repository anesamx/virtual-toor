import { db } from './firebase-init.js';
// Import the v9 functions we need from the SDK
import { collection, query, where, limit, getDocs, doc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBALS ---
let currentSceneId = "1"; // Default to scene "1"

// --- URL PARAMETERS ---
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// --- DRAGGABLE COMPONENT ---
if (isEditMode) {
  AFRAME.registerComponent('draggable', {
    init: function () {
      this.isDragging = false;
      this.distance = 2.5;
      this.el.addEventListener('mousedown', () => {
        this.isDragging = true;
        this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', false);
        this.el.setAttribute('material', 'color', '#FFC107');
      });
      this.el.sceneEl.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.el.sceneEl.camera.el.setAttribute('look-controls', 'enabled', true);
          this.el.setAttribute('material', 'color', 'grey');
        }
      });
    },
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

// --- SCENE MANAGEMENT (REWRITTEN WITH v9 SYNTAX) ---

async function updateScene() {
  const sky = document.getElementById('sky');
  const navContainer = document.getElementById('nav-vr-container');
  navContainer.innerHTML = ''; // Clear old hotspots

  // 1. Fetch scene data with v9 syntax
  const scenesRef = collection(db, "scenes");
  const qScene = query(scenesRef, where("sceneId", "==", currentSceneId), limit(1));
  const sceneQuerySnapshot = await getDocs(qScene);

  if (sceneQuerySnapshot.empty) {
    console.error(`Scene with sceneId "${currentSceneId}" not found!`);
    return;
  }
  const sceneDoc = sceneQuerySnapshot.docs[0];
  sky.setAttribute('src', sceneDoc.data().image);

  // 2. Fetch hotspots for the scene with v9 syntax
  const hotspotsRef = collection(db, "hotspots");
  const qHotspots = query(hotspotsRef, where("sourceSceneId", "==", currentSceneId));
  const hotspotsQuerySnapshot = await getDocs(qHotspots);
  
  hotspotsQuerySnapshot.forEach(hotspotDoc => {
    const hotspot = createHotspot(hotspotDoc.id, hotspotDoc.data());
    navContainer.appendChild(hotspot);
  });
}

function createHotspot(docId, hotspotData) {
  const hotspot = document.createElement('a-entity');
  hotspot.setAttribute('hotspot-db-id', docId);
  hotspot.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
  hotspot.setAttribute('material', 'color: grey; transparent: true; opacity: 0.5');
  hotspot.setAttribute('data-raycastable', '');

  const pos = hotspotData.coordination;
  if (typeof pos === 'object' && pos !== null) {
    hotspot.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
  } else {
    hotspot.setAttribute('position', pos);
  }

  if (isEditMode) {
    hotspot.setAttribute('draggable', '');
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

// --- DATA SAVING (REWRITTEN WITH v9 SYNTAX) ---

async function saveHotspotPositions() {
  const navContainer = document.getElementById('nav-vr-container');
  const hotspotEntities = navContainer.children;
  const batch = writeBatch(db); // Use writeBatch from v9

  for (let i = 0; i < hotspotEntities.length; i++) {
    const hotspotEl = hotspotEntities[i];
    const docId = hotspotEl.getAttribute('hotspot-db-id');
    const newPosition = hotspotEl.getAttribute('position');
    const newCoordString = `${newPosition.x.toFixed(2)} ${newPosition.y.toFixed(2)} ${newPosition.z.toFixed(2)}`;

    const hotspotRef = doc(db, "hotspots", docId); // Create a doc reference
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
    saveButton.setAttribute('position', '0 -0.5 -1.5');
    saveButton.setAttribute('data-raycastable', '');
    
    const buttonText = document.createElement('a-text');
    buttonText.setAttribute('value', 'Save Positions');
    buttonText.setAttribute('color', 'black');
    buttonText.setAttribute('align', 'center');
    buttonText.setAttribute('scale', '0.3 0.3 0.3');
    saveButton.appendChild(buttonText);

    saveButton.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.1 1.1 1.1');
    saveButton.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');
    saveButton.addEventListener('click', saveHotspotPositions);
    cameraEl.appendChild(saveButton);
}

window.onload = async () => {
  await updateScene();

  if (isEditMode) {
    createSaveButtonEntity();
    console.log("Edit mode enabled. Click and hold to drag hotspots.");
  }
};