import { db } from './firebase-init.js';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { R2_PUBLIC_URL, WORKER_URL } from './r2-config.js';

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
let currentScenarioId = null;
let currentSceneId = null;
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
let addSceneModal, addHotspotModal, addScenarioModal, addSceneForm, addHotspotForm, addScenarioForm, hotspotTargetSelector;
let scenarioSelectionModal;

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

    if (!currentSceneId) {
        sky.setAttribute('src', './public/1.jpg');
        if (isEditMode) populateSidebar([]);
        return; 
    }

    const scenesRef = collection(db, "scenes");
    const qScene = query(scenesRef, where("scenarioId", "==", currentScenarioId), where("sceneId", "==", currentSceneId));
    const sceneQuerySnapshot = await getDocs(qScene);

    if (sceneQuerySnapshot.empty) {
        console.error(`Error: Scene with ID "${currentSceneId}" not found in scenario "${currentScenarioId}".`);
        const firstSceneQuery = query(scenesRef, where("scenarioId", "==", currentScenarioId), orderBy("sceneId"));
        const firstSceneSnapshot = await getDocs(firstSceneQuery);
        if(!firstSceneSnapshot.empty) {
            currentSceneId = firstSceneSnapshot.docs[0].data().sceneId;
            updateScene();
        } else {
          sky.setAttribute('src', './public/1.jpg');
        }
        return;
    }
    const sceneDoc = sceneQuerySnapshot.docs[0];
    sky.setAttribute('src', sceneDoc.data().image);
    if (isEditMode && sceneSelector) sceneSelector.value = currentSceneId;

    const hotspotsRef = collection(db, "hotspots");
    const qHotspots = query(hotspotsRef, where('scenarioId', '==', currentScenarioId), where('sourceSceneId', '==', currentSceneId));
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
            addScenarioModal.style.display = 'none';
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
    document.getElementById('delete-hotspot-button').addEventListener('click', handleDeleteHotspot);
    document.getElementById('exit-editor-button').addEventListener('click', () => {
        sessionStorage.removeItem('currentScenarioId');
        window.location.href = window.location.pathname;
    });
}

async function populateSceneSelectors() {
    sceneSelector.innerHTML = '';
    hotspotTargetSelector.innerHTML = '';
    const scenesRef = collection(db, "scenes");
    const q = query(scenesRef, where("scenarioId", "==", currentScenarioId), orderBy("sceneId"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const scene = doc.data();
        const option = document.createElement('option');
        option.value = scene.sceneId;
        option.textContent = scene.name || `Scene ${scene.sceneId}`;
        sceneSelector.appendChild(option.cloneNode(true));
        hotspotTargetSelector.appendChild(option);
    });
    if (currentSceneId) {
      sceneSelector.value = currentSceneId;
    }
}

async function handleAddScene(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-scene-button');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const sceneName = e.target['scene-name'].value;
    const imageFile = e.target['scene-image-file'].files[0];

    if (!sceneName || !imageFile) {
        alert('Please provide a scene name and select an image.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Scene';
        return;
    }

    try {
        // --- Step 1: Upload the file directly to the Worker ---
        saveBtn.textContent = 'Uploading Image...';
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await fetch(WORKER_URL, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            let errorMsg = `Upload failed with status: ${uploadResponse.status}`;
            try {
                const result = await uploadResponse.json();
                errorMsg = result.error || 'Unknown worker error';
            } catch (jsonError) {
                errorMsg = await uploadResponse.text();
            }
            throw new Error(errorMsg);
        }

        const result = await uploadResponse.json();
        if (!result.success) {
            throw new Error(`Upload failed: ${result.error || 'Unknown worker error'}`);
        }
        
        // --- Step 2: Construct the public URL and save to Firestore ---
        saveBtn.textContent = 'Saving Scene...';
        const finalImageUrl = `${R2_PUBLIC_URL}/${result.publicUrl}`;
        
        const scenesRef = collection(db, 'scenes');
        const q = query(scenesRef, where("scenarioId", "==", currentScenarioId), orderBy('sceneId', 'desc'));
        const lastSceneSnapshot = await getDocs(q);
        const newSceneId = lastSceneSnapshot.empty
            ? '1'
            : (parseInt(lastSceneSnapshot.docs[0].data().sceneId) + 1).toString();

        await addDoc(scenesRef, {
            scenarioId: currentScenarioId,
            sceneId: newSceneId,
            name: sceneName,
            image: finalImageUrl,
        });

        // --- Step 3: Refresh the application state ---
        currentSceneId = newSceneId;
        await populateSceneSelectors();
        await updateScene();

        addSceneForm.reset();
        addSceneModal.style.display = 'none';

    } catch (error) {
        console.error('Error adding scene:', error);
        alert(`Could not add the scene. Check the console for details: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Scene';
    }
}


async function handleAddHotspot(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-new-hotspot-button');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        await addDoc(collection(db, "hotspots"), {
            scenarioId: currentScenarioId,
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

async function handleDeleteHotspot() {
    if (!selectedHotspotEntity) {
        alert("Please select a hotspot from the list to delete.");
        return;
    }

    const hotspotText = selectedHotspotEntity.querySelector('a-text').getAttribute('value');
    if (!confirm(`Are you sure you want to delete the hotspot: "${hotspotText}"?`)) {
        return;
    }

    const docId = selectedHotspotEntity.getAttribute('hotspot-db-id');
    const deleteBtn = document.getElementById('delete-hotspot-button');
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting...";

    try {
        const hotspotRef = doc(db, "hotspots", docId);
        await deleteDoc(hotspotRef);
        
        await updateScene();
        
        alert("Hotspot deleted successfully.");

    } catch (error) {
        console.error("Error deleting hotspot:", error);
        alert("Failed to delete the hotspot. Check the console for details.");
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete Hotspot";
    }
}

function updateHotspotPosition(angles, updateInputs = true) {
    if (!selectedHotspotEntity) return;

    const currentRadius = JSON.parse(selectedHotspotEntity.dataset.angles || '{ }').radius || PLACEMENT_RADIUS;
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

            const currentAngles = JSON.parse(entity.dataset.angles || '{ }');
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

// --- SCENARIO LOGIC ---

async function initializeScenarioSelector() {
    const selector = document.getElementById('scenario-selector-dropdown');
    selector.innerHTML = '';
    const scenariosRef = collection(db, "scenarios");
    const q = query(scenariosRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        const option = document.createElement('option');
        option.textContent = "No scenarios found. Create one!";
        option.disabled = true;
        selector.appendChild(option);
    } else {
        querySnapshot.forEach((doc) => {
            const scenario = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = scenario.name;
            selector.appendChild(option);
        });
    }
}

async function handleAddScenario(e) {
    e.preventDefault();
    const button = document.getElementById('save-scenario-button');
    button.disabled = true;
    button.textContent = "Creating...";

    try {
        const scenariosRef = collection(db, "scenarios");
        const newScenarioName = document.getElementById('scenario-name').value;
        if (!newScenarioName) {
            alert("Please enter a name for the scenario.");
            return;
        }

        const newScenarioDoc = await addDoc(scenariosRef, { 
            name: newScenarioName,
            createdAt: serverTimestamp()
        });
        
        await initializeScenarioSelector(); // Refresh the dropdown
        
        currentScenarioId = newScenarioDoc.id; // Set the new ID
        sessionStorage.setItem('currentScenarioId', currentScenarioId);
        addScenarioModal.style.display = 'none';
        addScenarioForm.reset();
        loadScenario(); // Load the newly created scenario

    } catch (error) {
        console.error("Error adding scenario: ", error);
        alert("Could not add the new scenario. Check console for details.");
    } finally {
        button.disabled = false;
        button.textContent = "Save Scenario";
    }
}

async function loadScenario(e) {
    if (e) e.preventDefault(); 

    if (!currentScenarioId) {
        const selector = document.getElementById('scenario-selector-dropdown');
        if (!selector.value) {
            alert("Please select a scenario to load.");
            return;
        }
        currentScenarioId = selector.value;
    }
    
    sessionStorage.setItem('currentScenarioId', currentScenarioId);

    currentSceneId = null;
    const scenesRef = collection(db, "scenes");
    const q = query(scenesRef, where("scenarioId", "==", currentScenarioId), orderBy("sceneId"));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        currentSceneId = querySnapshot.docs[0].data().sceneId;
    }

    document.getElementById('scenario-selection-modal').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    if (isEditMode) {
        document.getElementById('editor-sidebar').style.display = 'flex';
        if (!document.querySelector('#editor-sidebar').dataset.initialized) {
          initializeEditor();
          document.querySelector('#editor-sidebar').dataset.initialized = true;
        }
        await populateSceneSelectors();
    }

    await updateScene();
}

// --- INITIALIZATION ---

async function main() {
    scenarioSelectionModal = document.getElementById('scenario-selection-modal');
    addScenarioModal = document.getElementById('add-scenario-modal');
    addScenarioForm = document.getElementById('add-scenario-form');

    document.getElementById('scenario-selection-form').addEventListener('submit', loadScenario);
    document.getElementById('create-new-scenario-button').addEventListener('click', () => {
        addScenarioModal.style.display = 'flex';
    });
    addScenarioForm.addEventListener('submit', handleAddScenario);
    
    await initializeScenarioSelector();

    const savedScenarioId = sessionStorage.getItem('currentScenarioId');
    if (savedScenarioId) {
        currentScenarioId = savedScenarioId;
        loadScenario();
    } else {
        scenarioSelectionModal.style.display = 'flex';
    }

    const vrButton = document.getElementById('vr-button');
    vrButton.addEventListener('click', () => {
        document.querySelector('a-scene').enterVR();
    });
}

main();
