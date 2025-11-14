import { db } from './firebase-init.js';
import { collection, query, where, limit, getDocs, doc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBALS ---
let currentSceneId = "1";
let selectedHotspot = null; // This will hold the currently selected hotspot entity

// --- URL PARAMETERS ---
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// --- EDITOR LOGIC (FINAL "SELECT-AND-PLACE" SYSTEM) ---
if (isEditMode) {

  // A-Frame component to specifically block keyboard events when a hotspot is selected.
  AFRAME.registerComponent('keyboard-blocker', {
    init: function () {
      this.onKeyDown = function(e) { e.stopPropagation(); };
      // Listen with high priority to capture the event before other components do.
      this.el.sceneEl.addEventListener('keydown', this.onKeyDown, true); 
    },
    remove: function () {
      this.el.sceneEl.removeEventListener('keydown', this.onKeyDown, true);
    }
  });

  // Scene-wide click handler for the editor
  document.querySelector('a-scene').addEventListener('click', function (evt) {
    const clickedEl = evt.detail.intersectedEl;

    // --- STATE 1: A hotspot is ALREADY selected ---
    if (selectedHotspot) {
      // This is the SECOND click (the "place" action).
      const newPos = evt.detail.intersection.point;

      // If we clicked the same hotspot again, it's a "cancel" action.
      if (clickedEl === selectedHotspot) {
          console.log("Move cancelled.");
      } else if (newPos) {
          selectedHotspot.setAttribute('position', `${newPos.x} ${newPos.y} ${newPos.z}`);
          console.log("Hotspot placed at new position.");
      }

      // Deselect the hotspot, reset its color, and REMOVE the keyboard blocker.
      selectedHotspot.setAttribute('material', 'color', 'grey');
      selectedHotspot.removeAttribute('keyboard-blocker');
      selectedHotspot = null;
    } 
    // --- STATE 2: NOTHING is selected ---
    else {
      // This is the FIRST click (the "select" action).
      if (clickedEl && clickedEl.hasAttribute('hotspot-db-id')) {
        selectedHotspot = clickedEl;
        selectedHotspot.setAttribute('material', 'color', '#FFC107'); // Highlight yellow
        // ADD the keyboard blocker to prevent movement with arrow keys.
        selectedHotspot.setAttribute('keyboard-blocker',''); 
        console.log("Hotspot selected. Click elsewhere to place it.");
      }
    }
  });
}

// --- SCENE MANAGEMENT ---

async function updateScene() {
  const sky = document.getElementById('sky');
  const navContainer = document.getElementById('nav-vr-container');
  navContainer.innerHTML = '';

  const scenesRef = collection(db, "scenes");
  const qScene = query(scenesRef, where("sceneId", "==", currentSceneId), limit(1));
  const sceneQuerySnapshot = await getDocs(qScene);

  if (sceneQuerySnapshot.empty) {
    console.error(`Scene with sceneId "${currentSceneId}" not found!`);
    return;
  }
  const sceneDoc = sceneQuerySnapshot.docs[0];
  sky.setAttribute('src', sceneDoc.data().image);

  const hotspotsRef = collection(db, "hotspots");
  const qHotspots = query(hotspotsRef, where('sourceSceneId', '==', currentSceneId));
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
  hotspot.setAttribute('position', typeof pos === 'object' ? `${pos.x} ${pos.y} ${pos.z}` : pos);

  hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
  hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');

  if (!isEditMode) {
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

// --- DATA SAVING ---

async function saveHotspotPositions() {
    if (selectedHotspot) {
        selectedHotspot.setAttribute('material', 'color', 'grey');
        selectedHotspot.removeAttribute('keyboard-blocker');
        selectedHotspot = null;
    }

  const navContainer = document.getElementById('nav-vr-container');
  const hotspotEntities = navContainer.children;
  const batch = writeBatch(db);

  for (let i = 0; i < hotspotEntities.length; i++) {
    const hotspotEl = hotspotEntities[i];
    const docId = hotspotEl.getAttribute('hotspot-db-id');
    const newPosition = hotspotEl.getAttribute('position');
    const newCoordString = `${newPosition.x.toFixed(2)} ${newPosition.y.toFixed(2)} ${newPosition.z.toFixed(2)}`;

    const hotspotRef = doc(db, "hotspots", docId);
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
    saveButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        saveHotspotPositions();
    });
    cameraEl.appendChild(saveButton);
}

window.onload = async () => {
  await updateScene();

  if (isEditMode) {
    createSaveButtonEntity();
    console.log("Edit mode enabled. Click a hotspot to select, click elsewhere to place.");
  }
};