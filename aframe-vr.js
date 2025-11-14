import { db } from './firebase-init.js';
import { collection, query, where, limit, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBALS ---
let currentSceneId = "1";
let selectedHotspotEntity = null;
let stagedPosition = null; 
const PLACEMENT_RADIUS = 10; 

// --- URL PARAMETERS ---
const urlParams = new URLSearchParams(window.location.search);
const isEditMode = urlParams.get('edit') === 'true';

// --- DOM ELEMENTS (for editor) ---
let yawInput, pitchInput, detailsContainer;

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

    hotspot.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
    hotspot.setAttribute('material', 'color: #E0E0E0; transparent: true; opacity: 0.6');

    let position;
    let angles;
    if (typeof hotspotData.coordination === 'object' && hotspotData.coordination !== null) {
        const { yaw = 0, pitch = 0, radius = PLACEMENT_RADIUS } = hotspotData.coordination;
        position = sphericalToCartesian(yaw, pitch, radius);
        angles = { yaw, pitch, radius };
    } else if (typeof hotspotData.coordination === 'string') { // Handle old format
        position = hotspotData.coordination;
        try {
            const posVec = new THREE.Vector3(...position.split(' ').map(Number));
            angles = cartesianToSpherical(posVec);
        } catch(e) { angles = { yaw: 0, pitch: 0, radius: PLACEMENT_RADIUS }; }
    } else { // Handle null or invalid data
        position = sphericalToCartesian(0,0,PLACEMENT_RADIUS);
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
    text.setAttribute('look-at', '[camera]');
    text.setAttribute('scale', '0.5 0.5 0.5');
    text.setAttribute('position', '0 0.4 0');
    hotspot.appendChild(text);

    return hotspot;
}

// --- EDITOR LOGIC (FINAL IMPLEMENTATION) ---

function initializeEditor() {
    const cursorEl = document.querySelector('a-cursor');
    const saveButton = document.getElementById('save-hotspot-button');

    yawInput = document.getElementById('hotspot-yaw');
    pitchInput = document.getElementById('hotspot-pitch');
    detailsContainer = document.getElementById('hotspot-details-container');
    document.getElementById('editor-sidebar').style.display = 'flex';

    cursorEl.addEventListener('click', function (evt) {
        if (!selectedHotspotEntity) {
            return; // Ignore clicks if no hotspot is selected
        }

        // Check if the clicked entity is the placement target (the sky)
        if (evt.detail.intersectedEl && evt.detail.intersectedEl.classList.contains('placement-target')) {
            const point = evt.detail.intersection.point;
            const angles = cartesianToSpherical(point);
            
            // --- PITCH ADJUSTMENT ---
            angles.pitch += 9; // Add +9 degree offset for accuracy

            updateHotspotPosition(angles); // This updates the hotspot position and the input fields
        }
    });

    [yawInput, pitchInput].forEach(input => {
        input.addEventListener('input', () => {
            const angles = {
                yaw: parseFloat(yawInput.value) || 0,
                pitch: parseFloat(pitchInput.value) || 0,
                radius: PLACEMENT_RADIUS
            };
            updateHotspotPosition(angles, false); // Don't re-update inputs
        });
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
            await updateDoc(hotspotRef, { coordination: stagedPosition });
            alert('Success! Position saved.');

            selectedHotspotEntity.dataset.angles = JSON.stringify(stagedPosition);
            selectedHotspotEntity.setAttribute('material', 'color', '#E0E0E0');
            const radio = document.querySelector(`input[name="hotspot"]:checked`);
            if(radio) radio.checked = false;
            selectedHotspotEntity = null;
            stagedPosition = null;
            detailsContainer.style.display = 'none';
        } catch (error) {
            console.error("Error saving position: ", error);
            alert('Error: Could not save position.');
        } finally {
            saveButton.textContent = "Save Selected";
            saveButton.disabled = false;
        }
    });
}

function updateHotspotPosition(angles, updateInputs = true) {
    if (!selectedHotspotEntity) return;

    const newPosition = sphericalToCartesian(angles.yaw, angles.pitch, PLACEMENT_RADIUS);
    selectedHotspotEntity.setAttribute('position', newPosition);
    stagedPosition = {yaw: angles.yaw, pitch: angles.pitch, radius: PLACEMENT_RADIUS};

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
            yawInput.value = angles.yaw.toFixed(1);
            pitchInput.value = angles.pitch.toFixed(1);
            detailsContainer.style.display = 'block';

            console.log(`Selected hotspot: ${docId}, position staged.`);
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
