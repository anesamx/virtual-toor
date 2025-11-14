import { db } from './firebase-init.js';
import { collection, query, where, limit, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Register a custom billboard component for better text orientation ---
AFRAME.registerComponent('billboard', {
  init: function () {
    this.camera = this.el.sceneEl.camera.el;
  },
  tick: function () {
    // On each frame, copy the camera's rotation to the text element.
    // This ensures it always faces the user without flipping upside down.
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

// --- DOM ELEMENTS (for editor) ---
let yawInput, pitchInput, radiusInput, detailsContainer;

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
    navContainer.innerHTML = '';

    const scenesRef = collection(db, "scenes");
    const qScene = query(scenesRef, where("sceneId", "==", currentSceneId), limit(1));
    const sceneQuerySnapshot = await getDocs(qScene);

    if (sceneQuerySnapshot.empty) {
        console.error(`Error: Scene with ID "${currentSceneId}" not found.`);
        return;
    }
    const sceneDoc = sceneQuerySnapshot.docs[0];
    sky.setAttribute('src', sceneDoc.data().image);

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
    }, 100);
}

function createHotspotElement(docId, hotspotData) {
    const hotspot = document.createElement('a-entity');
    hotspot.setAttribute('hotspot-db-id', docId);
    hotspot.classList.add('clickable');

    const hotspotSize = hotspotData.size || DEFAULT_HOTSPOT_SIZE;
    hotspot.setAttribute('geometry', `primitive: sphere; radius: ${hotspotSize}`);
    hotspot.dataset.size = hotspotSize; // Store for later access

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

    if (!isEditMode) {
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSceneId = hotspotData.targetSceneId;
            updateScene();
        });
    }

    const text = document.createElement('a-text');
    text.setAttribute('value', hotspotData.text);
    // Use the new billboard component instead of look-at
    text.setAttribute('billboard', ''); 
    text.setAttribute('scale', '0.5 0.5 0.5');
    text.setAttribute('position', '0 0.4 0');
    hotspot.appendChild(text);

    return hotspot;
}

// --- EDITOR LOGIC ---

function initializeEditor() {
    const cursorEl = document.querySelector('a-cursor');
    const saveButton = document.getElementById('save-hotspot-button');

    yawInput = document.getElementById('hotspot-yaw');
    pitchInput = document.getElementById('hotspot-pitch');
    radiusInput = document.getElementById('hotspot-radius');
    detailsContainer = document.getElementById('hotspot-details-container');
    document.getElementById('editor-sidebar').style.display = 'flex';

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

    saveButton.addEventListener('click', async () => {
        if (!selectedHotspotEntity || !stagedPosition) {
            alert("Please select a hotspot and ensure its position is set.");
            return;
        }

        saveButton.textContent = "Saving...";
        saveButton.disabled = true;

        const docId = selectedHotspotEntity.getAttribute('hotspot-db-id');
        const hotspotRef = doc(db, "hotspots", docId);

        try {
            const dataToUpdate = { coordination: stagedPosition };
            if (stagedSize !== null) {
                dataToUpdate.size = stagedSize;
            }

            await updateDoc(hotspotRef, dataToUpdate);
            alert('Success! Position and size saved.');

            selectedHotspotEntity.dataset.angles = JSON.stringify(stagedPosition);
            if (stagedSize !== null) {
                selectedHotspotEntity.dataset.size = stagedSize;
            }
            
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
            saveButton.textContent = "Save Selected";
            saveButton.disabled = false;
        }
    });
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
        container.innerHTML = '<p>No hotspots in this scene.</p>';
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
    await updateScene();
    if (isEditMode) {
        initializeEditor();
    }
    const vrButton = document.getElementById('vr-button');
    vrButton.addEventListener('click', () => {
        document.querySelector('a-scene').enterVR();
    });
}

main();
