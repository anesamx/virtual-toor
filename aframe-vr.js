import { db } from './firebase-init.js';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Register a custom billboard component for better text orientation ---
AFRAME.registerComponent('billboard', {
  init: function () {
    this.camera = this.el.sceneEl.camera.el;
  },
  tick: function () {
    this.el.object3D.quaternion.copy(this.camera.object3D.quaternion);
  }
});

// --- GLOBALS ---
let currentSceneId = "1";
let selectedHotspotEntity = null;
let stagedPosition = null; 
let stagedSize = null;
const PLACEMENT_RADIUS = 10; 
const DEFAULT_HOTSPOT_SIZE = 0.2;

// --- URL PARAMETERS ---
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// --- DOM ELEMENTS ---
let yawInput, pitchInput, radiusInput, detailsContainer, sceneSelector;
let addSceneModal, addHotspotModal, addSceneForm, addHotspotForm, hotspotTargetSelector;

// --- COORDINATE CONVERSION UTILITIES ---

function sphericalToCartesian(yaw, pitch, radius) {
    const yawRad = yaw * (Math.PI / 180);
    const pitchRad = pitch * (Math.PI / 180);
    const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = radius * Math.sin(pitchRad);
    const z = -radius * Math.cos(pitchRad) * Math.cos(yawRad);
    return `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`;
}

function cartesianToSpherical(position) {
    const radius = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
    const pitchRatio = Math.max(-1, Math.min(1, position.y / radius));
    const yaw = Math.atan2(position.x, -position.z) * (180 / Math.PI);
    const pitch = Math.asin(pitchRatio) * (180 / Math.PI);
    return { yaw, pitch, radius };
}

// --- CORE APPLICATION LOGIC ---

async function updateScene() {
    const sky = document.getElementById('sky');
    const navContainer = document.getElementById('nav-vr-container');
    navContainer.innerHTML = ''; // Clear old hotspots
    
    if (isEditMode) {
      if (selectedHotspotEntity) {
          selectedHotspotEntity.setAttribute('material', 'color', '#E0E0E0');
      }
      selectedHotspotEntity = null;
      if(detailsContainer) detailsContainer.style.display = 'none';
    }

    const scenesRef = collection(db, "scenes");
    const qScene = query(scenesRef, where("sceneId", "==", currentSceneId));
    const sceneQuerySnapshot = await getDocs(qScene);

    if (sceneQuerySnapshot.empty) {
        console.error(`Error: Scene with ID "${currentSceneId}" not found.`);
        // Attempt to load the first scene if current is invalid
        const firstSceneQuery = query(scenesRef, orderBy("sceneId"), where("sceneId", "!=", null));
        const firstSceneSnapshot = await getDocs(firstSceneQuery);
        if(!firstSceneSnapshot.empty) {
            currentSceneId = firstSceneSnapshot.docs[0].id;
            updateScene(); // Re-run with a valid ID
        }
        return;
    }
    const sceneDoc = sceneQuerySnapshot.docs[0];
    sky.setAttribute('src', sceneDoc.data().image);
    if (isEditMode && sceneSelector) sceneSelector.value = currentSceneId;

    const hotspotsRef = collection(db, "hotspots");
    const qHotspots = query(hotspotsRef, where('sourceSceneId', '==', currentSceneId));
    const hotspotsQuerySnapshot = await getDocs(qHotspots);

    const hotspotEntities = [];
    hotspotsQuerySnapshot.forEach(hotspotDoc => {
        const hotspotEl = createHotspotElement(hotspotDoc.id, hotspotDoc.data());
        hotspotEntities.push(hotspotEl);
        navContainer.appendChild(hotspotEl);
    });

    if (isEditMode) {
        populateSidebar(hotspotEntities);
    }
    
    setTimeout(() => {
        const cursorEl = document.querySelector('a-cursor');
        if (cursorEl) {
            cursorEl.components.raycaster.refreshObjects();
        }
    }, 200); 
}

function createHotspotElement(docId, hotspotData) {
    const hotspot = document.createElement('a-entity');
    hotspot.setAttribute('hotspot-db-id', docId);
    hotspot.classList.add('clickable');

    const hotspotSize = hotspotData.size || DEFAULT_HOTSPOT_SIZE;
    hotspot.setAttribute('geometry', `primitive: sphere; radius: ${hotspotSize}`);
    hotspot.dataset.size = hotspotSize;

    hotspot.setAttribute('material', 'color: #E0E0E0; transparent: true; opacity: 0.6');

    let position;
    let angles;
    if (typeof hotspotData.coordination === 'object' && hotspotData.coordination !== null) {
        const { yaw = 0, pitch = 0, radius = PLACEMENT_RADIUS } = hotspotData.coordination;
        position = sphericalToCartesian(yaw, pitch, radius);
        angles = { yaw, pitch, radius };
    } else {
        position = sphericalToCartesian(0, 0, PLACEMENT_RADIUS);
        angles = { yaw: 0, pitch: 0, radius: PLACEMENT_RADIUS };
    }
    hotspot.setAttribute('position', position);
    hotspot.dataset.angles = JSON.stringify(angles);

    hotspot.setAttribute('event-set__enter', '_event: mouseenter; scale: 1.2 1.2 1.2');
    hotspot.setAttribute('event-set__leave', '_event: mouseleave; scale: 1 1 1');

    hotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isEditMode) {
            const radio = document.querySelector(`input[name="hotspot"][value="${docId}"]`);
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        } else {
            currentSceneId = hotspotData.targetSceneId;
            updateScene();
        }
    });

    const text = document.createElement('a-text');
    text.setAttribute('value', hotspotData.text);
    text.setAttribute('billboard', ''); 
    text.setAttribute('scale', '0.5 0.5 0.5');
    text.setAttribute('position', '0 0.4 0');
    text.setAttribute('color', 'white');
    hotspot.appendChild(text);

    return hotspot;
}

// --- EDITOR LOGIC ---

async function initializeEditor() {
    // --- Query DOM elements ---
    yawInput = document.getElementById('hotspot-yaw');
    pitchInput = document.getElementById('hotspot-pitch');
    radiusInput = document.getElementById('hotspot-radius');
    detailsContainer = document.getElementById('hotspot-details-container');
    sceneSelector = document.getElementById('scene-selector');
    addSceneModal = document.getElementById('add-scene-modal');
    addHotspotModal = document.getElementById('add-hotspot-modal');
    addSceneForm = document.getElementById('add-scene-form');
    addHotspotForm = document.getElementById('add-hotspot-form');
    hotspotTargetSelector = document.getElementById('hotspot-target-selector');

    document.getElementById('editor-sidebar').style.display = 'flex';

    // --- Populate Scene Selectors ---
    await populateSceneSelectors();

    // --- Event Listeners ---
    sceneSelector.addEventListener('change', () => {
        currentSceneId = sceneSelector.value;
        updateScene();
    });

    document.getElementById('add-scene-button').addEventListener('click', () => addSceneModal.style.display = 'flex');
    document.getElementById('add-hotspot-button').addEventListener('click', () => addHotspotModal.style.display = 'flex');
    document.querySelectorAll('.cancel-button').forEach(btn => {
        btn.addEventListener('click', () => {
            addSceneModal.style.display = 'none';
            addHotspotModal.style.display = 'none';
        });
    });

    addSceneForm.addEventListener('submit', handleAddScene);
    addHotspotForm.addEventListener('submit', handleAddHotspot);
    
    const cursorEl = document.querySelector('a-cursor');
    cursorEl.addEventListener('click', function (evt) {
        if (!selectedHotspotEntity) return;
        if (evt.detail.intersectedEl && evt.detail.intersectedEl.classList.contains('placement-target')) {
            const point = evt.detail.intersection.point;
            const angles = cartesianToSpherical(point);
            angles.pitch += 9; // Pitch adjustment
            updateHotspotPosition(angles);
        }
    });

    [yawInput, pitchInput].forEach(input => {
        input.addEventListener('input', () => {
            if (!selectedHotspotEntity) return;
            const angles = {
                yaw: parseFloat(yawInput.value) || 0,
                pitch: parseFloat(pitchInput.value) || 0,
            };
            updateHotspotPosition(angles, false);
        });
    });

    radiusInput.addEventListener('input', () => {
        if (!selectedHotspotEntity) return;
        const newSize = parseFloat(radiusInput.value) || DEFAULT_HOTSPOT_SIZE;
        selectedHotspotEntity.setAttribute('geometry', 'radius', newSize);
        stagedSize = newSize;
    });

    document.getElementById('save-hotspot-button').addEventListener('click', handleSaveHotspot);
}

async function populateSceneSelectors() {
    sceneSelector.innerHTML = '';
    hotspotTargetSelector.innerHTML = '';
    const scenesRef = collection(db, "scenes");
    const q = query(scenesRef, orderBy("sceneId"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const scene = doc.data();
        const option = document.createElement('option');
        option.value = scene.sceneId;
        option.textContent = scene.name || `Scene ${scene.sceneId}`;
        sceneSelector.appendChild(option.cloneNode(true));
        hotspotTargetSelector.appendChild(option);
    });
    sceneSelector.value = currentSceneId;
}

async function handleAddScene(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-scene-button');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const scenesRef = collection(db, "scenes");
        const q = query(scenesRef, orderBy("sceneId", "desc"), where("sceneId", "!=", null));
        const lastSceneSnapshot = await getDocs(q);
        const newSceneId = lastSceneSnapshot.empty ? "1" : (parseInt(lastSceneSnapshot.docs[0].data().sceneId) + 1).toString();

        await addDoc(scenesRef, {
            sceneId: newSceneId,
            name: e.target['scene-name'].value,
            image: e.target['scene-image'].value
        });

        await populateSceneSelectors();
        currentSceneId = newSceneId;
        await updateScene();

        addSceneForm.reset();
        addSceneModal.style.display = 'none';
    } catch (error) {
        console.error("Error adding scene: ", error);
        alert("Could not add the scene.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Scene";
    }
}

async function handleAddHotspot(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-new-hotspot-button');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        await addDoc(collection(db, "hotspots"), {
            sourceSceneId: currentSceneId,
            targetSceneId: e.target['hotspot-target'].value,
            text: e.target['hotspot-text-input'].value,
            coordination: { yaw: 0, pitch: 0, radius: PLACEMENT_RADIUS } 
        });
        
        await updateScene(); // Refresh the view to show the new hotspot
        addHotspotForm.reset();
        addHotspotModal.style.display = 'none';
    } catch (error) {
        console.error("Error adding hotspot: ", error);
        alert("Could not add the hotspot.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Hotspot";
    }
}

async function handleSaveHotspot() {
    if (!selectedHotspotEntity || !stagedPosition) {
        alert("Please select a hotspot and ensure its position is set.");
        return;
    }
    
    const saveBtn = document.getElementById('save-hotspot-button');
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const docId = selectedHotspotEntity.getAttribute('hotspot-db-id');
    const hotspotRef = doc(db, "hotspots", docId);

    try {
        const dataToUpdate = { coordination: stagedPosition };
        if (stagedSize !== null) dataToUpdate.size = stagedSize;
        
        await updateDoc(hotspotRef, dataToUpdate);
        alert('Success! Position and size saved.');

        selectedHotspotEntity.dataset.angles = JSON.stringify(stagedPosition);
        if (stagedSize !== null) selectedHotspotEntity.dataset.size = stagedSize;
        
        selectedHotspotEntity.setAttribute('material', 'color', '#E0E0E0');
        const radio = document.querySelector(`input[name="hotspot"]:checked`);
        if(radio) radio.checked = false;
        selectedHotspotEntity = null;
        stagedPosition = null;
        stagedSize = null;
        detailsContainer.style.display = 'none';
    } catch (error) {
        console.error("Error saving data: ", error);
        alert('Error: Could not save data.');
    } finally {
        saveBtn.textContent = "Save Position/Size";
        saveBtn.disabled = false;
    }
}

function updateHotspotPosition(angles, updateInputs = true) {
    if (!selectedHotspotEntity) return;

    const currentRadius = JSON.parse(selectedHotspotEntity.dataset.angles || '{}').radius || PLACEMENT_RADIUS;
    const newPosition = sphericalToCartesian(angles.yaw, angles.pitch, currentRadius);
    selectedHotspotEntity.setAttribute('position', newPosition);
    stagedPosition = { yaw: angles.yaw, pitch: angles.pitch, radius: currentRadius };

    if (updateInputs) {
        yawInput.value = angles.yaw.toFixed(1);
        pitchInput.value = angles.pitch.toFixed(1);
    }
}

function populateSidebar(hotspotEntities) {
    const container = document.getElementById('scene-list-container');
    container.innerHTML = '';

    if (hotspotEntities.length === 0) {
        container.innerHTML = '<p>No hotspots in this scene. Use the button above to add one.</p>';
        return;
    }

    hotspotEntities.forEach(entity => {
        const docId = entity.getAttribute('hotspot-db-id');
        const hotspotText = entity.querySelector('a-text').getAttribute('value');

        const item = document.createElement('label');
        item.className = 'scene-list-item';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'hotspot';
        radio.value = docId;

        radio.addEventListener('change', () => {
            if (selectedHotspotEntity) {
                selectedHotspotEntity.setAttribute('material', 'color', '#E0E0E0');
            }
            detailsContainer.style.display = 'none';

            selectedHotspotEntity = entity;
            selectedHotspotEntity.setAttribute('material', 'color', 'red');

            const currentAngles = JSON.parse(entity.dataset.angles || '{}');
            const angles = {
                yaw: currentAngles.yaw || 0,
                pitch: currentAngles.pitch || 0,
                radius: currentAngles.radius || PLACEMENT_RADIUS
            };
            stagedPosition = angles;

            const currentSize = entity.dataset.size || DEFAULT_HOTSPOT_SIZE;
            stagedSize = parseFloat(currentSize);

            yawInput.value = angles.yaw.toFixed(1);
            pitchInput.value = angles.pitch.toFixed(1);
            radiusInput.value = currentSize;
            detailsContainer.style.display = 'block';
        });

        item.appendChild(radio);
        item.appendChild(document.createTextNode(hotspotText));
        container.appendChild(item);
    });
}

// --- INITIALIZATION ---

async function main() {
    const urlParams = new URLSearchParams(window.location.search);
    const sceneId = urlParams.get('scene');
    if(sceneId) currentSceneId = sceneId;

    if (isEditMode) {
        await initializeEditor();
    }
    await updateScene();
    
     const vrButton = document.getElementById('vr-button');
    vrButton.addEventListener('click', () => {
        document.querySelector('a-scene').enterVR();
    });
}

main();
